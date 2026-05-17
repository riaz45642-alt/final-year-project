/* ──────────────────────────────────────────────
   APPLIED JOBS PAGE — applied_jobpage.js
   Async TiDB edition: data fetched from API.
   Status comes from the database, not random.
────────────────────────────────────────────── */

async function renderAppliedJobs() {
  const appliedList = document.getElementById('applied-jobs-list');
  if (!appliedList) return;

  // Show loading state
  appliedList.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><p>Loading applications…</p></div>';

  // Both DB calls run in parallel
  const [applications, allJobs] = await Promise.all([
    DB.getApps(),
    getAllJobs(),
  ]);

  if (!AppState.currentUser || !applications.length) {
    appliedList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>No applications yet</h3>
        <p>Apply to jobs and track your progress here</p>
        <button class="btn btn-primary" style="margin-top:16px"
          onclick="window.location.href='index.html'">Find Jobs</button>
      </div>`;
    return;
  }

  // Status → CSS class mapping (matches real DB status values)
  const statusColorMap = {
    Reviewing:   'reviewing',
    Shortlisted: 'active',
    Interview:   'active',
    Offered:     'active',
    Rejected:    'closed',
  };

  appliedList.innerHTML = applications.map(function(app) {
    const job      = allJobs.find(j => j.id === (app.jobId || app.job_id))
                     || { title: 'Unknown Job', company: 'Unknown Company', emoji: '🏢' };
    const status   = app.status || 'Reviewing';
    const cssClass = statusColorMap[status] || 'reviewing';
    const dt       = new Date(app.appliedAt || app.applied_at)
                       .toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
    return `
    <div class="card mb-16" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
      <div class="company-logo" style="flex-shrink:0">${job.emoji || '🏢'}</div>
      <div style="flex:1;min-width:160px">
        <div class="job-title" style="font-size:14.5px">${job.title}</div>
        <div class="company-name">${job.company || ''}</div>
        <div class="job-meta" style="margin-top:6px">
          <span class="job-meta-item">📅 Applied ${dt}</span>
        </div>
      </div>
      <span class="status-badge ${cssClass}">● ${status}</span>
      <button class="btn btn-outline btn-sm"
        onclick="window.location.href='index.html'">View Job</button>
    </div>`;
  }).join('');
}

// Expose globally
window.renderAppliedJobs = renderAppliedJobs;




