// ══════════════════════════════════════════════
//  TALENTBRIDGE — script.js  (UPDATED)
// ══════════════════════════════════════════════

/* ──────────────────────────────────────────────
   1. DATABASE / LOCALSTORAGE LAYER
────────────────────────────────────────────── */
const DB = {
  _get(key)       { try { return JSON.parse(localStorage.getItem('tb_' + key)) || null; } catch { return null; } },
  _set(key, val)  { localStorage.setItem('tb_' + key, JSON.stringify(val)); },

  getUsers()          { return this._get('users') || []; },
  saveUsers(users)    { this._set('users', users); },
  addUser(user)       { const u = this.getUsers(); u.push(user); this.saveUsers(u); },
  getUserByEmail(e)   { return this.getUsers().find(u => u.email === e) || null; },

  getSession()        { return this._get('session'); },
  setSession(user)    { this._set('session', user); },
  clearSession()      { localStorage.removeItem('tb_session'); },

  getSaved()          { return this._get('saved') || []; },
  toggleSave(jobId)   {
    let s = this.getSaved();
    if (s.includes(jobId)) s = s.filter(id => id !== jobId); else s.push(jobId);
    this._set('saved', s);
    return s.includes(jobId);
  },
  isSaved(jobId)      { return this.getSaved().includes(jobId); },

  getApps()           { return this._get('apps') || []; },
  addApp(app)         { const a = this.getApps(); a.push(app); this._set('apps', a); },
  hasApplied(jobId)   { return this.getApps().some(a => a.jobId === jobId); },

  getPostedJobs()     { return this._get('posted') || []; },
  addPostedJob(job)   { const p = this.getPostedJobs(); p.push(job); this._set('posted', p); },

  getChat()           { return this._get('chat') || []; },
  addChat(msg)        { const c = this.getChat(); c.push(msg); this._set('chat', c); },
  clearChat()         { this._set('chat', []); },
};

/* Seed demo accounts */
(function seedDemo() {
  if (!DB.getUserByEmail('demo@employer.com'))
    DB.addUser({ id:'u_demo_emp',    name:'TechNova HR',  email:'demo@employer.com',        password:'demo123',  role:'employer', avatar:'TH', joinedAt:Date.now() });
  if (!DB.getUserByEmail('ahmed@talentbridge.com'))
    DB.addUser({ id:'u_demo_seeker', name:'Ahmed Khan',   email:'ahmed@talentbridge.com',   password:'ahmed123', role:'seeker',   avatar:'AK', joinedAt:Date.now() });
})();

/* ──────────────────────────────────────────────
   2. JOBS DATA
────────────────────────────────────────────── */
const STATIC_JOBS = [];

function getAllJobs() {
  const posted = DB.getPostedJobs().map(j => ({ ...j, id: j.id || 'pj_'+j.postedAt, posted:'Just posted' }));
  return [...posted, ...STATIC_JOBS];
}

/* ──────────────────────────────────────────────
   3. APP STATE
────────────────────────────────────────────── */
const AppState = {
  currentPage:      'home',
  currentUser:      DB.getSession(),
  activeCategory:   'all',
  searchQuery:      '',
  selectedTemplate: 'blue',
  chatHistory:      [],
};

/* ──────────────────────────────────────────────
   4. TOAST NOTIFICATIONS
────────────────────────────────────────────── */
function toast(message, type = 'info', duration = 3000) {
  const icons = { success:'✅', error:'❌', info:'ℹ️', warning:'⚠️' };
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }, duration);
}

/* ──────────────────────────────────────────────
   5. ROLE-BASED ACCESS CONTROL
────────────────────────────────────────────── */
function applyRoleBasedUI() {
  const user = AppState.currentUser;
  const role = user ? user.role : null;

  // Elements only for job seekers
  const seekerOnlyItems = document.querySelectorAll('[data-role="seeker"]');
  // Elements only for employers
  const employerOnlyItems = document.querySelectorAll('[data-role="employer"]');

  seekerOnlyItems.forEach(el => {
    el.style.display = (role === 'employer') ? 'none' : '';
  });
  employerOnlyItems.forEach(el => {
    el.style.display = (role === 'seeker') ? 'none' : '';
  });
}

