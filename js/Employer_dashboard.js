/* ──────────────────────────────────────────────
   EMPLOYER DASHBOARD — Employer_dashboard.js
   TiDB Edition: all data fetched from API,
   no localStorage for job/application data.
────────────────────────────────────────────── */

/* ── Stats ── */
// 🔧 TiDB: fetch employer's jobs and applicants from TiDB via API
async function refreshEmployerStats() {
  var user   = AppState.currentUser;
  var userId = user ? user.id : null;
  if (!userId) return;

  // 🔧 TiDB: GET /api/jobs/employer/:uid  → employer's active jobs
  var res1 = await fetch(API_BASE + "/jobs/employer/" + userId);
  var myJobs = res1.ok ? await res1.json() : [];

  // 🔧 TiDB: GET /api/applications/employer/:uid  → applicants for employer's jobs
  var res2 = await fetch(API_BASE + "/applications/employer/" + userId);
  var myApplicants = res2.ok ? await res2.json() : [];

  var shortlisted = myApplicants.filter(function(a){ return a.status === "Shortlisted"; }).length;
  var hired       = myApplicants.filter(function(a){ return a.status === "Offered"; }).length;

  function getEl(id) { return document.getElementById(id); }
  if (getEl("emp-stat-jobs"))  getEl("emp-stat-jobs").textContent  = myJobs.length;
  if (getEl("emp-stat-apps"))  getEl("emp-stat-apps").textContent  = myApplicants.length;
  if (getEl("emp-stat-short")) getEl("emp-stat-short").textContent = shortlisted;
  if (getEl("emp-stat-hired")) getEl("emp-stat-hired").textContent = hired;

  if (getEl("emp-stat-jobs-change"))   getEl("emp-stat-jobs-change").textContent   = myJobs.length       ? "▲ " + myJobs.length + " active"         : "No jobs yet";
  if (getEl("emp-stat-apps-change"))   getEl("emp-stat-apps-change").textContent   = myApplicants.length ? "▲ " + myApplicants.length + " total"     : "No applicants yet";
  if (getEl("emp-stat-short-change"))  getEl("emp-stat-short-change").textContent  = shortlisted         ? "▲ " + shortlisted + " shortlisted"       : "None shortlisted";
  if (getEl("emp-stat-hired-change"))  getEl("emp-stat-hired-change").textContent  = hired               ? "▲ " + hired + " offered"                 : "None offered yet";
}

