/* ──────────────────────────────────────────────
   EMPLOYER DASHBOARD — Employer_dashboard.js
   Fixes applied:
   - Task 1: Search debounce (500ms) instead of per-keystroke
   - Task 2: Removed All Jobs filter, job chips, Hiring button
   - Task 3: Fixed All Status filter with real API filtering
   - Task 4: Fixed Interview notification (backend now sends it)
   - Task 5: Added View Profile button per applicant
────────────────────────────────────────────── */

var APPLICANT_STATUSES = ["Shortlisted", "Interviewing", "Rejected"];

/* ── Status badge colors ── */
function getStatusStyle(status) {
  switch (status) {
    case "Shortlisted":  return "background:#d1fae5;color:#065f46";
    case "Interviewing": return "background:#dbeafe;color:#1e40af";
    case "Rejected":     return "background:#fee2e2;color:#991b1b";
    default:             return "background:var(--accent-light,#e0e7ff);color:var(--accent,#4f46e5)";
  }
}

/* ── Stats ── */
async function refreshEmployerStats() {
  var user   = AppState.currentUser;
  var userId = user ? user.id : null;
  if (!userId) return;

  var res1 = await fetch(API_BASE + "/jobs/employer/" + userId);
  var myJobs = res1.ok ? await res1.json() : [];

  var res2 = await fetch(API_BASE + "/applications/employer/" + userId);
  var myApplicants = res2.ok ? await res2.json() : [];

  var shortlisted  = myApplicants.filter(function(a){ return a.status === "Shortlisted"; }).length;
  var interviewing = myApplicants.filter(function(a){ return a.status === "Interviewing"; }).length;

  function getEl(id) { return document.getElementById(id); }
  if (getEl("emp-stat-jobs"))  getEl("emp-stat-jobs").textContent  = myJobs.length;
  if (getEl("emp-stat-apps"))  getEl("emp-stat-apps").textContent  = myApplicants.length;
  if (getEl("emp-stat-short")) getEl("emp-stat-short").textContent = shortlisted;

  if (getEl("emp-stat-jobs-change"))  getEl("emp-stat-jobs-change").textContent  = myJobs.length       ? "▲ " + myJobs.length + " active"       : "No jobs yet";
  if (getEl("emp-stat-apps-change"))  getEl("emp-stat-apps-change").textContent  = myApplicants.length ? "▲ " + myApplicants.length + " total"   : "No applicants yet";
  if (getEl("emp-stat-short-change")) getEl("emp-stat-short-change").textContent = shortlisted         ? "▲ " + shortlisted + " shortlisted"     : "None shortlisted";

  await refreshNotifBadge();
}

/* ── Post Job ── */
async function postJob() {
  function getVal(id) { return (document.getElementById(id) ? document.getElementById(id).value : "").trim(); }

  var jobTitle     = getVal("pj-title");
  var department   = getVal("pj-dept");
  var jobType      = getVal("pj-type");
  var location     = getVal("pj-location");
  var workMode     = getVal("pj-mode");
  var salaryMin    = getVal("pj-sal-min");
  var salaryMax    = getVal("pj-sal-max");
  var category     = getVal("pj-category");
  var description  = getVal("pj-desc");
  var skills       = getVal("pj-skills");
  var contactEmail = getVal("pj-contact-email");
  var contactPhone = getVal("pj-contact-phone");
  var jobLocation  = getVal("pj-job-location");

  if (!jobTitle)    { toast("Job title is required", "error"); document.getElementById("pj-title")?.focus(); return; }
  if (!location)    { toast("Location is required", "error"); document.getElementById("pj-location")?.focus(); return; }
  if (!description) { toast("Job description is required", "error"); document.getElementById("pj-desc")?.focus(); return; }
  if (!AppState.currentUser) { toast("Please sign in as an employer", "warning"); openAuth("login"); return; }

  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    toast("Please enter a valid contact email", "error");
    document.getElementById("pj-contact-email")?.focus();
    return;
  }

  var publishBtn = document.getElementById("post-job-btn");
  if (publishBtn) { publishBtn.textContent = "Publishing..."; publishBtn.disabled = true; }

  var newJob = {
    id:           "job_" + Date.now(),
    emoji:        "🏢",
    title:        jobTitle,
    dept:         department,
    type:         jobType || "Full-Time",
    location:     location,
    mode:         workMode,
    salaryMin:    parseInt(salaryMin) || 80000,
    salaryMax:    parseInt(salaryMax) || 120000,
    category:     category,
    desc:         description,
    tags:         skills.split(",").map(function(s){ return s.trim(); }).filter(Boolean),
    remote:       workMode === "Remote",
    urgent:       false,
    postedBy:     AppState.currentUser.id,
    company:      AppState.currentUser.company || AppState.currentUser.name || "",
    contactEmail: contactEmail,
    contactPhone: contactPhone,
    jobLocation:  jobLocation || location,
  };

  var result = await DB.addPostedJob(newJob);

  if (result && result.success) {
    toast('"' + jobTitle + '" published successfully! 🎉', "success");
    ["pj-title","pj-dept","pj-location","pj-sal-min","pj-sal-max","pj-desc","pj-skills",
     "pj-contact-email","pj-contact-phone","pj-job-location"].forEach(function(fid){
      var el = document.getElementById(fid);
      if (el) el.value = "";
    });
    await refreshEmployerStats();
    if (typeof switchTab === "function") switchTab("tab-jobs");
    await renderPostedJobsTable();
    if (typeof filterAndRender === "function") filterAndRender();
  } else {
    toast("Failed to publish job — is the server running?", "error");
  }

  if (publishBtn) { publishBtn.textContent = "📣 Publish Job"; publishBtn.disabled = false; }
}