/* ──────────────────────────────────────────────
   6. AUTH UI UPDATE
────────────────────────────────────────────── */
function updateAuthUI() {
  const user         = AppState.currentUser;
  const loggedOutEl  = document.getElementById('nav-logged-out');
  const loggedInEl   = document.getElementById('nav-logged-in');
  const sbBlock      = document.getElementById('sidebar-user-block');
  const loginSignupBtn = document.getElementById('sidebar-login-signup-btn');

  if (user) {
    if (loggedOutEl) loggedOutEl.classList.add('hidden');
    if (loggedInEl)  loggedInEl.classList.remove('hidden');

    // Hide login/signup sidebar button when logged in
    if (loginSignupBtn) loginSignupBtn.style.display = 'none';

    const initialsEl = document.getElementById('nav-avatar-initials');
    if (initialsEl) initialsEl.textContent = user.avatar || user.name.slice(0,2).toUpperCase();

    if (sbBlock) {
      sbBlock.classList.remove('hidden');
      const sbAv   = document.getElementById('sb-avatar');
      const sbName = document.getElementById('sb-name');
      const sbRole = document.getElementById('sb-role');
      if (sbAv)   sbAv.textContent   = user.avatar || user.name.slice(0,2).toUpperCase();
      if (sbName) sbName.textContent = user.name;
      if (sbRole) sbRole.textContent = user.role === 'employer' ? 'Employer' : 'Job Seeker';
    }

    // profile_page.html elements — only update if they exist
    const profName  = document.getElementById('prof-name');
    const profSub   = document.getElementById('prof-title-sub');
    const profAv    = document.getElementById('prof-avatar');
    if (profName)  profName.textContent  = user.name;
    if (profSub)   profSub.textContent   = user.role === 'employer' ? 'Employer Account' : 'Job Seeker';
    if (profAv)    profAv.textContent    = user.avatar || user.name.slice(0,2).toUpperCase();
  } else {
    if (loggedOutEl) loggedOutEl.classList.remove('hidden');
    if (loggedInEl)  loggedInEl.classList.add('hidden');
    if (sbBlock)     sbBlock.classList.add('hidden');

    // Show login/signup button when logged out
    if (loginSignupBtn) loginSignupBtn.style.display = '';
  }

  // Apply role-based visibility
  applyRoleBasedUI();
}

/* ──────────────────────────────────────────────
   7. NAVIGATION
────────────────────────────────────────────── */
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + pageId);
  if (target) target.classList.add('active');
  AppState.currentPage = pageId;
  document.querySelectorAll('.sidebar-nav-item').forEach(i => i.classList.remove('active'));
  const activeItem = document.querySelector(`.sidebar-nav-item[data-page="${pageId}"]`);
  if (activeItem) activeItem.classList.add('active');
  if (pageId === 'saved')    renderSavedJobs();
  if (pageId === 'applied')  renderAppliedJobs();
  if (pageId === 'employer') { if(typeof refreshEmployerStats === 'function') refreshEmployerStats(); }
}

function navTo(pageId) { showPage(pageId); window.scrollTo(0,0); }

function toggleMobileSidebar() {
  const sidebar   = document.getElementById('sidebar');
  const overlay   = document.getElementById('mobile-sidebar-overlay');
  const hamburger = document.getElementById('mobile-menu-toggle');
  if (!sidebar) return;
  const isOpen = sidebar.classList.contains('mobile-open');
  sidebar.classList.toggle('mobile-open', !isOpen);
  if (overlay)   overlay.classList.toggle('visible', !isOpen);
  if (hamburger) hamburger.classList.toggle('open', !isOpen);
}

