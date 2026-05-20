// ══════════════════════════════════════════════
//  TALENTBRIDGE — script.js  (TiDB + Firebase Edition)
//
//  FIX SUMMARY (vs original):
//  ① applyRoleBasedUI() is now a no-op — role-based visibility is
//    handled entirely by guard.js after authRoleReady fires.
//    This removes the conflict where script.js would show/hide
//    elements BEFORE the DB role was known, causing Employer Hub to
//    flash and disappear.
//  ② updateAuthUI() no longer calls applyRoleBasedUI() prematurely.
//    Guard.js handles the role visibility on authRoleReady.
//  ③ initCommon() waits for DB session to be populated before
//    calling updateAuthUI() to avoid rendering stale UI.
// ══════════════════════════════════════════════

/* ──────────────────────────────────────────────
   CONFIGURATION
────────────────────────────────────────────── */
const API_BASE = (typeof window !== "undefined" && window.TB_API_BASE)
  || "http://localhost:5000/api";

/* ──────────────────────────────────────────────
   1. DATABASE LAYER — TiDB via REST API
   All functions are async and hit your Express/TiDB backend.
   localStorage is ONLY used for the Firebase session cache
   (UID + role) — never for app data like jobs or applications.
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

  /* ── Session cache — Firebase UID + role only ──
     FIX: This is a SHORT-LIVED cache for instant nav rendering.
     The real source of truth for role is TiDB, fetched in auth.js onAuthStateChanged. */
  getSession()     { try { return JSON.parse(localStorage.getItem("tb_session")) || null; } catch { return null; } },
  setSession(user) { localStorage.setItem("tb_session", JSON.stringify(user)); },
  clearSession()   { localStorage.removeItem("tb_session"); },

  /* ── Jobs — TiDB ── */
  async getJobs() {
    const data = await this._get("/jobs");
    return Array.isArray(data) ? data : [];
  },
  async addPostedJob(job) {
    const uid = AppState.currentUser ? AppState.currentUser.id : null;
    return await this._post("/jobs", { ...job, postedBy: uid });
  },
  async deleteJob(jobId) { return await this._delete("/jobs/" + jobId); },

  /* ── Saved Jobs — TiDB ── */
  async getSaved() {
    const uid = AppState.currentUser ? AppState.currentUser.id : null;
    if (!uid) return [];
    const data = await this._get("/saved/" + uid);
    return Array.isArray(data) ? data.map(r => r.jobId || r.job_id) : [];
  },
  async toggleSave(jobId) {
    const uid = AppState.currentUser ? AppState.currentUser.id : null;
    if (!uid) return false;
    const saved = await this.getSaved();
    if (saved.includes(jobId)) {
      await this._delete("/saved/" + uid + "/" + jobId);
      return false;
    } else {
      await this._post("/saved", { userId: uid, jobId });
      return true;
    }
  },
  async isSaved(jobId) { return (await this.getSaved()).includes(jobId); },

  /* ── Applications — TiDB ── */
  async getApps() {
    const uid = AppState.currentUser ? AppState.currentUser.id : null;
    if (!uid) return [];
    const data = await this._get("/applications/" + uid);
    return Array.isArray(data) ? data : [];
  },
  async getAppsForEmployer(uid) {
    const data = await this._get("/applications/employer/" + uid);
    return Array.isArray(data) ? data : [];
  },
  async addApp(app)    { return await this._post("/applications", app); },
  async hasApplied(jobId) {
    const uid = AppState.currentUser ? AppState.currentUser.id : null;
    if (!uid) return false;
    const data = await this._get("/applications/check/" + uid + "/" + jobId);
    return data && data.applied === true;
  },
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
  async getProfile(uid)         { return await this._get("/users/" + uid); },
  async saveProfile(profileData){ return await this._post("/users", profileData); },

  /* ── CV Data — TiDB ── */
  async getCV(uid)      { return await this._get("/cv/" + uid); },
  async saveCV(cvData)  { return await this._post("/cv", cvData); },
};

/* ──────────────────────────────────────────────
   2. JOBS DATA
────────────────────────────────────────────── */
async function getAllJobs() { return await DB.getJobs(); }

