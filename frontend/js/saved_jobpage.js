/* ──────────────────────────────────────────────
   SAVED JOBS PAGE — saved_jobpage.js
   Async TiDB edition: data fetched from API.
────────────────────────────────────────────── */

async function renderSavedJobs() {
  const savedGrid = document.getElementById('saved-jobs-grid');
  if (!savedGrid) return;

  // Show loading state
  savedGrid.innerHTML = '<div class="empty-state"><div class="empty-icon"><i class="fa-solid fa-hourglass-half"></i></div><p>Loading saved jobs…</p></div>';

  // Fetch saved IDs and all jobs from TiDB
  const [savedIds, allJobs] = await Promise.all([
    DB.getSaved(),
    getAllJobs(),
  ]);

  const savedJobs = allJobs.filter(job => savedIds.includes(job.id));

  if (!savedJobs.length) {
    savedGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i class="fa-solid fa-bookmark"></i></div>
        <h3>No saved jobs yet</h3>
        <p>Browse jobs and click the bookmark icon to save them here</p>
        <button class="btn btn-primary" style="margin-top:16px"
          onclick="window.location.href='dashboard.html'">Browse Jobs</button>
      </div>`;
    return;
  }

  savedGrid.innerHTML = savedJobs.map(job => buildJobCardHTML(job, savedIds, [])).join('');
}

// Expose globally (called from HTML inline handler)
window.renderSavedJobs = renderSavedJobs;