function saveDraft() {
  var draftTitle = document.getElementById("pj-title") ? document.getElementById("pj-title").value.trim() : "Untitled Draft";
  toast('Draft "' + draftTitle + '" saved', "info");
}

/* ── Posted Jobs Table ── */
async function renderPostedJobsTable() {
  var tableBody = document.getElementById("posted-jobs-tbody");
  if (!tableBody) return;
  var user = AppState.currentUser;
  if (!user) return;

  var res = await fetch(API_BASE + "/jobs/employer/" + user.id);
  var postedJobs = res.ok ? await res.json() : [];

  var res2 = await fetch(API_BASE + "/applications/employer/" + user.id);
  var allApps = res2.ok ? await res2.json() : [];

  tableBody.querySelectorAll("tr.dynamic-row").forEach(function(r){ r.remove(); });

  if (!postedJobs.length) {
    var emptyRow = document.createElement("tr");
    emptyRow.className = "dynamic-row";
    emptyRow.innerHTML = '<td colspan="6" style="text-align:center;color:var(--text-secondary,#888);padding:32px">No jobs posted yet — use the form above to publish your first job.</td>';
    tableBody.appendChild(emptyRow);
    return;
  }

  postedJobs.forEach(function(job) {
    var applicantCount = allApps.filter(function(a){ return a.jobId === job.id; }).length;
    var tr = document.createElement("tr");
    tr.className = "dynamic-row";
    tr.innerHTML =
      '<td><strong>' + escapeHtml(job.title) + '</strong>' +
        (job.contactEmail ? '<div style="font-size:11px;color:var(--text-secondary,#888);margin-top:2px">📧 ' + escapeHtml(job.contactEmail) + '</div>' : '') +
      '</td>' +
      '<td>' + escapeHtml(job.dept || job.category || "—") + '</td>' +
      '<td>' + escapeHtml(job.location || "—") + '</td>' +
      '<td>' +
        '<button class="btn btn-outline btn-sm" style="font-size:12px" onclick="openJobApplicants(\'' + job.id + '\',\'' + escapeHtml(job.title).replace(/'/g,"\\'") + '\')">' +
          '<strong style="color:var(--accent)">' + applicantCount + '</strong> applicant' + (applicantCount !== 1 ? 's' : '') +
        '</button>' +
      '</td>' +
      '<td><span class="status-badge active">● Active</span></td>' +
      '<td style="display:flex;gap:6px;flex-wrap:wrap">' +
        '<button class="btn btn-danger btn-sm" onclick="deleteJob(\'' + job.id + '\')">Delete</button>' +
      '</td>';
    tableBody.insertBefore(tr, tableBody.firstChild);
  });
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

/* ── Delete Job ── */
async function deleteJob(jobId) {
  if (!confirm("Delete this job? This cannot be undone.")) return;
  await DB.deleteJob(jobId);
  await renderPostedJobsTable();
  await refreshEmployerStats();
  if (typeof filterAndRender === "function") filterAndRender();
  toast("Job removed", "info");
}

/* ── Build status dropdown ── */
function buildStatusDropdown(currentStatus, appId, inline) {
  var style = inline
    ? 'border:1px solid var(--border-mid,#ddd);border-radius:6px;padding:5px 8px;font-size:12px;outline:none;cursor:pointer'
    : 'border:1px solid var(--border-mid,#ddd);border-radius:6px;padding:3px 8px;font-size:12px;outline:none;cursor:pointer';

  var extraOpt = (currentStatus === "Reviewing")
    ? '<option value="" disabled selected style="color:#aaa">— Set status —</option>'
    : '';

  var optHtml = APPLICANT_STATUSES.map(function(s) {
    return '<option value="' + s + '"' + (s === currentStatus ? ' selected' : '') + '>' + s + '</option>';
  }).join('');

  return '<select style="' + style + '" onchange="changeApplicantStatus(this,\'' + appId + '\')">' +
    extraOpt + optHtml +
  '</select>';
}

/* ── Open per-job applicants modal ── */
async function openJobApplicants(jobId, jobTitle) {
  var modal   = document.getElementById("job-applicants-modal");
  var titleEl = document.getElementById("job-applicants-modal-title");
  var body    = document.getElementById("job-applicants-modal-body");
  if (!modal) return;

  if (titleEl) titleEl.textContent = "Applicants for: " + jobTitle;
  if (body) body.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-secondary)">Loading…</div>';
  modal.style.display = "block";

  try {
    var res = await fetch(API_BASE + "/applications/job/" + jobId);
    var applicants = res.ok ? await res.json() : [];

    if (!applicants.length) {
      body.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-secondary)">No applicants yet for this job.</div>';
      return;
    }

    body.innerHTML = applicants.map(function(app) {
      var name     = app.seekerName || "Applicant";
      var initials = name.split(" ").map(function(w){ return w[0]||""; }).join("").slice(0,2).toUpperCase() || "??";
      var date     = app.appliedAt ? new Date(app.appliedAt).toLocaleDateString("en-PK",{month:"short",day:"numeric",year:"numeric"}) : "—";
      var statusStyle = getStatusStyle(app.status);
      return (
        '<div style="border:1px solid var(--border-mid,#eee);border-radius:10px;padding:14px 16px;display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-bottom:10px">' +
          '<div style="width:40px;height:40px;border-radius:50%;background:var(--accent-light,#e0e7ff);color:var(--accent,#4f46e5);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0">' + escapeHtml(initials) + '</div>' +
          '<div style="flex:1;min-width:140px">' +
            '<div style="font-weight:600;font-size:14px">' + escapeHtml(name) + '</div>' +
            (app.seekerTitle ? '<div style="font-size:12px;color:var(--text-secondary)">' + escapeHtml(app.seekerTitle) + '</div>' : '') +
            (app.seekerEmail ? '<div style="font-size:12px;margin-top:3px">📧 <a href="mailto:' + escapeHtml(app.seekerEmail) + '" style="color:var(--accent)">' + escapeHtml(app.seekerEmail) + '</a></div>' : '') +
            (app.seekerPhone ? '<div style="font-size:12px">📞 ' + escapeHtml(app.seekerPhone) + '</div>' : '') +
          '</div>' +
          '<div style="font-size:12px;color:var(--text-secondary);min-width:80px">Applied: ' + date + '</div>' +
          '<span style="padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;' + statusStyle + '">' + escapeHtml(app.status || "Reviewing") + '</span>' +
          buildStatusDropdown(app.status, app.id, true) +
          '<a href="profile_page.html?uid=' + escapeHtml(app.userId) + '" target="_blank" class="btn btn-outline btn-sm" style="font-size:12px;text-decoration:none">👤 View Profile</a>' +
        '</div>'
      );
    }).join("");
  } catch (err) {
    body.innerHTML = '<div style="text-align:center;padding:32px;color:#ef4444">Failed to load applicants.</div>';
  }
}