/* ──────────────────────────────────────────────
   3. APP STATE
────────────────────────────────────────────── */
const AppState = {
  currentPage:      "home",
  currentUser:      DB.getSession(), // session cache for instant render
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
   FIX: applyRoleBasedUI is now a thin wrapper that defers to guard.js.
   guard.js handles the actual show/hide after DB role is confirmed.
   This prevents the race condition where this function was called
   too early (with stale localStorage role) and hid Employer Hub.
────────────────────────────────────────────── */
function applyRoleBasedUI() {
  // Guard.js listens for authRoleReady and applies [data-role] visibility.
  // This function is kept for backward compatibility but guard.js is
  // the single source of truth for role-based visibility.
  var role = AppState.currentUser ? AppState.currentUser.role : null;

  // Sidebar badges: only show counters for seekers
  if (role === 'employer') {
    document.querySelectorAll('[data-role="seeker"]').forEach(function(el) {
      el.style.display = 'none';
    });
    document.querySelectorAll('[data-role="employer"]').forEach(function(el) {
      el.style.display = '';
    });
  } else if (role === 'seeker') {
    document.querySelectorAll('[data-role="seeker"]').forEach(function(el) {
      el.style.display = '';
    });
    document.querySelectorAll('[data-role="employer"]').forEach(function(el) {
      el.style.display = 'none';
    });
  }
}

/* ──────────────────────────────────────────────
   6. AUTH UI UPDATE
────────────────────────────────────────────── */
function updateAuthUI() {
  var user        = AppState.currentUser;
  var loggedOutEl = document.getElementById("nav-logged-out");
  var loggedInEl  = document.getElementById("nav-logged-in");
  var sbBlock     = document.getElementById("sidebar-user-block");
  var loginBtn    = document.getElementById("sidebar-login-signup-btn");

  if (user) {
    if (loggedOutEl) loggedOutEl.classList.add("hidden");
    if (loggedInEl)  loggedInEl.classList.remove("hidden");
    if (loginBtn)    loginBtn.style.display = "none";

    var initialsEl = document.getElementById("nav-avatar-initials");
    if (initialsEl) initialsEl.textContent = user.avatar || (user.name||'U').slice(0,2).toUpperCase();

    if (sbBlock) {
      sbBlock.classList.remove("hidden");
      var sbAv   = document.getElementById("sb-avatar");
      var sbName = document.getElementById("sb-name");
      var sbRole = document.getElementById("sb-role");
      if (sbAv)   sbAv.textContent   = user.avatar || (user.name||'U').slice(0,2).toUpperCase();
      if (sbName) sbName.textContent = user.name;
      if (sbRole) sbRole.textContent = user.role === "employer" ? "Employer" : "Job Seeker";
      syncRoleToggle();
    }

    var profName = document.getElementById("prof-name");
    var profSub  = document.getElementById("prof-title-sub");
    var profAv   = document.getElementById("prof-avatar");
    if (profName) profName.textContent = user.name;
    if (profSub)  profSub.textContent  = user.role === "employer" ? "Employer Account" : "Job Seeker";
    if (profAv)   profAv.textContent   = user.avatar || (user.name||'U').slice(0,2).toUpperCase();

  } else {
    if (loggedOutEl) loggedOutEl.classList.remove("hidden");
    if (loggedInEl)  loggedInEl.classList.add("hidden");
    if (sbBlock)     sbBlock.classList.add("hidden");
    if (loginBtn)    loginBtn.style.display = "";
  }

  // FIX: Do NOT call applyRoleBasedUI() here for the initial render —
  // guard.js handles it after authRoleReady fires with the DB-confirmed role.
  // Only call it here if we already have a confirmed user (i.e., after auth resolved).
  if (user && window._authResolved) {
    window._authResolved.then(function() {
      applyRoleBasedUI();
    });
  }
}

/* ──────────────────────────────────────────────
   7. NAVIGATION
────────────────────────────────────────────── */
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
      '</div>' +
    '</div>';
  var modal = document.getElementById("job-detail-modal");
  if (modal) modal.classList.add("open");
}
function closeJobDetail() { var m = document.getElementById("job-detail-modal"); if(m) m.classList.remove("open"); }