/* ── Post Job ── */
async function postJob() {
  function getVal(id) { return (document.getElementById(id) ? document.getElementById(id).value : "").trim(); }
  var jobTitle    = getVal("pj-title");
  var department  = getVal("pj-dept");
  var jobType     = getVal("pj-type");
  var location    = getVal("pj-location");
  var workMode    = getVal("pj-mode");
  var salaryMin   = getVal("pj-sal-min");
  var salaryMax   = getVal("pj-sal-max");
  var category    = getVal("pj-category");
  var description = getVal("pj-desc");
  var skills      = getVal("pj-skills");

  if (!jobTitle)    { toast("Job title is required","error"); document.getElementById("pj-title")?.focus(); return; }
  if (!description) { toast("Job description is required","error"); document.getElementById("pj-desc")?.focus(); return; }
  if (!AppState.currentUser) { toast("Please sign in as an employer","warning"); openAuth("login"); return; }

  var publishBtn = document.getElementById("post-job-btn");
  if (publishBtn) { publishBtn.textContent = "Publishing..."; publishBtn.disabled = true; }

  var newJob = {
    id:        "job_" + Date.now(),
    emoji:     "🏢",
    title:     jobTitle,
    dept:      department,
    type:      jobType || "Full-Time",
    location:  location,
    mode:      workMode,
    salaryMin: parseInt(salaryMin) || 80000,
    salaryMax: parseInt(salaryMax) || 120000,
    category:  category,
    desc:      description,
    tags:      skills.split(",").map(function(s){ return s.trim(); }).filter(Boolean),
    remote:    workMode === "Remote",
    urgent:    false,
    postedBy:  AppState.currentUser.id,
  };

  // 🔧 TiDB: POST /api/jobs  → inserts job into TiDB jobs table
  var result = await DB.addPostedJob(newJob);

  if (result && result.success) {
    toast('"' + jobTitle + '" published successfully! 🎉', "success");
    ["pj-title","pj-dept","pj-location","pj-sal-min","pj-sal-max","pj-desc","pj-skills"].forEach(function(fid){
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
// 🔧 TiDB: fetch employer's jobs from TiDB and render the table
async function renderPostedJobsTable() {
  var tableBody = document.getElementById("posted-jobs-tbody");
  if (!tableBody) return;
  var user = AppState.currentUser;
  if (!user) return;

  // 🔧 TiDB: GET /api/jobs/employer/:uid
  var res = await fetch(API_BASE + "/jobs/employer/" + user.id);
  var postedJobs = res.ok ? await res.json() : [];

  // 🔧 TiDB: GET /api/applications/employer/:uid  → needed for applicant counts
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
      '<td><strong>' + job.title + '</strong></td>' +
      '<td>' + (job.dept || job.category || "—") + '</td>' +
      '<td>Active</td>' +
      '<td><strong style="color:var(--accent)">' + applicantCount + '</strong></td>' +
      '<td><span class="status-badge active">● Active</span></td>' +
      '<td><button class="btn btn-danger btn-sm" onclick="deleteJob(\'' + job.id + '\')">Delete</button></td>';
    tableBody.insertBefore(tr, tableBody.firstChild);
  });
}

/* ── Delete Job ── */
// 🔧 TiDB: DELETE /api/jobs/:id  → soft-deletes job row in TiDB
async function deleteJob(jobId) {
  await DB.deleteJob(jobId);
  await renderPostedJobsTable();
  await refreshEmployerStats();
  if (typeof filterAndRender === "function") filterAndRender();
  toast("Job removed", "info");
}

/* ── Applicants Table ── */
// 🔧 TiDB: fetch applicants from TiDB for employer's jobs
async function renderApplicantsTable() {
  var tbody = document.getElementById("applicants-tbody");
  if (!tbody) return;
  var user = AppState.currentUser;
  if (!user) return;

  // 🔧 TiDB: GET /api/applications/employer/:uid
  var res = await fetch(API_BASE + "/applications/employer/" + user.id);
  var allApps = res.ok ? await res.json() : [];

  tbody.innerHTML = "";

  if (!allApps.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-secondary,#888);padding:32px">No applicants yet — publish a job to start receiving applications.</td></tr>';
    return;
  }

  allApps.forEach(function(app) {
    var name     = app.seekerName || "Applicant";
    var initials = name.split(" ").map(function(w){ return w[0]||""; }).join("").slice(0,2).toUpperCase() || "??";
    var date     = app.appliedAt ? new Date(app.appliedAt).toLocaleDateString("en-PK",{month:"short",day:"numeric"}) : "—";
    var status   = app.status || "Reviewing";
    var opts     = ["Reviewing","Shortlisted","Interview","Offered","Rejected"];
    var optHtml  = opts.map(function(s){ return '<option value="'+s+'"'+(s===status?" selected":"")+'>'+s+'</option>'; }).join("");

    var tr = document.createElement("tr");
    tr.innerHTML =
      '<td>' +
        '<div class="applicant-name">' +
          '<div class="applicant-av">'+initials+'</div>' +
          '<div><div style="font-weight:600">'+name+'</div>' +
          '<div style="font-size:11.5px;color:var(--text-secondary,#888)">'+(app.seekerTitle||"")+'</div></div>' +
        '</div>' +
      '</td>' +
      '<td>'+(app.jobTitle||"—")+'</td>' +
      '<td>—</td>' +
      '<td>'+date+'</td>' +
      '<td>' +
        '<select style="border:1px solid var(--border-mid,#ddd);border-radius:6px;padding:3px 8px;font-size:12px;outline:none;cursor:pointer"' +
          ' onchange="changeApplicantStatus(this,\''+app.id+'\')">' +
          optHtml +
        '</select>' +
      '</td>' +
      '<td><button class="btn btn-outline btn-sm" onclick="toast(\'CV preview coming soon\',\'info\')">View CV</button></td>';
    tbody.appendChild(tr);
  });
}

/* ── Change Applicant Status ── */
// 🔧 TiDB: PUT /api/applications/:id/status  → updates status in TiDB
async function changeApplicantStatus(selectEl, appId) {
  var newStatus = selectEl.value;
  await DB.updateAppStatus(appId, newStatus);
  toast("Status updated → " + newStatus, "info");
  await refreshEmployerStats();
}
