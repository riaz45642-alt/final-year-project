// ══════════════════════════════════════════════
//  TALENTBRIDGE — script.js  (TiDB + Firebase Edition)
// ══════════════════════════════════════════════

/* ──────────────────────────────────────────────
   CONFIGURATION
   🔧 CHANGE THIS: Set your backend URL here.
      Locally:   "http://localhost:5000"
      Deployed:  "https://your-backend.onrender.com"
────────────────────────────────────────────── */
// 🔧 TODO: Replace with your deployed backend URL when you go live
const API_BASE = "http://localhost:5000/api";

/* ──────────────────────────────────────────────
   1. DATABASE LAYER — TiDB via REST API
   All functions are async and hit your
   Express/TiDB backend instead of localStorage.
   localStorage is ONLY used for the Firebase
   session cache (UID + role) — not app data.
────────────────────────────────────────────── */
const DB = {

  async _get(endpoint) {
    try {
      const res = await fetch(API_BASE + endpoint);
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    } catch (e) { console.error("[DB._get] " + endpoint, e); return null; }
  },

  async _post(endpoint, body) {
    try {
      const res = await fetch(API_BASE + endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    } catch (e) { console.error("[DB._post] " + endpoint, e); return null; }
  },

  async _delete(endpoint) {
    try {
      const res = await fetch(API_BASE + endpoint, { method: "DELETE" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    } catch (e) { console.error("[DB._delete] " + endpoint, e); return null; }
  },

  /* ── Session cache — Firebase UID + role only ── */
  // 🔥 Firebase: localStorage here stores ONLY the Firebase UID + display name + role.
  //    It is a cache so pages render without waiting for onAuthStateChanged.
  //    All real app data (jobs, applications, saved) lives in TiDB — NOT here.
  getSession()     { try { return JSON.parse(localStorage.getItem("tb_session")) || null; } catch { return null; } },
  setSession(user) { localStorage.setItem("tb_session", JSON.stringify(user)); },
  clearSession()   { localStorage.removeItem("tb_session"); },

  /* ── Jobs — TiDB ── */
  // 🔧 TiDB: GET /api/jobs  → returns all active jobs from TiDB jobs table
  async getJobs() {
    const data = await this._get("/jobs");
    return Array.isArray(data) ? data : [];
  },
  // 🔧 TiDB: POST /api/jobs  → inserts new row into TiDB jobs table
  async addPostedJob(job) {
    const uid = AppState.currentUser ? AppState.currentUser.id : null;
    return await this._post("/jobs", { ...job, postedBy: uid });
  },
  // 🔧 TiDB: DELETE /api/jobs/:id  → deletes job row from TiDB
  async deleteJob(jobId) { return await this._delete("/jobs/" + jobId); },

  /* ── Saved Jobs — TiDB ── */
  // 🔧 TiDB: GET /api/saved/:userId  → saved_jobs rows for this user
  async getSaved() {
    const uid = AppState.currentUser ? AppState.currentUser.id : null;
    if (!uid) return [];
    const data = await this._get("/saved/" + uid);
    return Array.isArray(data) ? data.map(r => r.jobId || r.job_id) : [];
  },
  // 🔧 TiDB: toggles saved_jobs row (insert or delete) in TiDB
  async toggleSave(jobId) {
    const uid = AppState.currentUser ? AppState.currentUser.id : null;
    if (!uid) return false;
    const saved = await this.getSaved();
    if (saved.includes(jobId)) {
      // 🔧 TiDB: DELETE /api/saved/:userId/:jobId  → removes row from saved_jobs
      await this._delete("/saved/" + uid + "/" + jobId);
      return false;
    } else {
      // 🔧 TiDB: POST /api/saved  → inserts row into saved_jobs
      await this._post("/saved", { userId: uid, jobId });
      return true;
    }
  },
  async isSaved(jobId) { return (await this.getSaved()).includes(jobId); },

  /* ── Applications — TiDB ── */
  // 🔧 TiDB: GET /api/applications/:userId  → applications for this seeker
  async getApps() {
    const uid = AppState.currentUser ? AppState.currentUser.id : null;
    if (!uid) return [];
    const data = await this._get("/applications/" + uid);
    return Array.isArray(data) ? data : [];
  },
  // 🔧 TiDB: GET /api/applications/employer/:userId  → applications for employer's jobs
  async getAppsForEmployer(uid) {
    const data = await this._get("/applications/employer/" + uid);
    return Array.isArray(data) ? data : [];
  },
  // 🔧 TiDB: POST /api/applications  → inserts application row into TiDB
  async addApp(app) { return await this._post("/applications", app); },
  // 🔧 TiDB: GET /api/applications/check/:userId/:jobId  → has user applied?
  async hasApplied(jobId) {
    const uid = AppState.currentUser ? AppState.currentUser.id : null;
    if (!uid) return false;
    const data = await this._get("/applications/check/" + uid + "/" + jobId);
    return data && data.applied === true;
  },
  // 🔧 TiDB: PUT /api/applications/:id/status  → updates status column in TiDB
  async updateAppStatus(appId, status) {
    try {
      const res = await fetch(API_BASE + "/applications/" + appId + "/status", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      return await res.json();
    } catch (e) { console.error("[DB.updateAppStatus]", e); return null; }
  },

  /* ── User Profile — TiDB ── */
  // 🔧 TiDB: GET /api/users/:uid  → fetch user profile row from TiDB
  async getProfile(uid) { return await this._get("/users/" + uid); },
  // 🔧 TiDB: POST /api/users  → upsert user profile row in TiDB
  async saveProfile(profileData) { return await this._post("/users", profileData); },
};

/* ──────────────────────────────────────────────
   2. JOBS DATA — live from TiDB
────────────────────────────────────────────── */
// 🔧 TiDB: always fetches fresh from database
async function getAllJobs() { return await DB.getJobs(); }

/* ──────────────────────────────────────────────
   3. APP STATE
────────────────────────────────────────────── */
const AppState = {
  currentPage:      "home",
  currentUser:      DB.getSession(), // 🔥 Firebase session cache
  activeCategory:   "all",
  searchQuery:      "",
  selectedTemplate: "blue",
  chatHistory:      [],
};

/* ──────────────────────────────────────────────
   4. TOAST NOTIFICATIONS
────────────────────────────────────────────── */
function toast(message, type, duration) {
  type = type || "info"; duration = duration || 3000;
  const icons = { success: "✅", error: "❌", info: "ℹ️", warning: "⚠️" };
  const container = document.getElementById("toast-container");
  if (!container) return;
  const el = document.createElement("div");
  el.className = "toast " + type;
  el.innerHTML = "<span>" + (icons[type] || "") + "</span><span>" + message + "</span>";
  container.appendChild(el);
  setTimeout(function() {
    el.style.animation = "toastOut 0.3s ease forwards";
    setTimeout(function() { el.remove(); }, 300);
  }, duration);
}

/* ──────────────────────────────────────────────
   5. ROLE-BASED ACCESS CONTROL
────────────────────────────────────────────── */
function applyRoleBasedUI() {
  var role = AppState.currentUser ? AppState.currentUser.role : null;
  document.querySelectorAll('[data-role="seeker"]').forEach(function(el) {
    el.style.display = (role === "employer") ? "none" : "";
  });
  document.querySelectorAll('[data-role="employer"]').forEach(function(el) {
    el.style.display = (role === "seeker") ? "none" : "";
  });
}

/* ──────────────────────────────────────────────
   6. AUTH UI UPDATE
────────────────────────────────────────────── */
function updateAuthUI() {
  var user         = AppState.currentUser;
  var loggedOutEl  = document.getElementById("nav-logged-out");
  var loggedInEl   = document.getElementById("nav-logged-in");
  var sbBlock      = document.getElementById("sidebar-user-block");
  var loginSignupBtn = document.getElementById("sidebar-login-signup-btn");
  if (user) {
    if (loggedOutEl)    loggedOutEl.classList.add("hidden");
    if (loggedInEl)     loggedInEl.classList.remove("hidden");
    if (loginSignupBtn) loginSignupBtn.style.display = "none";
    var initialsEl = document.getElementById("nav-avatar-initials");
    if (initialsEl) initialsEl.textContent = user.avatar || user.name.slice(0,2).toUpperCase();
    if (sbBlock) {
      sbBlock.classList.remove("hidden");
      var sbAv   = document.getElementById("sb-avatar");
      var sbName = document.getElementById("sb-name");
      var sbRole = document.getElementById("sb-role");
      if (sbAv)   sbAv.textContent   = user.avatar || user.name.slice(0,2).toUpperCase();
      if (sbName) sbName.textContent = user.name;
      if (sbRole) sbRole.textContent = user.role === "employer" ? "Employer" : "Job Seeker";
    }
    var profName = document.getElementById("prof-name");
    var profSub  = document.getElementById("prof-title-sub");
    var profAv   = document.getElementById("prof-avatar");
    if (profName) profName.textContent = user.name;
    if (profSub)  profSub.textContent  = user.role === "employer" ? "Employer Account" : "Job Seeker";
    if (profAv)   profAv.textContent   = user.avatar || user.name.slice(0,2).toUpperCase();
  } else {
    if (loggedOutEl)    loggedOutEl.classList.remove("hidden");
    if (loggedInEl)     loggedInEl.classList.add("hidden");
    if (sbBlock)        sbBlock.classList.add("hidden");
    if (loginSignupBtn) loginSignupBtn.style.display = "";
  }
  applyRoleBasedUI();
}

/* ──────────────────────────────────────────────
   7. NAVIGATION
────────────────────────────────────────────── */
function showPage(pageId) {
  document.querySelectorAll(".page").forEach(function(p) { p.classList.remove("active"); });
  var target = document.getElementById("page-" + pageId);
  if (target) target.classList.add("active");
  AppState.currentPage = pageId;
  document.querySelectorAll(".sidebar-nav-item").forEach(function(i) { i.classList.remove("active"); });
  var activeItem = document.querySelector('.sidebar-nav-item[data-page="' + pageId + '"]');
  if (activeItem) activeItem.classList.add("active");
  if (pageId === "saved")   renderSavedJobs();
  if (pageId === "applied") renderAppliedJobs();
  if (pageId === "employer" && typeof refreshEmployerStats === "function") refreshEmployerStats();
}
function navTo(pageId) { showPage(pageId); window.scrollTo(0,0); }

function toggleMobileSidebar() {
  var sidebar = document.getElementById("sidebar");
  var overlay = document.getElementById("mobile-sidebar-overlay");
  var ham     = document.getElementById("mobile-menu-toggle");
  if (!sidebar) return;
  var isOpen = sidebar.classList.contains("mobile-open");
  sidebar.classList.toggle("mobile-open", !isOpen);
  if (overlay) overlay.classList.toggle("visible", !isOpen);
  if (ham)     ham.classList.toggle("open", !isOpen);
}
function closeMobileSidebar() {
  var sidebar = document.getElementById("sidebar");
  var overlay = document.getElementById("mobile-sidebar-overlay");
  var ham     = document.getElementById("mobile-menu-toggle");
  if (sidebar) sidebar.classList.remove("mobile-open");
  if (overlay) overlay.classList.remove("visible");
  if (ham)     ham.classList.remove("open");
}
function openDropdown()  { var d = document.getElementById("user-dropdown"); if(d) d.classList.toggle("open"); }
function closeDropdown() { var d = document.getElementById("user-dropdown"); if(d) d.classList.remove("open"); }

/* ──────────────────────────────────────────────
   8. JOB DETAIL MODAL
────────────────────────────────────────────── */
async function openJobDetail(jobId) {
  var jobs = await getAllJobs();
  var job  = jobs.find(function(j){ return j.id === jobId; });
  if (!job) return;
  var modalBox = document.getElementById("job-detail-box");
  if (!modalBox) return;
  // 🔧 TiDB: check applied/saved state from database
  var isApplied    = await DB.hasApplied(jobId);
  var isBookmarked = await DB.isSaved(jobId);
  var user         = AppState.currentUser;
  var isEmployer   = user && user.role === "employer";
  var tags = (job.tags||[]).map(function(t){ return '<span class="tag">'+t+'</span>'; }).join("");
  modalBox.innerHTML =
    '<button class="modal-close" onclick="closeJobDetail()">✕</button>' +
    '<div class="job-detail-content">' +
      '<div class="job-detail-header">' +
        '<div class="job-detail-logo">'+(job.emoji||"🏢")+'</div>' +
        '<div style="flex:1">' +
          '<div class="job-detail-title">'+job.title+'</div>' +
          '<div style="font-size:14px;color:var(--text-secondary);margin-top:4px">'+(job.company||"")+'</div>' +
          '<div class="job-meta" style="margin-top:8px">' +
            '<span class="job-meta-item">📍 '+job.location+'</span>' +
            '<span class="job-meta-item">⏰ '+job.type+'</span>' +
            '<span class="job-meta-item">🕐 '+(job.posted||"Recently")+'</span>' +
          '</div>' +
          '<div style="margin-top:8px">' +
            '<span class="salary">Rs '+formatSalary(job.salaryMin)+'–'+formatSalary(job.salaryMax)+' <span>/month</span></span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="job-tags">' + tags + (job.remote?'<span class="tag green">Remote OK</span>':"") + (job.urgent?'<span class="tag orange">Urgent</span>':"") + '</div>' +
      '<div style="margin:16px 0;font-size:14px;color:var(--text-secondary);line-height:1.7">' + (job.desc||"<em>No description provided.</em>") + '</div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
        (!isEmployer ?
          '<button class="btn btn-primary" id="modal-apply-btn" onclick="applyJob(\''+job.id+'\', this)" '+(isApplied?"disabled":"")+'>'+( isApplied?"✓ Applied":"Apply Now →")+'</button>' +
          '<button class="btn btn-outline" id="modal-save-btn" onclick="toggleBookmarkModal(\''+job.id+'\',this)">'+(isBookmarked?"🔖 Saved":"🔖 Save Job")+'</button>'
        : "") +
        '<button class="btn btn-outline" onclick="findSimilarJobs(\''+job.title+'\')">🤖 Find Similar</button>' +
      '</div>' +
    '</div>';
  var modal = document.getElementById("job-detail-modal");
  if (modal) modal.classList.add("open");
}
function closeJobDetail() { var m = document.getElementById("job-detail-modal"); if(m) m.classList.remove("open"); }

async function toggleBookmarkModal(jobId, btn) {
  // 🔧 TiDB: toggle saved_jobs row in database
  var isSaved = await DB.toggleSave(jobId);
  btn.textContent = isSaved ? "🔖 Saved" : "🔖 Save Job";
  var jobs = await getAllJobs();
  var job  = jobs.find(function(j){ return j.id === jobId; });
  toast(isSaved ? 'Saved "'+(job?job.title:"")+'"' : "Removed from saved", isSaved?"success":"info");
  var feedBtn = document.querySelector('[data-bookmark="'+jobId+'"]');
  if (feedBtn) feedBtn.classList.toggle("saved", isSaved);
}
function findSimilarJobs(jobTitle) {
  closeJobDetail();
  if (typeof showPage === "function") showPage("ai");
  setTimeout(function() {
    var chatInput = document.getElementById("chat-input");
    if (chatInput) { chatInput.value = 'Find me jobs similar to "'+jobTitle+'"'; chatInput.focus(); }
  }, 100);
}

/* ──────────────────────────────────────────────
   9. JOB FEED
────────────────────────────────────────────── */
async function renderJobFeed(jobsList) {
  var feedGrid = document.getElementById("job-feed-grid");
  var jobCount = document.getElementById("job-count");
  if (!feedGrid) return;
  if (jobCount) jobCount.textContent = jobsList.length;
  if (!jobsList.length) {
    feedGrid.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><h3>No jobs found</h3><p>Try different keywords or category filters</p></div>';
    return;
  }
  // 🔧 TiDB: fetch saved + applied state for all cards in one go
  var savedIds       = await DB.getSaved();
  var apps           = await DB.getApps();
  var appliedJobIds  = apps.map(function(a){ return a.jobId || a.job_id; });
  feedGrid.innerHTML = jobsList.map(function(job){ return buildJobCardHTML(job, savedIds, appliedJobIds); }).join("");
}

function buildJobCardHTML(job, savedIds, appliedJobIds) {
  savedIds      = savedIds      || [];
  appliedJobIds = appliedJobIds || [];
  var user       = AppState.currentUser;
  var isEmployer = user && user.role === "employer";
  var isSaved    = savedIds.includes(job.id);
  var isApplied  = appliedJobIds.includes(job.id);
  var tags = (job.tags||[]).slice(0,3).map(function(t){ return '<span class="tag">'+t+'</span>'; }).join("");
  return (
    '<div class="job-card" onclick="openJobDetail(\''+job.id+'\')">' +
      '<div class="job-card-top">' +
        '<div class="company-logo">'+(job.emoji||"🏢")+'</div>' +
        (!isEmployer ? '<button class="job-bookmark '+(isSaved?"saved":"")+'" data-bookmark="'+job.id+'" onclick="event.stopPropagation();toggleBookmark(\''+job.id+'\',this)">🔖</button>' : "") +
      '</div>' +
      '<div class="job-title">'+job.title+'</div>' +
      '<div class="company-name">'+(job.company||"")+'</div>' +
      '<div class="job-meta"><span class="job-meta-item">📍 '+job.location+'</span><span class="job-meta-item">⏰ '+job.type+'</span></div>' +
      '<div class="job-tags">'+tags+(job.remote?'<span class="tag green">Remote OK</span>':"")+(job.urgent?'<span class="tag orange">Urgent</span>':"")+'</div>' +
      '<div class="job-footer">' +
        '<div class="salary">Rs '+formatSalary(job.salaryMin)+'–'+formatSalary(job.salaryMax)+' <span>/month</span></div>' +
        (!isEmployer
          ? '<button class="apply-btn '+(isApplied?"applied":"")+'" data-apply="'+job.id+'" onclick="event.stopPropagation();applyJob(\''+job.id+'\',this)" '+(isApplied?"disabled":"")+'>'+(isApplied?"✓ Applied":"Apply Now →")+'</button>'
          : '<span class="tag">View Only</span>') +
      '</div>' +
    '</div>'
  );
}

function formatSalary(n) { if(!n) return "?"; return n>=1000 ? Math.round(n/1000)+"K" : n; }

async function filterAndRender() {
  // 🔧 TiDB: live fetch from database every time
  var jobs = await getAllJobs();
  if (AppState.activeCategory !== "all") jobs = jobs.filter(function(j){ return j.category === AppState.activeCategory; });
  if (AppState.searchQuery) {
    var q = AppState.searchQuery.toLowerCase();
    jobs = jobs.filter(function(j){
      return j.title.toLowerCase().includes(q) ||
        (j.company||"").toLowerCase().includes(q) ||
        (j.tags||[]).some(function(t){ return t.toLowerCase().includes(q); }) ||
        j.location.toLowerCase().includes(q);
    });
  }
  await renderJobFeed(jobs);
}

function setCategory(cat, chip) {
  AppState.activeCategory = cat;
  document.querySelectorAll(".category-chip,.chip").forEach(function(c){ c.classList.remove("active"); });
  chip.classList.add("active");
  filterAndRender();
}

async function toggleBookmark(jobId, btn) {
  // 🔧 TiDB: insert/delete saved_jobs row in TiDB
  var saved = await DB.toggleSave(jobId);
  btn.classList.toggle("saved", saved);
  var jobs = await getAllJobs();
  var job  = jobs.find(function(j){ return j.id===jobId; });
  toast(saved ? 'Saved "'+(job?job.title:"")+('"') : "Removed from saved", saved?"success":"info");
  await updateSidebarBadges();
}

async function applyJob(jobId, btn) {
  if (!AppState.currentUser) { toast("Please sign in to apply","warning"); openAuth("login"); return; }
  if (AppState.currentUser.role === "employer") { toast("Employers cannot apply for jobs","warning"); return; }
  // 🔧 TiDB: check application status from database
  var already = await DB.hasApplied(jobId);
  if (already) return;
  var jobs = await getAllJobs();
  var job  = jobs.find(function(j){ return j.id===jobId; });
  if (btn) { btn.textContent = "Applying..."; btn.disabled = true; }
  setTimeout(async function() {
    // 🔧 TiDB: insert application row into TiDB applications table
    await DB.addApp({
      jobId:      jobId,
      userId:     AppState.currentUser.id,
      seekerName: AppState.currentUser.name,
      appliedAt:  Date.now(),
      status:     "Reviewing",
    });
    if (btn) { btn.textContent = "✓ Applied"; btn.classList.add("applied"); }
    toast('Applied to "'+(job?job.title:"")+('" successfully! 🎉'),"success");
    await updateSidebarBadges();
  }, 800);
}

async function updateSidebarBadges() {
  // 🔧 TiDB: counts from database
  var saved  = (await DB.getSaved()).length;
  var apps   = (await DB.getApps()).length;
  document.querySelectorAll("#sb-saved-count").forEach(function(el){ el.textContent = saved; });
  document.querySelectorAll("#sb-applied-count").forEach(function(el){ el.textContent = apps; });
}

/* ──────────────────────────────────────────────
   10. APPLIED JOBS PAGE
────────────────────────────────────────────── */
async function renderAppliedJobs() {
  var list = document.getElementById("applied-jobs-list");
  if (!list) return;
  // 🔧 TiDB: load applications from database
  var apps = await DB.getApps();
  if (!AppState.currentUser || !apps.length) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><h3>No applications yet</h3><p>Apply to jobs and track your progress here</p><button class="btn btn-primary" style="margin-top:16px" onclick="window.location.href=\'index.html\'">Find Jobs</button></div>';
    return;
  }
  var jobs = await getAllJobs();
  var colorMap = { Reviewing:"reviewing", Shortlisted:"active", Interview:"active", Offered:"active", Rejected:"closed" };
  list.innerHTML = apps.map(function(app){
    var job    = jobs.find(function(j){ return j.id===(app.jobId||app.job_id); }) || { title:"Unknown Job", company:"Unknown Company", emoji:"🏢" };
    var status = app.status || "Reviewing";
    var dt     = new Date(app.appliedAt||app.applied_at).toLocaleDateString("en-PK",{day:"numeric",month:"short",year:"numeric"});
    return (
      '<div class="card mb-16" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">' +
        '<div class="company-logo" style="flex-shrink:0">'+(job.emoji||"🏢")+'</div>' +
        '<div style="flex:1;min-width:160px">' +
          '<div class="job-title" style="font-size:14.5px">'+job.title+'</div>' +
          '<div class="company-name">'+(job.company||"")+'</div>' +
          '<div class="job-meta" style="margin-top:6px"><span class="job-meta-item">📅 Applied '+dt+'</span></div>' +
        '</div>' +
        '<span class="status-badge '+(colorMap[status]||"reviewing")+'">● '+status+'</span>' +
        '<button class="btn btn-outline btn-sm" onclick="openJobDetail(\''+(app.jobId||app.job_id)+'\')">View Job</button>' +
      '</div>'
    );
  }).join("");
}

/* ──────────────────────────────────────────────
   11. SAVED JOBS PAGE
────────────────────────────────────────────── */
async function renderSavedJobs() {
  var grid = document.getElementById("saved-jobs-grid");
  if (!grid) return;
  // 🔧 TiDB: load saved job IDs from database
  var savedIds = await DB.getSaved();
  var allJobs  = await getAllJobs();
  var saved    = allJobs.filter(function(j){ return savedIds.includes(j.id); });
  if (!saved.length) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🔖</div><h3>No saved jobs yet</h3><p>Browse jobs and click the bookmark icon to save them here</p><button class="btn btn-primary" style="margin-top:16px" onclick="window.location.href=\'index.html\'">Browse Jobs</button></div>';
    return;
  }
  grid.innerHTML = saved.map(function(job){ return buildJobCardHTML(job, savedIds, []); }).join("");
}

/* ──────────────────────────────────────────────
   12. TABS
────────────────────────────────────────────── */
function switchTab(tabId) {
  document.querySelectorAll(".tab-panel").forEach(function(p){ p.classList.remove("active"); });
  document.querySelectorAll(".tab-btn").forEach(function(b){ b.classList.remove("active"); });
  var panel = document.getElementById(tabId);
  var btn   = document.getElementById(tabId+"-btn");
  if (panel) panel.classList.add("active");
  if (btn)   btn.classList.add("active");
  if (tabId==="tab-jobs" && typeof renderPostedJobsTable==="function") renderPostedJobsTable();
  if (tabId==="tab-apps" && typeof renderApplicantsTable==="function") renderApplicantsTable();
}

/* ──────────────────────────────────────────────
   13. HERO SEARCH
────────────────────────────────────────────── */
function heroSearch() {
  var val = document.getElementById("hero-search-input") ? document.getElementById("hero-search-input").value.trim() : "";
  if (val) { AppState.searchQuery = val; filterAndRender(); toast('Showing results for "'+val+'"',"info"); }
}

/* ──────────────────────────────────────────────
   14. initCommon()
────────────────────────────────────────────── */
async function initCommon() {
  if (!AppState.currentUser) {
    // 🔥 Firebase: restore session UID/role from localStorage cache
    AppState.currentUser = DB.getSession();
  }
  updateAuthUI();
  await updateSidebarBadges();
  document.addEventListener("click", function(e){
    if (!e.target.closest(".nav-user-menu")) closeDropdown();
  });
  document.querySelectorAll(".modal-overlay").forEach(function(el){
    el.addEventListener("click", function(e){ if(e.target===el) el.classList.remove("open"); });
  });
  console.log("TalentBridge ready ✅ | user:", AppState.currentUser ? AppState.currentUser.name : "guest");
}

/* ──────────────────────────────────────────────
   15. DOMContentLoaded
────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", async function() {
  await initCommon();

  if (document.getElementById("job-feed-grid")) {
    await filterAndRender();
    var mainSearch = document.getElementById("main-search");
    if (mainSearch) mainSearch.addEventListener("input", function(e){ AppState.searchQuery = e.target.value; filterAndRender(); });
    var sortSel = document.getElementById("sort-select");
    if (sortSel) sortSel.addEventListener("change", async function(e){
      var jobs = await getAllJobs();
      if (AppState.activeCategory !== "all") jobs = jobs.filter(function(j){ return j.category === AppState.activeCategory; });
      if (e.target.value === "salary-high") jobs.sort(function(a,b){ return (b.salaryMax||0)-(a.salaryMax||0); });
      if (e.target.value === "salary-low")  jobs.sort(function(a,b){ return (a.salaryMin||0)-(b.salaryMin||0); });
      await renderJobFeed(jobs);
    });
    var heroInput = document.getElementById("hero-search-input");
    if (heroInput) heroInput.addEventListener("keydown", function(e){ if(e.key==="Enter") heroSearch(); });
  }

  if (document.getElementById("template-selector") && typeof renderTemplateSelector === "function") {
    renderTemplateSelector();
    document.querySelectorAll("[data-cv-field]").forEach(function(f){ f.addEventListener("input", updatePreview); });
  }

  if (document.getElementById("emp-stat-jobs") && typeof refreshEmployerStats === "function") {
    refreshEmployerStats();
  }
});