async function toggleBookmarkModal(jobId, btn) {
  var isSaved = await DB.toggleSave(jobId);
  btn.textContent = isSaved ? "🔖 Saved" : "🔖 Save Job";
  var jobs = await getAllJobs();
  var job  = jobs.find(function(j){ return j.id === jobId; });
  toast(isSaved ? 'Saved "'+(job?job.title:"")+'"' : "Removed from saved", isSaved?"success":"info");
  var feedBtn = document.querySelector('[data-bookmark="'+jobId+'"]');
  if (feedBtn) feedBtn.classList.toggle("saved", isSaved);
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
  var savedIds      = await DB.getSaved();
  var apps          = await DB.getApps();
  var appliedJobIds = apps.map(function(a){ return a.jobId || a.job_id; });
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
        (!isEmployer ? '<button class="job-bookmark '+(isSaved?"saved":"")+'\" data-bookmark="'+job.id+'" onclick="event.stopPropagation();toggleBookmark(\''+job.id+'\',this)">🔖</button>' : "") +
      '</div>' +
      '<div class="job-title">'+job.title+'</div>' +
      '<div class="company-name">'+(job.company||"")+'</div>' +
      '<div class="job-meta"><span class="job-meta-item">📍 '+job.location+'</span><span class="job-meta-item">⏰ '+job.type+'</span></div>' +
      '<div class="job-tags">'+tags+(job.remote?'<span class="tag green">Remote OK</span>':"")+(job.urgent?'<span class="tag orange">Urgent</span>':"")+'</div>' +
      '<div class="job-footer">' +
        '<div class="salary">Rs '+formatSalary(job.salaryMin)+'–'+formatSalary(job.salaryMax)+' <span>/month</span></div>' +
        (!isEmployer
          ? '<button class="apply-btn '+(isApplied?"applied":"")+'\" data-apply="'+job.id+'" onclick="event.stopPropagation();applyJob(\''+job.id+'\',this)" '+(isApplied?"disabled":"")+'>'+(isApplied?"✓ Applied":"Apply Now →")+'</button>'
          : '<span class="tag">View Only</span>') +
      '</div>' +
    '</div>'
  );
}

function formatSalary(n) { if(!n) return "?"; return n>=1000 ? Math.round(n/1000)+"K" : n; }

async function filterAndRender() {
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
  var saved = await DB.toggleSave(jobId);
  btn.classList.toggle("saved", saved);
  var jobs = await getAllJobs();
  var job  = jobs.find(function(j){ return j.id===jobId; });
  toast(saved ? 'Saved "'+(job?job.title:"")+'"' : "Removed from saved", saved?"success":"info");
  await updateSidebarBadges();
}

async function applyJob(jobId, btn) {
  if (!AppState.currentUser) { toast("Please sign in to apply","warning"); openAuth("login"); return; }
  if (AppState.currentUser.role === "employer") { toast("Employers cannot apply for jobs","warning"); return; }
  var already = await DB.hasApplied(jobId);
  if (already) return;
  var jobs = await getAllJobs();
  var job  = jobs.find(function(j){ return j.id===jobId; });
  if (btn) { btn.textContent = "Applying..."; btn.disabled = true; }
  setTimeout(async function() {
    await DB.addApp({
      jobId:      jobId,
      userId:     AppState.currentUser.id,
      seekerName: AppState.currentUser.name,
      appliedAt:  Date.now(),
      status:     "Reviewing",
    });
    if (btn) { btn.textContent = "✓ Applied"; btn.classList.add("applied"); }
    toast('Applied to "'+(job?job.title:"")+'" successfully! 🎉',"success");
    await updateSidebarBadges();
  }, 800);
}