function closeMobileSidebar() {
  const sidebar   = document.getElementById('sidebar');
  const overlay   = document.getElementById('mobile-sidebar-overlay');
  const hamburger = document.getElementById('mobile-menu-toggle');
  if (sidebar)   sidebar.classList.remove('mobile-open');
  if (overlay)   overlay.classList.remove('visible');
  if (hamburger) hamburger.classList.remove('open');
}

function openDropdown()  { document.getElementById('user-dropdown')?.classList.toggle('open'); }
function closeDropdown() { document.getElementById('user-dropdown')?.classList.remove('open'); }

/* ──────────────────────────────────────────────
   8. JOB DETAIL MODAL
────────────────────────────────────────────── */
function openJobDetail(jobId) {
  const job = getAllJobs().find(j => j.id === jobId);
  if (!job) return;
  const modalBox = document.getElementById('job-detail-box');
  if (!modalBox) return;
  const isApplied    = DB.hasApplied(jobId);
  const isBookmarked = DB.isSaved(jobId);
  const user = AppState.currentUser;
  const isEmployer = user && user.role === 'employer';

  modalBox.innerHTML = `
    <button class="modal-close" onclick="closeJobDetail()">✕</button>
    <div class="job-detail-content">
      <div class="job-detail-header">
        <div class="job-detail-logo">${job.emoji||'🏢'}</div>
        <div style="flex:1">
          <div class="job-detail-title">${job.title}</div>
          <div style="font-size:14px;color:var(--text-secondary);margin-top:4px">${job.company||''}</div>
          <div class="job-meta" style="margin-top:8px">
            <span class="job-meta-item">📍 ${job.location}</span>
            <span class="job-meta-item">⏰ ${job.type}</span>
            <span class="job-meta-item">🕐 ${job.posted||'Recently'}</span>
          </div>
          <div style="margin-top:8px">
            <span class="salary">Rs ${formatSalary(job.salaryMin)}–${formatSalary(job.salaryMax)} <span>/month</span></span>
          </div>
        </div>
      </div>
      <div class="job-tags">
        ${(job.tags||[]).map(t=>`<span class="tag">${t}</span>`).join('')}
        ${job.remote?'<span class="tag green">Remote OK</span>':''}
        ${job.urgent?'<span class="tag orange">Urgent</span>':''}
      </div>
      <div style="margin:16px 0;font-size:14px;color:var(--text-secondary);line-height:1.7">
        ${job.desc||'<em>No description provided.</em>'}
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${!isEmployer ? `
        <button class="btn btn-primary" id="modal-apply-btn"
          onclick="applyJob('${job.id}', this)" ${isApplied?'disabled':''}>
          ${isApplied?'✓ Applied':'Apply Now →'}
        </button>
        <button class="btn btn-outline" id="modal-save-btn"
          onclick="toggleBookmarkModal('${job.id}',this)">
          ${isBookmarked?'🔖 Saved':'🔖 Save Job'}
        </button>
        ` : ''}
        <button class="btn btn-outline" onclick="findSimilarJobs('${job.title}')">🤖 Find Similar</button>
      </div>
    </div>`;
  document.getElementById('job-detail-modal')?.classList.add('open');
}

function closeJobDetail() { document.getElementById('job-detail-modal')?.classList.remove('open'); }

function toggleBookmarkModal(jobId, btn) {
  const isSaved = DB.toggleSave(jobId);
  btn.textContent = isSaved ? '🔖 Saved' : '🔖 Save Job';
  const job = getAllJobs().find(j => j.id === jobId);
  toast(isSaved ? `Saved "${job?.title}"` : 'Removed from saved', isSaved?'success':'info');
  const feedBtn = document.querySelector(`[data-bookmark="${jobId}"]`);
  if (feedBtn) feedBtn.classList.toggle('saved', isSaved);
}

function findSimilarJobs(jobTitle) {
  closeJobDetail();
  if (typeof showPage === 'function') showPage('ai');
  setTimeout(() => {
    const chatInput = document.getElementById('chat-input');
    if (chatInput) { chatInput.value = `Find me jobs similar to "${jobTitle}"`; chatInput.focus(); }
  }, 100);
}

