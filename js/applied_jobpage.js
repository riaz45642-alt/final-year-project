/* ──────────────────────────────────────────────
   10. APPLIED JOBS PAGE
────────────────────────────────────────────── */
function renderAppliedJobs() {
  const appliedList = document.getElementById('applied-jobs-list');
  if (!appliedList) return;
  const applications = DB.getApps();
  if (!AppState.currentUser || !applications.length) {
    appliedList.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><h3>No applications yet</h3><p>Apply to jobs and track your progress here</p><button class="btn btn-primary" style="margin-top:16px" onclick="showPage('home')">Find Jobs</button></div>`;
    return;
  }
  const statusOptions = ['reviewing', 'shortlisted', 'interviewed', 'offered', 'rejected'];
  const statusColorMap = { reviewing: 'reviewing', shortlisted: 'active', interviewed: 'active', offered: 'active', rejected: 'closed' };
  appliedList.innerHTML = applications.map(application => {
    const job = getAllJobs().find(j => j.id === application.jobId) || { title: 'Unknown Job', company: 'Unknown Company', emoji: '🏢' };
    const statusIndex = Math.floor(Math.random() * 3);
    const statusKey   = statusOptions[statusIndex];
    const appliedDate = new Date(application.appliedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
    return `
    <div class="card mb-16" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
      <div class="company-logo" style="flex-shrink:0">${job.emoji}</div>
      <div style="flex:1;min-width:160px">
        <div class="job-title" style="font-size:14.5px">${job.title}</div>
        <div class="company-name">${job.company}</div>
        <div class="job-meta" style="margin-top:6px"><span class="job-meta-item">📅 Applied ${appliedDate}</span></div>
      </div>
      <span class="status-badge ${statusColorMap[statusKey] || 'reviewing'}">● ${statusKey.charAt(0).toUpperCase() + statusKey.slice(1)}</span>
      <button class="btn btn-outline btn-sm" onclick="openJobDetail('${application.jobId}')">View Job</button>
    </div>`;
  }).join('');
}




