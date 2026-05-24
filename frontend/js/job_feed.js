/* ──────────────────────────────────────────────
   7. JOB FEED & SEARCH
────────────────────────────────────────────── */
function renderJobFeed(jobsList) {
  const feedGrid  = document.getElementById('job-feed-grid');
  const jobCount  = document.getElementById('job-count');
  if (!feedGrid) return;
  jobCount.textContent = jobsList.length;
  if (!jobsList.length) {
    feedGrid.innerHTML = '<div class="empty-state"><div class="empty-icon"><i class="fa-solid fa-magnifying-glass"></i></div><h3>No jobs found</h3><p>Try different keywords or category filters</p></div>';
    return;
  }
  feedGrid.innerHTML = jobsList.map(job => buildJobCardHTML(job)).join('');

  // Re-attach bookmark and applied states
  jobsList.forEach(job => {
    if (DB.isSaved(job.id)) {
      const bookmarkBtn = feedGrid.querySelector(`[data-bookmark="${job.id}"]`);
      if (bookmarkBtn) bookmarkBtn.classList.add('saved');
    }
    if (DB.hasApplied(job.id)) {
      const applyBtn = feedGrid.querySelector(`[data-apply="${job.id}"]`);
      if (applyBtn) { applyBtn.textContent = '<i class="fa-solid fa-check"></i> Applied'; applyBtn.classList.add('applied'); applyBtn.disabled = true; }
    }
  });
}

function buildJobCardHTML(job) {
  return `
  <div class="job-card" onclick="openJobDetail('${job.id}')">
    <div class="job-card-top">
      <div class="company-logo">${job.emoji || '<i class="fa-solid fa-building"></i>'}</div>
      <button class="job-bookmark ${DB.isSaved(job.id) ? 'saved' : ''}" data-bookmark="${job.id}"
        onclick="event.stopPropagation();toggleBookmark('${job.id}',this)"><i class="fa-solid fa-bookmark"></i></button>
    </div>
    <div class="job-title">${job.title}</div>
    <div class="company-name">${job.company}</div>
    <div class="job-meta">
      <span class="job-meta-item"><i class="fa-solid fa-location-dot"></i> ${job.location}</span>
      <span class="job-meta-item"><i class="fa-solid fa-clock"></i> ${job.type}</span>
    </div>
    <div class="job-tags">
      ${(job.tags || []).slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join('')}
      ${job.remote ? '<span class="tag green">Remote OK</span>' : ''}
      ${job.urgent ? '<span class="tag orange">Urgent</span>' : ''}
    </div>
    <div class="job-footer">
      <div class="salary">Rs ${formatSalary(job.salaryMin)}–${formatSalary(job.salaryMax)} <span>/month</span></div>
      <button class="apply-btn ${DB.hasApplied(job.id) ? 'applied' : ''}" data-apply="${job.id}"
        onclick="event.stopPropagation();applyJob('${job.id}',this)"
        ${DB.hasApplied(job.id) ? 'disabled' : ''}>
        ${DB.hasApplied(job.id) ? '<i class="fa-solid fa-check"></i> Applied' : 'Apply Now →'}
      </button>
    </div>
  </div>`;
}

function formatSalary(amount) {
  if (!amount) return '?';
  return amount >= 1000 ? Math.round(amount / 1000) + 'K' : amount;
}

function filterAndRender() {
  let filteredJobs = getAllJobs();
  if (AppState.activeCategory !== 'all') {
    filteredJobs = filteredJobs.filter(job => job.category === AppState.activeCategory);
  }
  if (AppState.searchQuery) {
    const query = AppState.searchQuery.toLowerCase();
    filteredJobs = filteredJobs.filter(job =>
      job.title.toLowerCase().includes(query) ||
      job.company.toLowerCase().includes(query) ||
      (job.tags || []).some(tag => tag.toLowerCase().includes(query)) ||
      job.location.toLowerCase().includes(query)
    );
  }
  renderJobFeed(filteredJobs);
}

function setCategory(category, chipElement) {
  AppState.activeCategory = category;
  document.querySelectorAll('#home-chips .category-chip, #home-chips .chip').forEach(chip => chip.classList.remove('active'));
  chipElement.classList.add('active');
  filterAndRender();
}

function toggleBookmark(jobId, bookmarkBtn) {
  const isSaved = DB.toggleSave(jobId);
  bookmarkBtn.classList.toggle('saved', isSaved);
  const job = getAllJobs().find(j => j.id === jobId);
  toast(isSaved ? `Saved "${job?.title}"` : `Removed from saved`, isSaved ? 'success' : 'info');
  const savedCount = DB.getSaved().length;
  document.querySelectorAll('.sidebar-badge[data-for="saved"], .badge[data-for="saved"]').forEach(badge => badge.textContent = savedCount);
}

function applyJob(jobId, applyBtn) {
  if (!AppState.currentUser) {
    toast('Please sign in to apply', 'warning');
    openAuth('login');
    return;
  }
  if (DB.hasApplied(jobId)) return;
  const job = getAllJobs().find(j => j.id === jobId);
  applyBtn.textContent = 'Applying...';
  applyBtn.disabled = true;
  setTimeout(() => {
    DB.addApp({ jobId, userId: AppState.currentUser.id, appliedAt: Date.now(), status: 'reviewing' });
    applyBtn.textContent = '<i class="fa-solid fa-check"></i> Applied';
    applyBtn.classList.add('applied');
    toast(`Applied to "${job?.title}" successfully! <i class="fa-solid fa-circle-check"></i>`, 'success');
    const appliedCount = DB.getApps().length;
    document.querySelectorAll('.sidebar-badge[data-for="applied"], .badge[data-for="applied"]').forEach(badge => badge.textContent = appliedCount);
  }, 800);
}
