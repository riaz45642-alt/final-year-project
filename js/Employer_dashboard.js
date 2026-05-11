/* ──────────────────────────────────────────────
   13. EMPLOYER DASHBOARD
────────────────────────────────────────────── */
function refreshEmployerStats() {
  const postedJobs = DB.getPostedJobs();
  const getEl = id => document.getElementById(id);
  if (getEl('emp-stat-jobs'))  getEl('emp-stat-jobs').textContent  = 6 + postedJobs.length;
  if (getEl('emp-stat-apps'))  getEl('emp-stat-apps').textContent  = 148 + (postedJobs.length * 12);
  if (getEl('emp-stat-short')) getEl('emp-stat-short').textContent = 23 + postedJobs.length;
  if (getEl('emp-stat-hired')) getEl('emp-stat-hired').textContent = 4;
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

    // Clear form fields
    ['pj-title', 'pj-dept', 'pj-location', 'pj-sal-min', 'pj-sal-max', 'pj-desc', 'pj-skills'].forEach(fieldId => {
      const fieldEl = document.getElementById(fieldId);
      if (fieldEl) fieldEl.value = '';
    });
    refreshEmployerStats();
    switchTab('tab-jobs');
    renderPostedJobsTable();
    filterAndRender();
  }, 1000);
}

function saveDraft() {
  const draftTitle = document.getElementById('pj-title')?.value.trim() || 'Untitled Draft';
  toast(`Draft "${draftTitle}" saved`, 'info');
}

function renderPostedJobsTable() {
  const tableBody  = document.getElementById('posted-jobs-tbody');
  if (!tableBody) return;
  const postedJobs = DB.getPostedJobs();
  const dynamicRowsHTML = postedJobs.map(job => `
    <tr>
      <td><strong>${job.title}</strong></td>
      <td>${job.dept || job.category || '—'}</td>
      <td>Just posted</td>
      <td><strong style="color:var(--accent)">0</strong></td>
      <td><span class="status-badge active">● Active</span></td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="deleteJob('${job.id}')">Delete</button>
      </td>
    </tr>`).join('');

  // Remove previously inserted dynamic rows
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
  filterAndRender();
  toast('Job removed', 'info');
}

function changeApplicantStatus(selectEl, applicantName) {
  toast(`${applicantName} status → ${selectEl.value}`, 'info');
}
