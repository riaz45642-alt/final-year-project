/* ──────────────────────────────────────────────
   13. EMPLOYER DASHBOARD
────────────────────────────────────────────── */
function refreshEmployerStats() {
  const user = AppState.currentUser;
  const userId = user ? user.id : null;

  // Get only jobs posted by this employer
  const allPosted = DB.getPostedJobs();
  const myJobs = userId
    ? allPosted.filter(j => j.postedBy === userId)
    : allPosted;

  // Get all applications for my jobs
  const myJobIds = myJobs.map(j => j.id);
  const allApps = DB.getApps();
  const myApplicants = allApps.filter(a => myJobIds.includes(a.jobId));

  // Count shortlisted and hired from applicant statuses
  const shortlisted = myApplicants.filter(a => a.status === 'shortlisted').length;
  const hired       = myApplicants.filter(a => a.status === 'hired').length;

  const getEl = id => document.getElementById(id);
  if (getEl('emp-stat-jobs'))  getEl('emp-stat-jobs').textContent  = myJobs.length;
  if (getEl('emp-stat-apps'))  getEl('emp-stat-apps').textContent  = myApplicants.length;
  if (getEl('emp-stat-short')) getEl('emp-stat-short').textContent = shortlisted;
  if (getEl('emp-stat-hired')) getEl('emp-stat-hired').textContent = hired;

  // Update stat change labels
  const jobChange   = document.getElementById('emp-stat-jobs-change');
  const appChange   = document.getElementById('emp-stat-apps-change');
  const shortChange = document.getElementById('emp-stat-short-change');
  const hiredChange = document.getElementById('emp-stat-hired-change');
  if (jobChange)   jobChange.textContent   = myJobs.length > 0      ? `▲ ${myJobs.length} active`        : 'No jobs yet';
  if (appChange)   appChange.textContent   = myApplicants.length > 0 ? `▲ ${myApplicants.length} total`  : 'No applicants yet';
  if (shortChange) shortChange.textContent = shortlisted > 0         ? `▲ ${shortlisted} shortlisted`    : 'None shortlisted';
  if (hiredChange) hiredChange.textContent = hired > 0               ? `▲ ${hired} hired`                : 'None hired yet';
}

function postJob() {
  const getVal = id => (document.getElementById(id)?.value || '').trim();
  const jobTitle   = getVal('pj-title');
  const department = getVal('pj-dept');
  const jobType    = getVal('pj-type');
  const location   = getVal('pj-location');
  const workMode   = getVal('pj-mode');
  const salaryMin  = getVal('pj-sal-min');
  const salaryMax  = getVal('pj-sal-max');
  const category   = getVal('pj-category');
  const description = getVal('pj-desc');
  const skills     = getVal('pj-skills');

  if (!jobTitle)    { toast('Job title is required', 'error');       document.getElementById('pj-title')?.focus(); return; }
  if (!description) { toast('Job description is required', 'error'); document.getElementById('pj-desc')?.focus();  return; }
  if (!AppState.currentUser) { toast('Please sign in as an employer', 'warning'); openAuth('login'); return; }

  const publishBtn = document.getElementById('post-job-btn');
  publishBtn.textContent = 'Publishing...'; publishBtn.disabled = true;

  setTimeout(() => {
    const newJob = {
      id: 'pj_' + Date.now(),
      emoji: '🏢',
      title: jobTitle, dept: department, type: jobType, location, mode: workMode,
      salaryMin: parseInt(salaryMin) || 80000,
      salaryMax: parseInt(salaryMax) || 120000,
      category, desc: description,
      tags: skills.split(',').map(s => s.trim()).filter(Boolean),
      remote: workMode === 'Remote', urgent: false,
      postedAt: Date.now(),
      postedBy: AppState.currentUser.id,
    };
    DB.addPostedJob(newJob);
    toast(`Job "${jobTitle}" published successfully! 🎉`, 'success');
    publishBtn.textContent = '📣 Publish Job'; publishBtn.disabled = false;

    ['pj-title', 'pj-dept', 'pj-location', 'pj-sal-min', 'pj-sal-max', 'pj-desc', 'pj-skills'].forEach(fieldId => {
      const fieldEl = document.getElementById(fieldId);
      if (fieldEl) fieldEl.value = '';
    });
    refreshEmployerStats();
    switchTab('tab-jobs');
    renderPostedJobsTable();
    filterAndRender && filterAndRender();
  }, 1000);
}