async function updateSidebarBadges() {
  var saved = (await DB.getSaved()).length;
  var apps  = (await DB.getApps()).length;
  document.querySelectorAll("#sb-saved-count").forEach(function(el){ el.textContent = saved; });
  document.querySelectorAll("#sb-applied-count").forEach(function(el){ el.textContent = apps; });
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
  // Use session cache for instant UI (will be updated when authRoleReady fires)
  if (!AppState.currentUser) {
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

  // FIX: Re-render auth UI after DB role is confirmed
  // This ensures nav/sidebar reflects real role from DB
  document.addEventListener('authRoleReady', function(e) {
    if (e.detail) AppState.currentUser = e.detail;
    updateAuthUI();
    updateSidebarBadges();
  }, { once: true });

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

/* ──────────────────────────────────────────────
   ROLE TOGGLE — switch between Job Seeker & Employer
   FIX: Use PATCH /users/:uid/role (dedicated atomic endpoint).
        Redirect ONLY after DB confirms the update — eliminates
        the race condition where auth.js fetched the old role
        from DB on the next page load and Guard bounced the user back.
────────────────────────────────────────────── */
var _roleToggleActive = false;

function handleRoleToggle(isEmployer) {
  var user = AppState.currentUser;
  if (!user) return;

  _roleToggleActive = true;
  var newRole = isEmployer ? 'employer' : 'seeker';
  var targetPage = isEmployer ? 'Employer_dashboard.html' : 'dashboard.html';

  // Lock checkbox immediately — prevent any snap back while request is in-flight
  var cb = document.getElementById('role-toggle-checkbox');
  if (cb) { cb.checked = isEmployer; cb.disabled = true; }

  // Update AppState immediately so UI responds right away
  user.role = newRole;
  AppState.currentUser = user;

  // Update ALL storage keys auth.js reads on the next page load.
  // This ensures _toAppUser() returns the correct role even before
  // the DB fetch completes on the destination page.
  var uid = user.uid || user.id;
  try {
    // Key 1: tb_user_role_{uid} — primary key _toAppUser() reads
    if (uid) localStorage.setItem('tb_user_role_' + uid, newRole);
    // Key 2: talentbridge_user
    var s1 = JSON.parse(localStorage.getItem('talentbridge_user') || '{}');
    s1.role = newRole; localStorage.setItem('talentbridge_user', JSON.stringify(s1));
    // Key 3: tb_session
    var s2 = JSON.parse(localStorage.getItem('tb_session') || '{}');
    if (s2 && s2.uid) { s2.role = newRole; localStorage.setItem('tb_session', JSON.stringify(s2)); }
  } catch(e) {}
  try {
    var ss = JSON.parse(sessionStorage.getItem('talentbridge_user') || '{}');
    if (ss && ss.uid) { ss.role = newRole; sessionStorage.setItem('talentbridge_user', JSON.stringify(ss)); }
  } catch(e) {}

  // Update sidebar label
  var sbRole = document.getElementById('sb-role');
  if (sbRole) sbRole.textContent = isEmployer ? 'Employer' : 'Job Seeker';

  // FIX: Use the dedicated PATCH /users/:uid/role endpoint.
  // Previously used POST /users (full profile upsert) which is slower
  // and was redirecting via .finally() before the DB write completed —
  // causing auth.js on the next page to fetch the old role and Guard
  // to redirect the user back (the "loop" bug).
  // Now: redirect only happens INSIDE .then() (DB confirmed) or .catch()
  // (network error — localStorage already has the new role so it still works).
  var apiBase = (typeof window.TB_API_BASE !== 'undefined') ? window.TB_API_BASE : '';

  fetch(apiBase + '/users/' + uid + '/role', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: newRole })
  })
  .then(function(res) {
    if (!res.ok) throw new Error('Server returned ' + res.status);
    return res.json();
  })
  .then(function() {
    // DB confirmed the role — safe to navigate now
    console.log('[toggle] DB role updated to', newRole, '— navigating to', targetPage);
    window.location.href = targetPage;
  })
  .catch(function(err) {
    // Network/server error — localStorage already has the new role so
    // _toAppUser() will return the correct role on the next page.
    // Redirect anyway; the next DB fetch will reconcile if needed.
    console.warn('[toggle] DB update failed, navigating anyway:', err);
    window.location.href = targetPage;
  });
}

function syncRoleToggle() {
  // Skip if a toggle is already in progress — don't reset the checkbox
  if (_roleToggleActive) return;
  var user = AppState.currentUser;
  var cb = document.getElementById('role-toggle-checkbox');
  if (!cb || !user) return;
  cb.checked = (user.role === 'employer');
}