function closeJobApplicantsModal() {
  var modal = document.getElementById("job-applicants-modal");
  if (modal) modal.style.display = "none";
}

/* ── Applicants Table (Global) — Task 1: debounce search, Task 3: status filter ── */
var _allApplicantsCache = [];
var _searchDebounceTimer = null;

async function renderApplicantsTable(statusFilter) {
  var tbody = document.getElementById("applicants-tbody");
  if (!tbody) return;
  var user = AppState.currentUser;
  if (!user) return;

  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-secondary)">Loading…</td></tr>';

  // Build URL with optional status filter
  var url = API_BASE + "/applications/employer/" + user.id;
  if (statusFilter && statusFilter !== "All Status") {
    url += "?status=" + encodeURIComponent(statusFilter);
  }

  var res = await fetch(url);
  _allApplicantsCache = res.ok ? await res.json() : [];

  _renderApplicantRows(_allApplicantsCache);
}

function _renderApplicantRows(apps) {
  var tbody = document.getElementById("applicants-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!apps.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-secondary,#888);padding:32px">No applicants found.</td></tr>';
    return;
  }

  apps.forEach(function(app) {
    var name     = app.seekerName || "Applicant";
    var initials = name.split(" ").map(function(w){ return w[0]||""; }).join("").slice(0,2).toUpperCase() || "??";
    var date     = app.appliedAt ? new Date(app.appliedAt).toLocaleDateString("en-PK",{month:"short",day:"numeric"}) : "—";
    var status   = app.status || "Reviewing";
    var statusStyle = getStatusStyle(status);

    var tr = document.createElement("tr");
    tr.innerHTML =
      '<td>' +
        '<div class="applicant-name">' +
          '<div class="applicant-av">' + escapeHtml(initials) + '</div>' +
          '<div><div style="font-weight:600">' + escapeHtml(name) + '</div>' +
          '<div style="font-size:11.5px;color:var(--text-secondary,#888)">' + (app.seekerTitle ? escapeHtml(app.seekerTitle) : '') + '</div>' +
          (app.seekerEmail ? '<div style="font-size:11px;color:var(--accent)">' + escapeHtml(app.seekerEmail) + '</div>' : '') +
          '</div>' +
        '</div>' +
      '</td>' +
      '<td>' + (app.jobTitle ? escapeHtml(app.jobTitle) : "—") + '</td>' +
      '<td><span style="padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;' + statusStyle + '">' + escapeHtml(status) + '</span></td>' +
      '<td>' + date + '</td>' +
      '<td>' + buildStatusDropdown(status, app.id, false) + '</td>' +
      '<td style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">' +
        (app.seekerEmail ? '<a class="btn btn-outline btn-sm" href="mailto:' + escapeHtml(app.seekerEmail) + '" style="text-decoration:none">Email</a>' : '') +
        '<a href="profile_page.html?uid=' + escapeHtml(app.userId) + '" target="_blank" class="btn btn-outline btn-sm" style="text-decoration:none;font-size:12px">👤 Profile</a>' +
      '</td>';
    tbody.appendChild(tr);
  });
}

