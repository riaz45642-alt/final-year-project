/* ──────────────────────────────────────────────
   APPLIED JOBS PAGE — applied_jobpage.js
────────────────────────────────────────────── */

async function cancelApplication(appId) {
  if (!confirm('Cancel this application? This cannot be undone.')) return;
  const result = await DB.cancelApp(appId);
  if (result && result.success) {
    toast('Application cancelled.', 'info');
    await renderAppliedJobs();
    await updateSidebarBadges();
  } else {
    toast('Failed to cancel application. Please try again.', 'error');
  }
}

async function renderSeekerNotifications() {
  const container = document.getElementById('seeker-notif-list');
  if (!container) return;
  const uid = AppState.currentUser ? AppState.currentUser.id : null;
  if (!uid) return;

  const notifs = await DB.getNotifications(uid);
  const statusNotifs = notifs.filter(function(n) {
    // Only show status-change notifications (Shortlisted / Interviewing / Rejected)
    // 'application' type is for employers only — never show here
    return n.type === 'success' || n.type === 'info' || n.type === 'warning' || n.type === 'status_update';
  });

  if (!statusNotifs.length) {
    container.innerHTML = '<p style="color:var(--text-secondary);font-size:13px;padding:8px 0">No notifications yet.</p>';
    return;
  }

  container.innerHTML = statusNotifs.map(function(n) {
    const dt = new Date(n.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
    const icon = n.type === 'status_update' ? '<i class="fa-solid fa-bell"></i>' : '<i class="fa-solid fa-envelope-open-text"></i>';
    return `<div onclick="markSeekerNotifRead('${n.id}',this)" id="snotif-${n.id}"
      style="display:flex;gap:12px;align-items:flex-start;padding:12px 14px;border-radius:10px;margin-bottom:8px;cursor:pointer;
             border:1px solid var(--border-mid,#eee);background:${n.isRead ? 'transparent' : 'var(--bg-hover,#f0f4ff)'}">
      <span style="font-size:18px;flex-shrink:0">${icon}</span>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600;color:var(--text-primary)">${n.title}</div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">${n.message}</div>
        <div style="font-size:11px;color:var(--text-secondary);margin-top:4px">${dt}</div>
      </div>
      ${!n.isRead ? '<span style="width:8px;height:8px;border-radius:50%;background:var(--accent,#4f6ef7);flex-shrink:0;margin-top:4px"></span>' : ''}
    </div>`;
  }).join('');
}

async function markSeekerNotifRead(notifId, el) {
  await DB.markNotifRead(notifId);
  if (el) { el.style.background = 'transparent'; const dot = el.querySelector('span[style*="border-radius:50%"]'); if (dot) dot.remove(); }
}

async function renderAppliedJobs() {
  const appliedList = document.getElementById('applied-jobs-list');
  if (!appliedList) return;

  appliedList.innerHTML = '<div class="empty-state"><div class="empty-icon"><i class="fa-solid fa-hourglass-half"></i></div><p>Loading applications…</p></div>';

  const [applications, allJobs] = await Promise.all([
    DB.getApps(),
    getAllJobs(),
  ]);

  if (!AppState.currentUser || !applications.length) {
    appliedList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i class="fa-solid fa-clipboard-list"></i></div>
        <h3>No applications yet</h3>
        <p>Apply to jobs and track your progress here</p>
        <button class="btn btn-primary" style="margin-top:16px"
          onclick="window.location.href='dashboard.html'">Find Jobs</button>
      </div>`;
    return;
  }

  const statusColorMap = {
    Reviewing:   'reviewing',
    Shortlisted: 'active',
    Interview:   'active',
    Offered:     'active',
    Rejected:    'closed',
  };

  appliedList.innerHTML = applications.map(function(app) {
    const job      = allJobs.find(j => j.id === (app.jobId || app.job_id))
                     || { title: 'Unknown Job', company: 'Unknown Company', emoji: '<i class="fa-solid fa-building"></i>' };
    const status   = app.status || 'Reviewing';
    const cssClass = statusColorMap[status] || 'reviewing';
    const dt       = new Date(app.appliedAt || app.applied_at)
                       .toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
    const canCancel = status === 'Reviewing';
    return `
    <div class="card mb-16" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
      <div class="company-logo" style="flex-shrink:0">${job.emoji || '<i class="fa-solid fa-building"></i>'}</div>
      <div style="flex:1;min-width:160px">
        <div class="job-title" style="font-size:14.5px">${job.title}</div>
        <div class="company-name">${job.company || ''}</div>
        <div class="job-meta" style="margin-top:6px">
          <span class="job-meta-item"><i class="fa-solid fa-calendar"></i> Applied ${dt}</span>
        </div>
      </div>
      <span class="status-badge ${cssClass}">● ${status}</span>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <button class="btn btn-outline btn-sm"
          onclick="window.location.href='dashboard.html'">View Job</button>
        ${canCancel
          ? `<button class="btn btn-sm" style="background:var(--danger,#e24b4a);color:#fff;border:none;cursor:pointer;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:600"
              onclick="cancelApplication('${app.id}')">&times; Cancel</button>`
          : ''}
      </div>
    </div>`;
  }).join('');
}

window.renderAppliedJobs      = renderAppliedJobs;
window.cancelApplication      = cancelApplication;
window.renderSeekerNotifications = renderSeekerNotifications;
window.markSeekerNotifRead    = markSeekerNotifRead;




