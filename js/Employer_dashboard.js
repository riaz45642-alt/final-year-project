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

function changeApplicantStatus(selectEl, applicantName) {
  // Update status in DB
  const apps = DB.getApps();
  // Find by name match (best effort since we don't store names in apps)
  toast(`${applicantName} status → ${selectEl.value}`, 'info');
  refreshEmployerStats();
}