/* ── Task 1: Debounced search — fires 500ms after user stops typing ── */
function onApplicantSearchInput(inputEl) {
  clearTimeout(_searchDebounceTimer);
  _searchDebounceTimer = setTimeout(function() {
    var query = inputEl.value.trim().toLowerCase();
    if (!query) {
      _renderApplicantRows(_allApplicantsCache);
      return;
    }
    var filtered = _allApplicantsCache.filter(function(app) {
      return (
        (app.seekerName  || "").toLowerCase().includes(query) ||
        (app.seekerTitle || "").toLowerCase().includes(query) ||
        (app.seekerEmail || "").toLowerCase().includes(query) ||
        (app.jobTitle    || "").toLowerCase().includes(query)
      );
    });
    _renderApplicantRows(filtered);
  }, 500);
}

/* ── Task 3: Status filter handler ── */
function onStatusFilterChange(selectEl) {
  var status = selectEl.value;
  renderApplicantsTable(status);
}

/* ── Change Applicant Status ── */
async function changeApplicantStatus(selectEl, appId) {
  var newStatus = selectEl.value;
  if (!newStatus || !APPLICANT_STATUSES.includes(newStatus)) return;

  selectEl.disabled = true;
  var result = await DB.updateAppStatus(appId, newStatus);
  selectEl.disabled = false;

  if (result && result.success) {
    // Update badge in modal
    var container = selectEl.closest ? selectEl.closest("div[style*='border:1px']") : null;
    if (container) {
      var badge = container.querySelector("span[style*='border-radius:12px']");
      if (badge) {
        badge.textContent = newStatus;
        badge.style.cssText = "padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;" + getStatusStyle(newStatus);
      }
    }
    // Update badge in table row
    var row = selectEl.closest ? selectEl.closest("tr") : null;
    if (row) {
      var badgeCell = row.querySelector("span[style*='border-radius:12px']");
      if (badgeCell) {
        badgeCell.textContent = newStatus;
        badgeCell.style.cssText = "padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;" + getStatusStyle(newStatus);
      }
    }
    // Update cache
    _allApplicantsCache.forEach(function(a) {
      if (a.id == appId) a.status = newStatus;
    });

    var statusMessages = {
      "Shortlisted":  "✅ Applicant shortlisted — notification sent!",
      "Interviewing": "📅 Interview stage set — applicant notified!",
      "Rejected":     "❌ Application rejected — applicant notified."
    };
    toast(statusMessages[newStatus] || "Status updated → " + newStatus, newStatus === "Rejected" ? "warning" : "success");
    await refreshEmployerStats();
  } else {
    toast("Failed to update status. Please try again.", "error");
    selectEl.value = selectEl.dataset.prev || "";
  }
  selectEl.dataset.prev = newStatus;
}