/* ──────────────────────────────────────────────
   9. JOB FEED
────────────────────────────────────────────── */
function renderJobFeed(jobsList) {
  const feedGrid = document.getElementById('job-feed-grid');
  const jobCount = document.getElementById('job-count');
  if (!feedGrid) return;
  if (jobCount) jobCount.textContent = jobsList.length;
  if (!jobsList.length) {
    feedGrid.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><h3>No jobs found</h3><p>Try different keywords or category filters</p></div>';
    return;
  }
  feedGrid.innerHTML = jobsList.map(job => buildJobCardHTML(job)).join('');
  jobsList.forEach(job => {
    if (DB.isSaved(job.id)) {
      const b = feedGrid.querySelector(`[data-bookmark="${job.id}"]`);
      if (b) b.classList.add('saved');
    }
    if (DB.hasApplied(job.id)) {
      const a = feedGrid.querySelector(`[data-apply="${job.id}"]`);
      if (a) { a.textContent = '✓ Applied'; a.classList.add('applied'); a.disabled = true; }
    }
  });
}

function buildJobCardHTML(job) {
  const user = AppState.currentUser;
  const isEmployer = user && user.role === 'employer';
  return `
  <div class="job-card" onclick="openJobDetail('${job.id}')">
    <div class="job-card-top">
      <div class="company-logo">${job.emoji||'🏢'}</div>
      ${!isEmployer ? `<button class="job-bookmark ${DB.isSaved(job.id)?'saved':''}" data-bookmark="${job.id}"
        onclick="event.stopPropagation();toggleBookmark('${job.id}',this)">🔖</button>` : ''}
    </div>
    <div class="job-title">${job.title}</div>
    <div class="company-name">${job.company||''}</div>
    <div class="job-meta">
      <span class="job-meta-item">📍 ${job.location}</span>
      <span class="job-meta-item">⏰ ${job.type}</span>
    </div>
    <div class="job-tags">
      ${(job.tags||[]).slice(0,3).map(t=>`<span class="tag">${t}</span>`).join('')}
      ${job.remote?'<span class="tag green">Remote OK</span>':''}
      ${job.urgent?'<span class="tag orange">Urgent</span>':''}
    </div>
    <div class="job-footer">
      <div class="salary">Rs ${formatSalary(job.salaryMin)}–${formatSalary(job.salaryMax)} <span>/month</span></div>
      ${!isEmployer ? `<button class="apply-btn ${DB.hasApplied(job.id)?'applied':''}" data-apply="${job.id}"
        onclick="event.stopPropagation();applyJob('${job.id}',this)"
        ${DB.hasApplied(job.id)?'disabled':''}>
        ${DB.hasApplied(job.id)?'✓ Applied':'Apply Now →'}
      </button>` : `<span class="tag">View Only</span>`}
    </div>
  </div>`;
}

function formatSalary(n) { if(!n)return'?'; return n>=1000?Math.round(n/1000)+'K':n; }

function filterAndRender() {
  let jobs = getAllJobs();
  if (AppState.activeCategory !== 'all') jobs = jobs.filter(j => j.category === AppState.activeCategory);
  if (AppState.searchQuery) {
    const q = AppState.searchQuery.toLowerCase();
    jobs = jobs.filter(j =>
      j.title.toLowerCase().includes(q) ||
      (j.company||'').toLowerCase().includes(q) ||
      (j.tags||[]).some(t => t.toLowerCase().includes(q)) ||
      j.location.toLowerCase().includes(q)
    );
  }
  renderJobFeed(jobs);
}