function saveDraft() {
  const draftTitle = document.getElementById('pj-title')?.value.trim() || 'Untitled Draft';
  toast(`Draft "${draftTitle}" saved`, 'info');
}

function renderPostedJobsTable() {
  const tableBody  = document.getElementById('posted-jobs-tbody');
  if (!tableBody) return;
  const user = AppState.currentUser;
  const allPosted = DB.getPostedJobs();
  const postedJobs = user ? allPosted.filter(j => j.postedBy === user.id) : allPosted;

  const dynamicRowsHTML = postedJobs.map(job => {
    const applicantCount = DB.getApps().filter(a => a.jobId === job.id).length;
    return `
    <tr>
      <td><strong>${job.title}</strong></td>
      <td>${job.dept || job.category || '—'}</td>
      <td>Just posted</td>
      <td><strong style="color:var(--accent)">${applicantCount}</strong></td>
      <td><span class="status-badge active">● Active</span></td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="deleteJob('${job.id}')">Delete</button>
      </td>
    </tr>`;
  }).join('');

  tableBody.querySelectorAll('tr.dynamic-row').forEach(row => row.remove());
  if (dynamicRowsHTML) {
    const tempWrapper = document.createElement('tbody');
    tempWrapper.innerHTML = dynamicRowsHTML;
    Array.from(tempWrapper.querySelectorAll('tr')).forEach(row => {
      row.classList.add('dynamic-row');
      tableBody.insertBefore(row, tableBody.firstChild);
    });
  }
}

function deleteJob(jobId) {
  let remainingJobs = DB.getPostedJobs().filter(job => job.id !== jobId);
  DB._set('posted', remainingJobs);
  renderPostedJobsTable();
  refreshEmployerStats();
  typeof filterAndRender === 'function' && filterAndRender();
  toast('Job removed', 'info');
}

function changeApplicantStatus(selectEl, applicantId) {
  const apps = DB.getApps();
  const idx = apps.findIndex(a => a.id === applicantId);
  if (idx !== -1) {
    apps[idx].status = selectEl.value;
    DB._set('apps', apps);
  }
  const label = selectEl.closest('tr')?.querySelector('.applicant-name div div')?.textContent || 'Applicant';
  toast(`${label} status → ${selectEl.value}`, 'info');
  refreshEmployerStats();
}

function renderApplicantsTable() {
  const tbody = document.getElementById('applicants-tbody');
  if (!tbody) return;

  const user = AppState.currentUser;
  const allPosted = DB.getPostedJobs();
  const myJobs = user ? allPosted.filter(j => j.postedBy === user.id) : allPosted;
  const myJobIds = myJobs.map(j => j.id);
  const allApps = DB.getApps().filter(a => myJobIds.includes(a.jobId));

  // Remove only dynamic rows, keep nothing (we'll replace all)
  tbody.innerHTML = '';

  if (allApps.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-secondary,#888);padding:32px">No applicants yet — publish a job to start receiving applications.</td></tr>';
    return;
  }

  allApps.forEach(app => {
    const job = myJobs.find(j => j.id === app.jobId);
    const jobTitle = job ? job.title : '—';
    const name = app.seekerName || app.name || 'Applicant';
    const initials = name.split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || '??';
    const date = app.appliedAt ? new Date(app.appliedAt).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' }) : '—';
    const status = app.status || 'Reviewing';
    const statusOptions = ['Reviewing', 'Shortlisted', 'Interview', 'Offered', 'Rejected'];
    const optionsHTML = statusOptions.map(s =>
      `<option value="${s}"${s === status ? ' selected' : ''}>${s}</option>`
    ).join('');

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="applicant-name">
          <div class="applicant-av">${initials}</div>
          <div>
            <div style="font-weight:600">${name}</div>
            <div style="font-size:11.5px;color:var(--text-secondary,#888)">${app.seekerTitle || ''}</div>
          </div>
        </div>
      </td>
      <td>${jobTitle}</td>
      <td>—</td>
      <td>${date}</td>
      <td>
        <select style="border:1px solid var(--border-mid,#ddd);border-radius:6px;padding:3px 8px;font-size:12px;outline:none;cursor:pointer"
          onchange="changeApplicantStatus(this,'${app.id}')">
          ${optionsHTML}
        </select>
      </td>
      <td><button class="btn btn-outline btn-sm" onclick="toast('CV preview coming soon','info')">View CV</button></td>
    `;
    tbody.appendChild(tr);
  });
}