/* ── Notifications ── */
async function loadNotifications() {
  var user = AppState.currentUser;
  if (!user) return;
  var listEl = document.getElementById("notif-list");
  if (!listEl) return;

  try {
    var res = await fetch(API_BASE + "/notifications/" + user.id);
    var notifs = res.ok ? await res.json() : [];

    if (!notifs.length) {
      listEl.innerHTML = '<div style="text-align:center;color:var(--text-secondary,#888);padding:32px">No notifications yet.</div>';
      return;
    }

    listEl.innerHTML = notifs.map(function(n) {
      var date = n.createdAt ? new Date(n.createdAt).toLocaleString("en-PK",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}) : "";
      var typeIcon = n.type === "application" ? "👤" : n.type === "success" ? "✅" : n.type === "info" ? "📅" : n.type === "warning" ? "❌" : "🔔";
      return (
        '<div style="display:flex;gap:12px;padding:14px 16px;border-radius:10px;border:1px solid var(--border-mid,#eee);background:' + (n.isRead ? "transparent" : "var(--bg-hover,#f9f9ff)") + ';cursor:pointer;margin-bottom:8px" onclick="markNotifRead(\'' + n.id + '\')" id="notif-' + n.id + '">' +
          '<div style="font-size:22px;flex-shrink:0">' + typeIcon + '</div>' +
          '<div style="flex:1">' +
            '<div style="font-weight:' + (n.isRead ? "500" : "700") + ';font-size:13.5px">' + escapeHtml(n.title) + '</div>' +
            '<div style="font-size:12.5px;color:var(--text-secondary);margin-top:3px">' + escapeHtml(n.message) + '</div>' +
            (n.jobTitle ? '<div style="font-size:11.5px;margin-top:4px;color:var(--accent)">Job: ' + escapeHtml(n.jobTitle) + '</div>' : '') +
            '<div style="font-size:11px;color:var(--text-secondary);margin-top:4px">' + date + '</div>' +
          '</div>' +
          (!n.isRead ? '<div style="width:8px;height:8px;border-radius:50%;background:#4f46e5;margin-top:4px;flex-shrink:0"></div>' : '') +
        '</div>'
      );
    }).join("");

    await refreshNotifBadge();
  } catch (err) {
    if (listEl) listEl.innerHTML = '<div style="text-align:center;color:#ef4444;padding:32px">Failed to load notifications.</div>';
  }
}

async function markNotifRead(notifId) {
  try {
    await fetch(API_BASE + "/notifications/" + notifId + "/read", { method: "PUT" });
    var el = document.getElementById("notif-" + notifId);
    if (el) {
      el.style.background = "transparent";
      var dot = el.querySelector("div[style*='border-radius:50%']");
      if (dot) dot.remove();
      var title = el.querySelector("div[style*='font-weight']");
      if (title) title.style.fontWeight = "500";
    }
    await refreshNotifBadge();
  } catch (e) {}
}

async function markAllNotifRead() {
  var user = AppState.currentUser;
  if (!user) return;
  try {
    await fetch(API_BASE + "/notifications/" + user.id + "/read-all", { method: "PUT" });
    await loadNotifications();
    toast("All notifications marked as read", "info");
  } catch (e) {}
}

async function refreshNotifBadge() {
  var user = AppState.currentUser;
  if (!user) return;
  var badge = document.getElementById("notif-badge");
  if (!badge) return;
  try {
    var res = await fetch(API_BASE + "/notifications/" + user.id);
    var notifs = res.ok ? await res.json() : [];
    var unread = notifs.filter(function(n){ return !n.isRead; }).length;
    if (unread > 0) {
      badge.textContent = unread > 9 ? "9+" : unread;
      badge.style.display = "inline-block";
    } else {
      badge.style.display = "none";
    }
  } catch (e) {}
}

document.addEventListener("DOMContentLoaded", function() {
  var modal = document.getElementById("job-applicants-modal");
  if (modal) {
    modal.addEventListener("click", function(e) {
      if (e.target === modal) closeJobApplicantsModal();
    });
  }
});