function setCategory(cat, chip) {
  AppState.activeCategory = cat;
  document.querySelectorAll('.category-chip,.chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  filterAndRender();
}

function toggleBookmark(jobId, btn) {
  const saved = DB.toggleSave(jobId);
  btn.classList.toggle('saved', saved);
  const job = getAllJobs().find(j => j.id === jobId);
  toast(saved?`Saved "${job?.title}"`:'Removed from saved', saved?'success':'info');
  updateSidebarBadges();
}

function applyJob(jobId, btn) {
  if (!AppState.currentUser) { toast('Please sign in to apply','warning'); openAuth('login'); return; }
  if (AppState.currentUser.role === 'employer') { toast('Employers cannot apply for jobs','warning'); return; }
  if (DB.hasApplied(jobId)) return;
  const job = getAllJobs().find(j => j.id === jobId);
  if (btn) { btn.textContent = 'Applying...'; btn.disabled = true; }
  setTimeout(() => {
    DB.addApp({ jobId, userId: AppState.currentUser.id, appliedAt: Date.now(), status:'reviewing' });
    if (btn) { btn.textContent = '✓ Applied'; btn.classList.add('applied'); }
    toast(`Applied to "${job?.title}" successfully! 🎉`,'success');
    updateSidebarBadges();
  }, 800);
}

function updateSidebarBadges() {
  const saved    = DB.getSaved().length;
  const applied  = DB.getApps().length;
  document.querySelectorAll('#sb-saved-count').forEach(el => el.textContent = saved);
  document.querySelectorAll('#sb-applied-count').forEach(el => el.textContent = applied);
}

/* ──────────────────────────────────────────────
   10. APPLIED JOBS PAGE
────────────────────────────────────────────── */
function renderAppliedJobs() {
  const list = document.getElementById('applied-jobs-list');
  if (!list) return;
  const apps = DB.getApps();
  if (!AppState.currentUser || !apps.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><h3>No applications yet</h3><p>Apply to jobs and track your progress here</p><button class="btn btn-primary" style="margin-top:16px" onclick="window.location.href='index.html'">Find Jobs</button></div>`;
    return;
  }
  const statuses   = ['reviewing','shortlisted','interviewed'];
  const colorMap   = { reviewing:'reviewing', shortlisted:'active', interviewed:'active', offered:'active', rejected:'closed' };
  list.innerHTML = apps.map(app => {
    const job = getAllJobs().find(j => j.id === app.jobId) || { title:'Unknown Job', company:'Unknown Company', emoji:'🏢' };
    const sk  = statuses[Math.floor(Math.random()*statuses.length)];
    const dt  = new Date(app.appliedAt).toLocaleDateString('en-PK',{day:'numeric',month:'short',year:'numeric'});
    return `
    <div class="card mb-16" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
      <div class="company-logo" style="flex-shrink:0">${job.emoji}</div>
      <div style="flex:1;min-width:160px">
        <div class="job-title" style="font-size:14.5px">${job.title}</div>
        <div class="company-name">${job.company}</div>
        <div class="job-meta" style="margin-top:6px"><span class="job-meta-item">📅 Applied ${dt}</span></div>
      </div>
      <span class="status-badge ${colorMap[sk]||'reviewing'}">● ${sk.charAt(0).toUpperCase()+sk.slice(1)}</span>
      <button class="btn btn-outline btn-sm" onclick="openJobDetail('${app.jobId}')">View Job</button>
    </div>`;
  }).join('');
}

/* ──────────────────────────────────────────────
   11. SAVED JOBS PAGE
────────────────────────────────────────────── */
function renderSavedJobs() {
  const grid = document.getElementById('saved-jobs-grid');
  if (!grid) return;
  const saved = getAllJobs().filter(j => DB.isSaved(j.id));
  if (!saved.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">🔖</div><h3>No saved jobs yet</h3><p>Browse jobs and click the bookmark icon to save them here</p><button class="btn btn-primary" style="margin-top:16px" onclick="window.location.href='index.html'">Browse Jobs</button></div>`;
    return;
  }
  grid.innerHTML = saved.map(job => buildJobCardHTML(job)).join('');
}

/* ──────────────────────────────────────────────
   12. TABS
────────────────────────────────────────────── */
function switchTab(tabId) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const panel = document.getElementById(tabId);
  const btn   = document.getElementById(tabId+'-btn');
  if (panel) panel.classList.add('active');
  if (btn)   btn.classList.add('active');
  if (tabId === 'tab-jobs' && typeof renderPostedJobsTable === 'function') renderPostedJobsTable();
  if (tabId === 'tab-apps' && typeof renderApplicantsTable === 'function') renderApplicantsTable();
}

