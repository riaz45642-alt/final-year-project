                                       //BACKEND
const DB = {
  _get(key) {
    try { return JSON.parse(localStorage.getItem('tb_' + key)) || null; }
    catch { return null; }
  },
  _set(key, val) { localStorage.setItem('tb_' + key, JSON.stringify(val)); },

  // Users table
  getUsers()        { return this._get('users') || []; },
  saveUsers(users)  { this._set('users', users); },
  addUser(user)     { const allUsers = this.getUsers(); allUsers.push(user); this.saveUsers(allUsers); },
  getUserByEmail(email) { return this.getUsers().find(u => u.email === email) || null; },

  // Session
  getSession()      { return this._get('session'); },
  setSession(user)  { this._set('session', user); },
  clearSession()    { localStorage.removeItem('tb_session'); },

  // Saved jobs
  getSaved()        { return this._get('saved') || []; },
  toggleSave(jobId) {
    let savedList = this.getSaved();
    if (savedList.includes(jobId)) savedList = savedList.filter(id => id !== jobId);
    else savedList.push(jobId);
    this._set('saved', savedList);
    return savedList.includes(jobId);
  },
  isSaved(jobId)    { return this.getSaved().includes(jobId); },

  // Applications
  getApps()         { return this._get('apps') || []; },
  addApp(app)       { const allApps = this.getApps(); allApps.push(app); this._set('apps', allApps); },
  hasApplied(jobId) { return this.getApps().some(app => app.jobId === jobId); },

  // Posted jobs (employer)
  getPostedJobs()   { return this._get('posted') || []; },
  addPostedJob(job) { const postedList = this.getPostedJobs(); postedList.push(job); this._set('posted', postedList); },

  // Chat history
  getChat()         { return this._get('chat') || []; },
  addChat(message)  { const chatLog = this.getChat(); chatLog.push(message); this._set('chat', chatLog); },
  clearChat()       { this._set('chat', []); },
};

/* Seed demo accounts if none exist */
(function seedDemoAccounts() {
  if (!DB.getUserByEmail('demo@employer.com')) {
    DB.addUser({ id: 'u_demo_emp', name: 'TechNova HR', email: 'demo@employer.com', password: 'demo123', role: 'employer', avatar: 'TH', joinedAt: Date.now() });
  }
  if (!DB.getUserByEmail('ahmed@talentbridge.com')) {
    DB.addUser({ id: 'u_demo_seeker', name: 'Ahmed Khan', email: 'ahmed@talentbridge.com', password: 'ahmed123', role: 'seeker', avatar: 'AK', joinedAt: Date.now() });
  }
})();

/* ──────────────────────────────────────────────
   2. JOBS DATA (in-memory + DB posted jobs)
────────────────────────────────────────────── */
const STATIC_JOBS = [
];

function getAllJobs() {
  const postedJobs = DB.getPostedJobs().map(job => ({ ...job, id: job.id || 'pj_' + job.postedAt, posted: 'Just posted' }));
  return [...postedJobs, ...STATIC_JOBS];
}

/* ──────────────────────────────────────────────
   3. APP STATE
────────────────────────────────────────────── */
const AppState = {
  currentPage: 'home',
  currentUser: DB.getSession(),
  activeCategory: 'all',
  searchQuery: '',
  selectedTemplate: 'blue',
  chatHistory: [],
};

/* ──────────────────────────────────────────────
   4. TOAST NOTIFICATIONS
────────────────────────────────────────────── */
function toast(message, type = 'info', duration = 3000) {
  const iconMap = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const container = document.getElementById('toast-container');
  const toastEl = document.createElement('div');
  toastEl.className = `toast ${type}`;
  toastEl.innerHTML = `<span>${iconMap[type]}</span><span>${message}</span>`;
  container.appendChild(toastEl);
  setTimeout(() => {
    toastEl.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toastEl.remove(), 300);
  }, duration);
}

/* ──────────────────────────────────────────────
   5. AUTH SYSTEM
────────────────────────────────────────────── */
let authMode = 'login'; // 'login' | 'signup'

function openAuth(mode = 'login') {
  authMode = mode;
  renderAuthModal(mode);
  document.getElementById('auth-modal').classList.add('open');
}
function closeAuth() { document.getElementById('auth-modal').classList.remove('open'); }

function renderAuthModal(mode) {
  const modalBox = document.getElementById('auth-modal-box');
  if (mode === 'login') {
    modalBox.innerHTML = `
      <button class="modal-close" onclick="closeAuth()">✕</button>
      <div class="auth-logo"><div class="logo">Talent<span>Bridge</span></div></div>
      <div class="auth-title">Welcome back</div>
      <div class="auth-subtitle">Sign in to your account to continue</div>
      <button class="social-btn" onclick="socialLogin('google')">🔵 Continue with Google</button>
      <button class="social-btn" onclick="socialLogin('linkedin')">💼 Continue with LinkedIn</button>
      <div class="divider"><span>or sign in with email</span></div>
      <div class="input-group" id="login-email-grp">
        <label>Email address</label>
        <input type="email" id="login-email" placeholder="you@example.com">
        <div class="error-msg" id="login-email-err">Please enter a valid email</div>
      </div>
      <div class="input-group" id="login-pass-grp">
        <label>Password</label>
        <input type="password" id="login-pass" placeholder="••••••••">
        <div class="error-msg" id="login-pass-err">Password is required</div>
      </div>
      <div style="text-align:right;margin-bottom:14px">
        <span class="auth-link" style="font-size:13px" onclick="toast('Password reset link sent to your email!','info')">Forgot password?</span>
      </div>
      <button class="btn btn-primary btn-full" id="login-submit-btn" onclick="handleLogin()">Sign In</button>
      <div class="form-toggle-row">No account? <span class="auth-link" onclick="renderAuthModal('signup')">Create one free</span></div>
      <div style="margin-top:10px;text-align:center;font-size:12px;color:var(--text-muted)">
        Demo: ahmed@talentbridge.com / ahmed123
      </div>`;
  } else {
    modalBox.innerHTML = `
      <button class="modal-close" onclick="closeAuth()">✕</button>
      <div class="auth-logo"><div class="logo">Talent<span>Bridge</span></div></div>
      <div class="auth-title">Create your account</div>
      <div class="auth-subtitle">Join thousands of job seekers and employers</div>
      <button class="social-btn" onclick="socialLogin('google')">🔵 Continue with Google</button>
      <div class="divider"><span>or sign up with email</span></div>
      <div class="input-row">
        <div class="input-group"><label>First Name</label><input type="text" id="reg-fname" placeholder="Ahmed"></div>
        <div class="input-group"><label>Last Name</label><input type="text" id="reg-lname" placeholder="Khan"></div>
      </div>
      <div class="input-group" id="reg-email-grp">
        <label>Email</label>
        <input type="email" id="reg-email" placeholder="you@example.com">
        <div class="error-msg" id="reg-email-err">Valid email required</div>
      </div>
      <div class="input-group" id="reg-pass-grp">
        <label>Password</label>
        <input type="password" id="reg-pass" placeholder="Minimum 6 characters">
        <div class="error-msg" id="reg-pass-err">Password must be at least 6 characters</div>
      </div>
      <div class="input-group">
        <label>I am a</label>
        <select id="reg-role">
          <option value="seeker">Job Seeker</option>
          <option value="employer">Employer / Recruiter</option>
        </select>
      </div>
      <button class="btn btn-primary btn-full" id="reg-submit-btn" onclick="handleSignup()">Create Account</button>
      <div class="form-toggle-row">Have an account? <span class="auth-link" onclick="renderAuthModal('login')">Sign in</span></div>`;
  }
}

