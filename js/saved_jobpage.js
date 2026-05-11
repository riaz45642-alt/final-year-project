/* ──────────────────────────────────────────────
   9. SAVED JOBS PAGE
────────────────────────────────────────────── */
function renderSavedJobs() {
  const savedGrid = document.getElementById('saved-jobs-grid');
  if (!savedGrid) return;
  const savedIds  = DB.getSaved();
  const savedJobs = getAllJobs().filter(job => savedIds.includes(job.id));
  if (!savedJobs.length) {
    savedGrid.innerHTML = `<div class="empty-state"><div class="empty-icon">🔖</div><h3>No saved jobs yet</h3><p>Browse jobs and click the bookmark icon to save them here</p><button class="btn btn-primary" style="margin-top:16px" onclick="showPage('home')">Browse Jobs</button></div>`;
    return;
  }
  savedGrid.innerHTML = savedJobs.map(job => buildJobCardHTML(job)).join('');
}