function renderApplicantsTable() {
  const tbody = document.getElementById('applicants-tbody');
  if (!tbody) return;
  const rows = DB.getPostedJobs().flatMap(job =>
    DB.getApps().filter(a => a.jobId === job.id).map(a => ({
      name: AppState.currentUser?.name || 'Applicant',
      job:  job.title,
      match: 80 + Math.floor(Math.random()*18),
      date: new Date(a.appliedAt).toLocaleDateString('en-PK',{day:'numeric',month:'short'})
    }))
  );
  tbody.querySelectorAll('tr.dyn').forEach(r => r.remove());
  rows.forEach(r => {
    const tr = document.createElement('tr');
    tr.className = 'dyn';
    tr.innerHTML = `
      <td><div class="applicant-name"><div class="applicant-av">${r.name.slice(0,2).toUpperCase()}</div><div><div style="font-weight:600">${r.name}</div></div></div></td>
      <td>${r.job}</td><td><strong style="color:var(--success)">${r.match}%</strong></td>
      <td>${r.date}</td>
      <td><span class="status-badge reviewing">● Reviewing</span></td>
      <td><button class="btn btn-outline btn-sm">View CV</button></td>`;
    tbody.insertBefore(tr, tbody.firstChild);
  });
}

/* ──────────────────────────────────────────────
   13. HERO SEARCH
────────────────────────────────────────────── */
function heroSearch() {
  const val = document.getElementById('hero-search-input')?.value.trim();
  if (val) { AppState.searchQuery = val; filterAndRender(); toast(`Showing results for "${val}"`,'info'); }
}

/* ──────────────────────────────────────────────
   14. initCommon()
────────────────────────────────────────────── */
function initCommon() {
  if (!AppState.currentUser) {
    AppState.currentUser = DB.getSession();
  }
  updateAuthUI();
  updateSidebarBadges();

  document.addEventListener('click', e => {
    if (!e.target.closest('.nav-user-menu')) closeDropdown();
  });

  document.querySelectorAll('.modal-overlay').forEach(el => {
    el.addEventListener('click', e => { if (e.target === el) el.classList.remove('open'); });
  });

  console.log('TalentBridge page ready ✅ | user:', AppState.currentUser?.name || 'guest');
}

/* ──────────────────────────────────────────────
   15. DOMContentLoaded
────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initCommon();

  if (document.getElementById('job-feed-grid')) {
    filterAndRender();

    const mainSearch = document.getElementById('main-search');
    if (mainSearch) mainSearch.addEventListener('input', e => { AppState.searchQuery = e.target.value; filterAndRender(); });

    const sortSel = document.getElementById('sort-select');
    if (sortSel) sortSel.addEventListener('change', e => {
      let jobs = getAllJobs();
      if (AppState.activeCategory !== 'all') jobs = jobs.filter(j => j.category === AppState.activeCategory);
      if (e.target.value === 'salary-high') jobs.sort((a,b)=>(b.salaryMax||0)-(a.salaryMax||0));
      if (e.target.value === 'salary-low')  jobs.sort((a,b)=>(a.salaryMin||0)-(b.salaryMin||0));
      renderJobFeed(jobs);
    });

    const heroInput = document.getElementById('hero-search-input');
    if (heroInput) heroInput.addEventListener('keydown', e => { if(e.key==='Enter') heroSearch(); });
  }

  if (document.getElementById('template-selector') && typeof renderTemplateSelector === 'function') {
    renderTemplateSelector();
    document.querySelectorAll('[data-cv-field]').forEach(f => f.addEventListener('input', updatePreview));
  }

  if (document.getElementById('emp-stat-jobs') && typeof refreshEmployerStats === 'function') {
    refreshEmployerStats();
  }
});