function socialLogin(provider) {
  const btn = event.target;
  btn.textContent = 'Connecting...';
  btn.disabled = true;
  setTimeout(() => {
    const socialUser = {
      id: 'social_' + Date.now(),
      name: provider === 'google' ? 'Google User' : 'LinkedIn User',
      email: provider + '@social.com',
      role: 'seeker',
      avatar: provider === 'google' ? 'GU' : 'LU'
    };
    DB.setSession(socialUser);
    AppState.currentUser = socialUser;
    closeAuth();
    updateAuthUI();
    toast(`Signed in with ${provider === 'google' ? 'Google' : 'LinkedIn'}!`, 'success');
  }, 1200);
}

function handleLogin() {
  const emailInput = document.getElementById('login-email').value.trim();
  const passwordInput = document.getElementById('login-pass').value;
  let isValid = true;

  if (!emailInput || !/\S+@\S+\.\S+/.test(emailInput)) {
    document.getElementById('login-email-grp').classList.add('has-error');
    isValid = false;
  } else {
    document.getElementById('login-email-grp').classList.remove('has-error');
  }
  if (!passwordInput) {
    document.getElementById('login-pass-grp').classList.add('has-error');
    isValid = false;
  } else {
    document.getElementById('login-pass-grp').classList.remove('has-error');
  }
  if (!isValid) return;

  const submitBtn = document.getElementById('login-submit-btn');
  submitBtn.classList.add('btn-loading');
  submitBtn.textContent = '';
  submitBtn.disabled = true;

  setTimeout(() => {
    const matchedUser = DB.getUserByEmail(emailInput);
    submitBtn.classList.remove('btn-loading');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign In';
    if (!matchedUser || matchedUser.password !== passwordInput) {
      document.getElementById('login-pass-grp').classList.add('has-error');
      document.getElementById('login-pass-err').textContent = 'Incorrect email or password';
      toast('Invalid credentials', 'error');
      return;
    }
    DB.setSession(matchedUser);
    AppState.currentUser = matchedUser;
    closeAuth();
    updateAuthUI();
    toast(`Welcome back, ${matchedUser.name.split(' ')[0]}! 👋`, 'success');
    if (matchedUser.role === 'employer') showPage('employer');
  }, 900);
}

function handleSignup() {
  const firstName  = (document.getElementById('reg-fname')?.value || '').trim();
  const lastName   = (document.getElementById('reg-lname')?.value || '').trim();
  const email      = (document.getElementById('reg-email')?.value || '').trim();
  const password   = document.getElementById('reg-pass')?.value || '';
  const role       = document.getElementById('reg-role')?.value || 'seeker';
  let isValid = true;

  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    document.getElementById('reg-email-grp').classList.add('has-error');
    isValid = false;
  } else { document.getElementById('reg-email-grp').classList.remove('has-error'); }
  if (password.length < 6) {
    document.getElementById('reg-pass-grp').classList.add('has-error');
    isValid = false;
  } else { document.getElementById('reg-pass-grp').classList.remove('has-error'); }
  if (!isValid) return;

  if (DB.getUserByEmail(email)) {
    document.getElementById('reg-email-grp').classList.add('has-error');
    document.getElementById('reg-email-err').textContent = 'This email is already registered';
    return;
  }

  const submitBtn = document.getElementById('reg-submit-btn');
  submitBtn.classList.add('btn-loading'); submitBtn.textContent = ''; submitBtn.disabled = true;

  setTimeout(() => {
    const initials = ((firstName[0] || '') + (lastName[0] || '')).toUpperCase() || 'U';
    const newUser = {
      id: 'u_' + Date.now(),
      name: (firstName + ' ' + lastName).trim() || 'New User',
      email, password, role,
      avatar: initials,
      joinedAt: Date.now()
    };
    DB.addUser(newUser);
    DB.setSession(newUser);
    AppState.currentUser = newUser;
    closeAuth();
    updateAuthUI();
    toast(`Account created! Welcome, ${newUser.name.split(' ')[0]}! 🎉`, 'success');
    if (role === 'employer') showPage('employer');
    else showPage('profile');
  }, 900);
}

function logout() {
  DB.clearSession();
  AppState.currentUser = null;
  updateAuthUI();
  showPage('home');
  closeDropdown();
  toast('You have been logged out.', 'info');
}

function updateAuthUI() {
  const currentUser = AppState.currentUser;
  const loggedOutEl  = document.getElementById('nav-logged-out');
  const loggedInEl   = document.getElementById('nav-logged-in');
  const sidebarUserBlock = document.getElementById('sidebar-user-block');

  if (currentUser) {
    loggedOutEl.classList.add('hidden');
    loggedInEl.classList.remove('hidden');
    document.getElementById('nav-avatar-initials').textContent = currentUser.avatar || currentUser.name.slice(0,2).toUpperCase();
    if (sidebarUserBlock) {
      document.getElementById('sb-avatar').textContent = currentUser.avatar || currentUser.name.slice(0,2).toUpperCase();
      document.getElementById('sb-name').textContent = currentUser.name;
      document.getElementById('sb-role').textContent = currentUser.role === 'employer' ? 'Employer' : 'Job Seeker';
      sidebarUserBlock.classList.remove('hidden');
    }
    document.getElementById('prof-name').textContent = currentUser.name;
    document.getElementById('prof-title-sub').textContent = currentUser.role === 'employer' ? 'Employer Account' : 'Job Seeker';
    document.getElementById('prof-avatar').textContent = currentUser.avatar || currentUser.name.slice(0,2).toUpperCase();
  } else {
    loggedOutEl.classList.remove('hidden');
    loggedInEl.classList.add('hidden');
    if (sidebarUserBlock) sidebarUserBlock.classList.add('hidden');
  }
}

/* ──────────────────────────────────────────────
   6. NAVIGATION
────────────────────────────────────────────── */
function showPage(pageId) {
  // If SPA pages exist hi nahi → skip (for Employer_dashboard.html)
  if (!document.querySelector('.page')) return;

  document.querySelectorAll('.page').forEach(page =>
    page.classList.remove('active')
  );

  const targetPage = document.getElementById('page-' + pageId);
  if (targetPage) targetPage.classList.add('active');

  AppState.currentPage = pageId;

  // Update sidebar active state
  document.querySelectorAll('.sidebar-nav-item').forEach(item => item.classList.remove('active'));
  const activeSidebarItem = document.querySelector(`.sidebar-nav-item[data-page="${pageId}"]`);
  if (activeSidebarItem) activeSidebarItem.classList.add('active');

  // Update top nav buttons
  document.querySelectorAll('.nav-link-btn[data-page]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === pageId);
  });

  // Update mobile bottom nav
  document.querySelectorAll('.mobile-bottom-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === pageId);
  });

  // Page-specific data refresh
  if (pageId === 'saved')    renderSavedJobs();
  if (pageId === 'applied')  renderAppliedJobs();
  if (pageId === 'employer') refreshEmployerStats();
}

function navTo(pageId) {
  // Agar SPA pages hain → internal navigation
  if (document.querySelector('.page')) {
    showPage(pageId);
    window.scrollTo(0, 0);
    return;
  }

  // Otherwise external pages
  if (pageId === 'employer') {
    window.location.href = 'Employer_dashboard.html';
  }
}

/* ──────────────────────────────────────────────
   6b. MOBILE SIDEBAR
────────────────────────────────────────────── */
function toggleMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('mobile-sidebar-overlay');
  const hamburger = document.getElementById('mobile-menu-toggle');
  const isOpen = sidebar.classList.contains('mobile-open');
  if (isOpen) {
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('visible');
    hamburger.classList.remove('open');
  } else {
    sidebar.classList.add('mobile-open');
    overlay.classList.add('visible');
    hamburger.classList.add('open');
  }
}

function closeMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('mobile-sidebar-overlay');
  const hamburger = document.getElementById('mobile-menu-toggle');
  sidebar.classList.remove('mobile-open');
  overlay.classList.remove('visible');
  hamburger.classList.remove('open');
}

/* ──────────────────────────────────────────────
   7. JOB FEED & SEARCH
────────────────────────────────────────────── */
function renderJobFeed(jobsList) {
  const feedGrid  = document.getElementById('job-feed-grid');
  const jobCount  = document.getElementById('job-count');
  if (!feedGrid) return;
  jobCount.textContent = jobsList.length;
  if (!jobsList.length) {
    feedGrid.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><h3>No jobs found</h3><p>Try different keywords or category filters</p></div>';
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
      if (applyBtn) { applyBtn.textContent = '✓ Applied'; applyBtn.classList.add('applied'); applyBtn.disabled = true; }
    }
  });
}

function buildJobCardHTML(job) {
  return `
  <div class="job-card" onclick="openJobDetail('${job.id}')">
    <div class="job-card-top">
      <div class="company-logo">${job.emoji || '🏢'}</div>
      <button class="job-bookmark ${DB.isSaved(job.id) ? 'saved' : ''}" data-bookmark="${job.id}"
        onclick="event.stopPropagation();toggleBookmark('${job.id}',this)">🔖</button>
    </div>
    <div class="job-title">${job.title}</div>
    <div class="company-name">${job.company}</div>
    <div class="job-meta">
      <span class="job-meta-item">📍 ${job.location}</span>
      <span class="job-meta-item">⏰ ${job.type}</span>
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
        ${DB.hasApplied(job.id) ? '✓ Applied' : 'Apply Now →'}
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
    applyBtn.textContent = '✓ Applied';
    applyBtn.classList.add('applied');
    toast(`Applied to "${job?.title}" successfully! 🎉`, 'success');
    const appliedCount = DB.getApps().length;
    document.querySelectorAll('.sidebar-badge[data-for="applied"], .badge[data-for="applied"]').forEach(badge => badge.textContent = appliedCount);
  }, 800);
}

/* ──────────────────────────────────────────────
   8. JOB DETAIL MODAL
────────────────────────────────────────────── */
function openJobDetail(jobId) {
  const job = getAllJobs().find(j => j.id === jobId);
  if (!job) return;
  const modalBox    = document.getElementById('job-detail-box');
  const isApplied   = DB.hasApplied(jobId);
  const isBookmarked = DB.isSaved(jobId);
  modalBox.innerHTML = `
    <button class="modal-close" onclick="closeJobDetail()">✕</button>
    <div class="job-detail-content">
      <div class="job-detail-header">
        <div class="job-detail-logo">${job.emoji || '🏢'}</div>
        <div style="flex:1">
          <div class="job-detail-title">${job.title}</div>
          <div style="font-size:14px;color:var(--text-secondary);margin-top:4px">${job.company}</div>
          <div class="job-meta" style="margin-top:8px">
            <span class="job-meta-item">📍 ${job.location}</span>
            <span class="job-meta-item">⏰ ${job.type}</span>
            <span class="job-meta-item">🕐 ${job.posted || 'Recently'}</span>
          </div>
          <div style="margin-top:8px">
            <span class="salary">Rs ${formatSalary(job.salaryMin)}–${formatSalary(job.salaryMax)} <span>/month</span></span>
          </div>
        </div>
      </div>
      <div class="job-tags">
        ${(job.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
        ${job.remote ? '<span class="tag green">Remote OK</span>' : ''}
        ${job.urgent ? '<span class="tag orange">Urgent</span>' : ''}
      </div>
      <div class="desc-section">
        <h4>Job Description</h4>
        <p>${job.desc || 'Exciting opportunity to join our growing team.'}</p>
      </div>
      ${(job.requirements || []).length ? `
      <div class="desc-section" style="margin-top:14px">
        <h4>Requirements</h4>
        <ul>${(job.requirements || []).map(req => `<li>${req}</li>`).join('')}</ul>
      </div>` : ''}
      <div class="job-detail-actions">
        <button class="btn btn-primary ${isApplied ? 'applied' : ''}" onclick="applyJobFromDetail('${jobId}')" id="detail-apply-btn" ${isApplied ? 'disabled' : ''}>
          ${isApplied ? '✓ Already Applied' : '🚀 Apply Now'}
        </button>
        <button class="btn btn-outline" onclick="toggleBookmarkDetail('${jobId}',this)" id="detail-save-btn">
          ${isBookmarked ? '🔖 Saved' : '🔖 Save Job'}
        </button>
        <button class="btn btn-outline" onclick="fillChatFromJob('${job.title}')">🤖 AI Match</button>
      </div>
    </div>`;
  document.getElementById('job-detail-modal').classList.add('open');
}

function closeJobDetail() { document.getElementById('job-detail-modal').classList.remove('open'); }

function applyJobFromDetail(jobId) {
  if (!AppState.currentUser) { toast('Please sign in to apply', 'warning'); openAuth('login'); return; }
  if (DB.hasApplied(jobId)) return;
  const applyBtn = document.getElementById('detail-apply-btn');
  const job = getAllJobs().find(j => j.id === jobId);
  applyBtn.textContent = 'Applying...'; applyBtn.disabled = true;
  setTimeout(() => {
    DB.addApp({ jobId, userId: AppState.currentUser.id, appliedAt: Date.now(), status: 'reviewing' });
    applyBtn.textContent = '✓ Applied'; applyBtn.classList.add('applied');
    toast(`Applied to "${job?.title}"! 🎉`, 'success');
    filterAndRender();
  }, 800);
}

function toggleBookmarkDetail(jobId, btn) {
  const isSaved = DB.toggleSave(jobId);
  btn.textContent = isSaved ? '🔖 Saved' : '🔖 Save Job';
  toast(isSaved ? 'Job saved!' : 'Removed from saved', isSaved ? 'success' : 'info');
  filterAndRender();
}

function fillChatFromJob(jobTitle) {
  closeJobDetail();
  showPage('ai');
  setTimeout(() => {
    const chatInput = document.getElementById('chat-input');
    if (chatInput) { chatInput.value = `Find me jobs similar to "${jobTitle}"`; chatInput.focus(); }
  }, 100);
}

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

/* ──────────────────────────────────────────────
   11. CV GENERATOR
────────────────────────────────────────────── */
const CV_TEMPLATES = [
  { id: 'blue',    name: 'Blue Pro',  headerBg: '#4f6ef7', accentColor: '#4f6ef7', sectionBg: '#e8edff' },
  { id: 'classic', name: 'Classic',   headerBg: '#1a1a2e', accentColor: '#1a1a2e', sectionBg: '#f0f0f0' },
  { id: 'green',   name: 'Emerald',   headerBg: '#0d9e75', accentColor: '#0d9e75', sectionBg: '#e1f5ee' },
  { id: 'purple',  name: 'Purple',    headerBg: '#6c4ef7', accentColor: '#6c4ef7', sectionBg: '#ede8ff' },
  { id: 'minimal', name: 'Minimal',   headerBg: '#fff',    accentColor: '#1a1a2e', sectionBg: '#f5f6fa' },
];

function renderTemplateSelector() {
  const templateGrid = document.getElementById('template-selector');
  if (!templateGrid) return;
  templateGrid.innerHTML = CV_TEMPLATES.map(tpl => `
    <div class="template-thumb ${AppState.selectedTemplate === tpl.id ? 'selected' : ''}" onclick="selectTemplate('${tpl.id}')" title="${tpl.name}">
      <div class="t-preview">
        <div class="t-header" style="background:${tpl.headerBg};border-radius:2px"></div>
        <div class="t-line" style="margin-top:5px;background:rgba(0,0,0,0.12)"></div>
        <div class="t-line short" style="background:rgba(0,0,0,0.08)"></div>
        <div class="t-section-h" style="background:${tpl.accentColor};opacity:0.5"></div>
        <div class="t-dot-line"><div class="t-dot" style="background:${tpl.accentColor}"></div><div class="t-line" style="flex:1;background:rgba(0,0,0,0.08)"></div></div>
        <div class="t-dot-line"><div class="t-dot" style="background:${tpl.accentColor}"></div><div class="t-line short" style="flex:1;background:rgba(0,0,0,0.06)"></div></div>
        <div class="t-section-h" style="background:${tpl.accentColor};opacity:0.5"></div>
        <div class="t-dot-line"><div class="t-dot" style="background:${tpl.accentColor}"></div><div class="t-line" style="flex:1;background:rgba(0,0,0,0.08)"></div></div>
      </div>
      <div class="t-check">✓</div>
      <div class="t-label">${tpl.name}</div>
    </div>`).join('');
}

function selectTemplate(templateId) {
  AppState.selectedTemplate = templateId;
  renderTemplateSelector();
  const selectedTpl = CV_TEMPLATES.find(t => t.id === templateId);
  const previewPanel = document.getElementById('cv-preview-panel');
  if (previewPanel && selectedTpl) {
    previewPanel.className = `cv-preview tpl-${templateId}`;
  }
  toast(`Template "${selectedTpl?.name}" selected`, 'info');
  updatePreview();
}

function updatePreview() {
  const getVal = id => (document.getElementById(id)?.value || '').trim();
  const firstName   = getVal('cv-fname');
  const lastName    = getVal('cv-lname');
  const jobTitle    = getVal('cv-job-title');
  const email       = getVal('cv-email');
  const phone       = getVal('cv-phone');
  const location    = getVal('cv-loc');
  const summary     = getVal('cv-summary');
  const skills      = getVal('cv-skills');
  const degree      = getVal('cv-degree');
  const school      = getVal('cv-school');
  const eduYear     = getVal('cv-edu-year');
  const expTitle    = getVal('cv-exp-title');
  const expCompany  = getVal('cv-exp-company');
  const expDuration = getVal('cv-exp-dur');

  const getEl = id => document.getElementById(id);
  if (getEl('prev-name'))      getEl('prev-name').textContent      = (firstName + ' ' + lastName).trim() || 'Your Name';
  if (getEl('prev-job-title')) getEl('prev-job-title').textContent = jobTitle || 'Your Title';
  if (getEl('prev-email'))     getEl('prev-email').textContent     = email || 'email@example.com';
  if (getEl('prev-phone'))     getEl('prev-phone').textContent     = phone || '+92 300 0000000';
  if (getEl('prev-loc'))       getEl('prev-loc').textContent       = location || 'City, Pakistan';
  if (getEl('prev-summary'))   getEl('prev-summary').textContent   = summary || 'Your professional summary will appear here.';
  if (getEl('prev-degree'))    getEl('prev-degree').textContent    = (degree || 'Your Degree') + (school ? ' — ' + school : '') + (eduYear ? ' · ' + eduYear : '');
  if (getEl('prev-exp-title')) getEl('prev-exp-title').textContent = expTitle || 'Your Job Title';
  if (getEl('prev-exp-sub'))   getEl('prev-exp-sub').textContent   = (expCompany || 'Company') + (expDuration ? ' · ' + expDuration : '');

  const skillsContainer = getEl('prev-skills');
  if (skillsContainer) {
    const skillList = skills.split(',').map(s => s.trim()).filter(Boolean);
    skillsContainer.innerHTML = skillList.map(skill => `<span class="cv-skill">${skill}</span>`).join('') || '<span class="cv-skill">Add skills above</span>';
  }
}

function downloadCV() {
  const currentUser = AppState.currentUser;
  if (!currentUser) { toast('Please sign in to download your CV', 'warning'); openAuth('login'); return; }

  const downloadBtn = document.getElementById('download-cv-btn');
  if (downloadBtn) { downloadBtn.textContent = 'Generating PDF...'; downloadBtn.disabled = true; }

  setTimeout(() => {
    const getVal = id => (document.getElementById(id)?.value || '').trim();
    const firstName   = getVal('cv-fname') || 'Your';
    const lastName    = getVal('cv-lname') || 'Name';
    const jobTitle    = getVal('cv-job-title') || 'Professional';
    const email       = getVal('cv-email') || '';
    const phone       = getVal('cv-phone') || '';
    const location    = getVal('cv-loc') || '';
    const summary     = getVal('cv-summary') || '';
    const skills      = getVal('cv-skills') || '';
    const degree      = getVal('cv-degree') || '';
    const school      = getVal('cv-school') || '';
    const eduYear     = getVal('cv-edu-year') || '';
    const expTitle    = getVal('cv-exp-title') || '';
    const expCompany  = getVal('cv-exp-company') || '';
    const expDuration = getVal('cv-exp-dur') || '';
    const expDesc     = getVal('cv-exp-desc') || '';
    const activeTpl   = CV_TEMPLATES.find(t => t.id === AppState.selectedTemplate) || CV_TEMPLATES[0];

    const skillTagList = skills.split(',').map(s => s.trim()).filter(Boolean);
    const headerStyle  = activeTpl.id === 'minimal'
      ? `background:#fff;color:#1a1a2e;border-bottom:3px solid #1a1a2e;`
      : `background:${activeTpl.headerBg};color:white;`;

    const cvHTMLContent = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>${firstName} ${lastName} — CV</title>
<style>
  body{margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#333;}
  .header{padding:28px 32px;${headerStyle}}
  .header h1{margin:0;font-size:22px;letter-spacing:-0.3px;}
  .header .sub{margin:4px 0 0;font-size:13px;opacity:0.85;}
  .header .contact{margin-top:10px;font-size:11px;opacity:0.75;display:flex;gap:18px;flex-wrap:wrap;}
  .body{padding:20px 32px;}
  .section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${activeTpl.accentColor};border-bottom:2px solid ${activeTpl.sectionBg};padding-bottom:4px;margin:18px 0 10px;}
  .section-title:first-child{margin-top:0;}
  .exp-item{margin-bottom:12px;}
  .exp-title{font-weight:700;font-size:12.5px;}
  .exp-sub{font-size:11px;color:#666;margin-top:2px;}
  .exp-desc{font-size:11px;color:#555;margin-top:4px;line-height:1.55;}
  .skills-wrap{display:flex;flex-wrap:wrap;gap:6px;}
  .skill-tag{padding:3px 9px;border-radius:12px;background:${activeTpl.sectionBg};color:${activeTpl.accentColor};font-size:10.5px;font-weight:600;}
  p.summary{font-size:12px;color:#555;line-height:1.65;margin:0;}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
</style></head><body>
<div class="header">
  <h1>${firstName} ${lastName}</h1>
  <div class="sub">${jobTitle}</div>
  <div class="contact">
    ${email ? `<span>${email}</span>` : ''}
    ${phone ? `<span>${phone}</span>` : ''}
    ${location ? `<span>${location}</span>` : ''}
  </div>
</div>
<div class="body">
  ${summary ? `<div class="section-title">Profile Summary</div><p class="summary">${summary}</p>` : ''}
  ${degree  ? `<div class="section-title">Education</div><div class="exp-item"><div class="exp-title">${degree}</div><div class="exp-sub">${school}${eduYear ? ' · ' + eduYear : ''}</div></div>` : ''}
  ${expTitle ? `<div class="section-title">Work Experience</div><div class="exp-item"><div class="exp-title">${expTitle}</div><div class="exp-sub">${expCompany}${expDuration ? ' · ' + expDuration : ''}</div>${expDesc ? `<div class="exp-desc">${expDesc}</div>` : ''}</div>` : ''}
  ${skillTagList.length ? `<div class="section-title">Skills</div><div class="skills-wrap">${skillTagList.map(s => `<span class="skill-tag">${s}</span>`).join('')}</div>` : ''}
</div>
</body></html>`;

    const blob  = new Blob([cvHTMLContent], { type: 'text/html' });
    const url   = URL.createObjectURL(blob);
    const link  = document.createElement('a');
    link.href   = url;
    link.download = `${firstName}_${lastName}_CV.html`;
    link.click();
    URL.revokeObjectURL(url);

    if (downloadBtn) { downloadBtn.textContent = '⬇️ Download CV'; downloadBtn.disabled = false; }
    toast('CV downloaded! Open the file and Print → Save as PDF', 'success', 4000);
  }, 1000);
}

/* ──────────────────────────────────────────────
   12. AI ASSISTANT
────────────────────────────────────────────── */
const AI_RESPONSE_MAP = {
  default: (msg) => {
    const topJobs = getAllJobs().slice(0, 3);
    return { text: `Great! Based on your message, here are some top matches from our portal:`, suggestions: topJobs };
  },
  keywords: {
    'web developer': ()  => ({ text: `Web development is in high demand! Here are the best matches for you:`,           suggestions: getAllJobs().filter(j => j.category === 'tech').slice(0, 3) }),
    'react':         ()  => ({ text: `Excellent React skills! These roles are a great match:`,                          suggestions: getAllJobs().filter(j => (j.tags || []).some(t => t.toLowerCase().includes('react'))).slice(0, 3) }),
    'python':        ()  => ({ text: `Python is one of the hottest skills right now! Check these out:`,                 suggestions: getAllJobs().filter(j => (j.tags || []).some(t => t.toLowerCase().includes('python'))).slice(0, 3) }),
    'doctor':        ()  => ({ text: `Healthcare roles require specialized skills. Here are matching positions:`,       suggestions: getAllJobs().filter(j => j.category === 'medical') }),
    'teacher':       ()  => ({ text: `Teaching opportunities in top institutions — here are the best:`,                 suggestions: getAllJobs().filter(j => j.category === 'teaching') }),
    'design':        ()  => ({ text: `Creative roles for designers — perfect matches for your skills:`,                 suggestions: getAllJobs().filter(j => j.category === 'design') }),
    'civil':         ()  => ({ text: `Civil engineering roles are available across Pakistan:`,                          suggestions: getAllJobs().filter(j => j.category === 'civil') }),
    'finance':       ()  => ({ text: `Finance roles with excellent packages — here's what matched:`,                    suggestions: getAllJobs().filter(j => j.category === 'finance') }),
    'cv':            ()  => ({ text: `Sure! Here are 3 quick tips to boost your CV score:<br><br>✅ <strong>Add a portfolio/GitHub link</strong> — employers love seeing real work<br>✅ <strong>Quantify achievements</strong> — e.g., "Increased performance by 40%"<br>✅ <strong>Certifications</strong> — AWS, React, or Google certs stand out<br><br>Would you like me to auto-generate a professional summary for your CV?`, suggestions: [] }),
    'salary':        ()  => ({ text: `Based on your skills, the average market salary in Pakistan for tech roles ranges from <strong>Rs 120K–250K/month</strong>. Senior developers can earn up to <strong>Rs 400K+</strong>. Want me to filter by salary range?`, suggestions: [] }),
    'remote':        ()  => ({ text: `Here are remote-friendly jobs in our portal that you can work from anywhere:`,    suggestions: getAllJobs().filter(j => j.remote) }),
    'interview':     ()  => ({ text: `🎯 Interview Tips:<br><br>1. Research the company thoroughly<br>2. Prepare STAR method answers<br>3. Have 3 questions ready to ask<br>4. Practice coding challenges on LeetCode<br>5. Dress professionally even for video calls`, suggestions: [] }),
  }
};

function getAIResponse(userMessage) {
  const lowerMessage = userMessage.toLowerCase();
  for (const [keyword, responseFn] of Object.entries(AI_RESPONSE_MAP.keywords)) {
    if (lowerMessage.includes(keyword)) return responseFn(userMessage);
  }
  return AI_RESPONSE_MAP.default(userMessage);
}

function sendMsg() {
  const chatInput = document.getElementById('chat-input');
  const messageText = (chatInput?.value || '').trim();
  if (!messageText) return;

  appendMessage(messageText, 'user');
  chatInput.value = '';
  DB.addChat({ role: 'user', text: messageText, timestamp: Date.now() });

  const typingIndicator = appendTypingIndicator();
  setTimeout(() => {
    typingIndicator.remove();
    const aiResponse = getAIResponse(messageText);
    appendAIMessage(aiResponse.text, aiResponse.suggestions);
    DB.addChat({ role: 'ai', text: aiResponse.text, timestamp: Date.now() });
  }, 900 + Math.random() * 600);
}

function appendMessage(text, role) {
  const messagesList = document.getElementById('chat-messages');
  if (!messagesList) return;
  const userInitials = AppState.currentUser?.avatar || '👤';
  const messageRow   = document.createElement('div');
  messageRow.className = `msg-row ${role === 'user' ? 'user' : ''}`;
  messageRow.innerHTML = role === 'user'
    ? `<div class="msg-avatar user-av">${userInitials}</div><div class="msg-bubble user">${text}</div>`
    : `<div class="msg-avatar ai">🤖</div><div class="msg-bubble ai">${text}</div>`;
  messagesList.appendChild(messageRow);
  messagesList.scrollTop = messagesList.scrollHeight;
  return messageRow;
}

function appendTypingIndicator() {
  const messagesList = document.getElementById('chat-messages');
  const typingRow    = document.createElement('div');
  typingRow.className = 'msg-row';
  typingRow.innerHTML = `<div class="msg-avatar ai">🤖</div><div class="ai-typing"><span></span><span></span><span></span></div>`;
  messagesList.appendChild(typingRow);
  messagesList.scrollTop = messagesList.scrollHeight;
  return typingRow;
}

function appendAIMessage(text, jobSuggestions) {
  const messagesList = document.getElementById('chat-messages');
  const messageRow   = document.createElement('div');
  messageRow.className = 'msg-row';
  const suggestionsHTML = jobSuggestions.map(job => `
    <div class="ai-job-suggestion" onclick="openJobDetail('${job.id}')">
      <div>
        <div class="job-sug-title">${job.title}</div>
        <div class="job-sug-co">${job.company} · ${job.location}</div>
      </div>
      <span class="match-badge">${70 + Math.floor(Math.random() * 28)}% Match</span>
    </div>`).join('');
  messageRow.innerHTML = `<div class="msg-avatar ai">🤖</div><div class="msg-bubble ai">${text}${suggestionsHTML}</div>`;
  messagesList.appendChild(messageRow);
  messagesList.scrollTop = messagesList.scrollHeight;
}

function fillChat(text) {
  const chatInput = document.getElementById('chat-input');
  if (chatInput) { chatInput.value = text.replace(/"/g, ''); chatInput.focus(); }
}

function clearChat() {
  DB.clearChat();
  const messagesList = document.getElementById('chat-messages');
  if (!messagesList) return;
  messagesList.innerHTML = `
  <div class="msg-row">
    <div class="msg-avatar ai">🤖</div>
    <div class="msg-bubble ai">
      👋 Hi! I'm TalentBot. Tell me about your skills or what kind of job you're looking for, and I'll find the best matches from our portal.<br><br>
      <em style="font-size:12.5px;color:var(--text-muted)">Try: "I am a web developer with React experience"</em>
    </div>
  </div>`;
  toast('Chat cleared', 'info');
}

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

/* ──────────────────────────────────────────────
   14. PROFILE EDIT
────────────────────────────────────────────── */
function openEditProfile() {
  if (!AppState.currentUser) { toast('Please sign in first', 'warning'); openAuth(); return; }
  const currentUser = AppState.currentUser;
  document.getElementById('edit-name').value  = currentUser.name  || '';
  document.getElementById('edit-email').value = currentUser.email || '';
  document.getElementById('profile-edit-modal').classList.add('open');
}
function closeEditProfile() { document.getElementById('profile-edit-modal').classList.remove('open'); }

function saveProfile() {
  const newName  = document.getElementById('edit-name').value.trim();
  const newEmail = document.getElementById('edit-email').value.trim();
  if (!newName || !newEmail) { toast('Name and email are required', 'error'); return; }

  const saveBtn = document.getElementById('save-profile-btn');
  saveBtn.textContent = 'Saving...'; saveBtn.disabled = true;
  setTimeout(() => {
    AppState.currentUser.name  = newName;
    AppState.currentUser.email = newEmail;
    AppState.currentUser.avatar = (newName.split(' ').map(word => word[0]).join('').slice(0, 2)).toUpperCase();

    const updatedUsers = DB.getUsers().map(u => u.id === AppState.currentUser.id ? { ...u, name: newName, email: newEmail } : u);
    DB.saveUsers(updatedUsers);
    DB.setSession(AppState.currentUser);
    updateAuthUI();
    closeEditProfile();
    saveBtn.textContent = 'Save Changes'; saveBtn.disabled = false;
    toast('Profile updated successfully!', 'success');
  }, 700);
}

/* ──────────────────────────────────────────────
   15. TABS & NAV HELPERS
────────────────────────────────────────────── */
function switchTab(tabId) {
  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(btn   => btn.classList.remove('active'));
  const targetPanel = document.getElementById(tabId);
  const targetBtn   = document.getElementById(tabId + '-btn');
  if (targetPanel) targetPanel.classList.add('active');
  if (targetBtn)   targetBtn.classList.add('active');
  if (tabId === 'tab-jobs') renderPostedJobsTable();
  if (tabId === 'tab-apps') renderApplicantsTable();
}

function renderApplicantsTable() {
  const tableBody  = document.getElementById('applicants-tbody');
  if (!tableBody) return;
  const myPostedJobs = DB.getPostedJobs();
  const dynamicRows  = myPostedJobs.flatMap(job =>
    DB.getApps().filter(app => app.jobId === job.id).map(app => ({
      name: AppState.currentUser?.name || 'Applicant',
      job:  job.title,
      match: 80 + Math.floor(Math.random() * 18),
      date: new Date(app.appliedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })
    }))
  );
  tableBody.querySelectorAll('tr.dyn').forEach(row => row.remove());
  dynamicRows.forEach(rowData => {
    const tableRow = document.createElement('tr');
    tableRow.className = 'dyn';
    tableRow.innerHTML = `
      <td><div class="applicant-name"><div class="applicant-av">${rowData.name.slice(0, 2).toUpperCase()}</div><div><div style="font-weight:600">${rowData.name}</div></div></div></td>
      <td>${rowData.job}</td>
      <td><strong style="color:var(--success)">${rowData.match}%</strong></td>
      <td>${rowData.date}</td>
      <td><span class="status-badge reviewing">● Reviewing</span></td>
      <td><button class="btn btn-outline btn-sm">View CV</button></td>`;
    tableBody.insertBefore(tableRow, tableBody.firstChild);
  });
}

function openDropdown() {
  document.getElementById('user-dropdown')?.classList.toggle('open');
}
function closeDropdown() {
  document.getElementById('user-dropdown')?.classList.remove('open');
}

/* ──────────────────────────────────────────────
   16. HERO SEARCH
────────────────────────────────────────────── */
function heroSearch() {
  const searchValue = document.getElementById('hero-search-input')?.value.trim();
  if (searchValue) {
    AppState.searchQuery = searchValue;
    filterAndRender();
    showPage('home');
    toast(`Showing results for "${searchValue}"`, 'info');
  }
}

document.addEventListener('DOMContentLoaded', () => {

  // ✅ Check if this is SPA main page (index.html)
  const isMainApp = document.getElementById('job-feed-grid');

  if (!isMainApp) {
    //  Employer_dashboard.html ya simple page
    updateAuthUI();

    // optional safe logs
    console.log('Standalone page loaded (no SPA init needed)');
    return;
  }

  // ✅ ONLY RUN FOR MAIN APP
  filterAndRender();
  renderTemplateSelector();
  updateAuthUI();

  // Render chat history (safe check already exists)
  const savedChatLog = DB.getChat();
  if (savedChatLog.length > 2) {
    const messagesList = document.getElementById('chat-messages');
    if (messagesList) {
      savedChatLog.slice(-6).forEach(msg => {
        if (msg.role === 'user') appendMessage(msg.text, 'user');
        else appendAIMessage(msg.text, []);
      });
    }
  }

  // Update badges
  document.querySelectorAll('.sidebar-badge[data-for="saved"], .badge[data-for="saved"]')
    .forEach(badge => badge.textContent = DB.getSaved().length);

  document.querySelectorAll('.sidebar-badge[data-for="applied"], .badge[data-for="applied"]')
    .forEach(badge => badge.textContent = DB.getApps().length);

  console.log('TalentBridge initialized ✅');
});

  // Restore recent chat history
  const savedChatLog = DB.getChat();
  if (savedChatLog.length > 2) {
    const messagesList = document.getElementById('chat-messages');
    if (messagesList) {
      savedChatLog.slice(-6).forEach(msg => {
        if (msg.role === 'user') appendMessage(msg.text, 'user');
        else appendAIMessage(msg.text, []);
      });
    }
  }

  // Update sidebar badges
  document.querySelectorAll('.sidebar-badge[data-for="saved"], .badge[data-for="saved"]').forEach(badge => badge.textContent = DB.getSaved().length);
  document.querySelectorAll('.sidebar-badge[data-for="applied"], .badge[data-for="applied"]').forEach(badge => badge.textContent = DB.getApps().length);

  // Close user dropdown on outside click
  document.addEventListener('click', e => {
    if (!e.target.closest('.nav-user-menu') && !e.target.closest('.nav-logged-in')) closeDropdown();
  });

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(modalEl => {
    modalEl.addEventListener('click', e => { if (e.target === modalEl) modalEl.classList.remove('open'); });
  });

  // Live job search filter
  const mainSearchInput = document.getElementById('main-search');
  if (mainSearchInput) {
    mainSearchInput.addEventListener('input', e => {
      AppState.searchQuery = e.target.value;
      filterAndRender();
    });
  }

  // CV live preview on all tagged inputs
  document.querySelectorAll('[data-cv-field]').forEach(field => {
    field.addEventListener('input', updatePreview);
  });

  // Sort dropdown
  const sortDropdown = document.getElementById('sort-select');
  if (sortDropdown) {
    sortDropdown.addEventListener('change', e => {
      let sortedJobs = getAllJobs();
      if (AppState.activeCategory !== 'all') sortedJobs = sortedJobs.filter(j => j.category === AppState.activeCategory);
      if (e.target.value === 'newest')      sortedJobs.sort(() => 0);
      if (e.target.value === 'salary-high') sortedJobs.sort((a, b) => (b.salaryMax || 0) - (a.salaryMax || 0));
      if (e.target.value === 'salary-low')  sortedJobs.sort((a, b) => (a.salaryMin || 0) - (b.salaryMin || 0));
      renderJobFeed(sortedJobs);
    });
  }

  // Chat: Enter key to send (Shift+Enter for newline)
  const chatInputField = document.getElementById('chat-input');
  if (chatInputField) {
    chatInputField.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
    });
  }

  // Hero search: Enter key
  const heroSearchField = document.getElementById('hero-search-input');
  if (heroSearchField) {
    heroSearchField.addEventListener('keydown', e => { if (e.key === 'Enter') heroSearch(); });
  }

  console.log('TalentBridge initialized ✅ | DB:', { users: DB.getUsers().length, saved: DB.getSaved().length, apps: DB.getApps().length });
document.addEventListener('DOMContentLoaded', () => {

  const isMainApp = document.getElementById('job-feed-grid');

  if (!isMainApp) {
    updateAuthUI();
    console.log('Standalone page loaded (no SPA init needed)');
    return;
  }

  // =========================
  // INIT MAIN APP
  // =========================
  filterAndRender();
  renderTemplateSelector();
  updateAuthUI();

  // =========================
  // RESTORE CHAT
  // =========================
  const savedChatLog = DB.getChat();
  const messagesList = document.getElementById('chat-messages');

  if (messagesList && savedChatLog.length > 0) {
    savedChatLog.slice(-6).forEach(msg => {
      if (msg.role === 'user') {
        appendMessage(msg.text, 'user');
      } else {
        appendAIMessage(msg.text, []);
      }
    });
  }

  // =========================
  // UPDATE BADGES
  // =========================
  const savedCount = DB.getSaved().length;
  const appliedCount = DB.getApps().length;

  document
    .querySelectorAll('.sidebar-badge[data-for="saved"], .badge[data-for="saved"]')
    .forEach(b => b.textContent = savedCount);

  document
    .querySelectorAll('.sidebar-badge[data-for="applied"], .badge[data-for="applied"]')
    .forEach(b => b.textContent = appliedCount);

  // =========================
  // GLOBAL EVENTS
  // =========================

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-user-menu') && !e.target.closest('.nav-logged-in')) {
      closeDropdown();
    }
  });

  // Close modal on overlay click
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('open');
    });
  });

  // Main search
  document.getElementById('main-search')?.addEventListener('input', (e) => {
    AppState.searchQuery = e.target.value;
    filterAndRender();
  });

  // CV live preview
  document.querySelectorAll('[data-cv-field]').forEach(field => {
    field.addEventListener('input', updatePreview);
  });

  // Chat send on Enter
  document.getElementById('chat-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMsg();
    }
  });

  // Hero search
  document.getElementById('hero-search-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') heroSearch();
  });

  console.log('TalentBridge initialized ✅');
});