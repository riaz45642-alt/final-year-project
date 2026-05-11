/* ──────────────────────────────────────────────
   AUTH SYSTEM  — auth.js  (FIXED)
   Works on ALL pages safely (no more crashes
   when prof-name / prof-avatar don't exist)
────────────────────────────────────────────── */

let authMode = 'login';

function openAuth(mode = 'login') {
  authMode = mode;
  const modal = document.getElementById('auth-modal');
  if (!modal) { console.warn('auth-modal not found on this page'); return; }
  renderAuthModal(mode);
  modal.classList.add('open');
}

function closeAuth() {
  document.getElementById('auth-modal')?.classList.remove('open');
}

function renderAuthModal(mode) {
  const box = document.getElementById('auth-modal-box');
  if (!box) return;

  if (mode === 'login') {
    box.innerHTML = `
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
        <span class="auth-link" style="font-size:13px"
          onclick="toast('Password reset link sent to your email!','info')">Forgot password?</span>
      </div>
      <button class="btn btn-primary btn-full" id="login-submit-btn" onclick="handleLogin()">Sign In</button>
      <div class="form-toggle-row">No account?
        <span class="auth-link" onclick="renderAuthModal('signup')">Create one free</span>
      </div>
      <div style="margin-top:10px;text-align:center;font-size:12px;color:var(--text-muted)">
        Demo: ahmed@talentbridge.com / ahmed123
      </div>`;
  } else {
    box.innerHTML = `
      <button class="modal-close" onclick="closeAuth()">✕</button>
      <div class="auth-logo"><div class="logo">Talent<span>Bridge</span></div></div>
      <div class="auth-title">Create your account</div>
      <div class="auth-subtitle">Join thousands of job seekers and employers</div>
      <button class="social-btn" onclick="socialLogin('google')">🔵 Continue with Google</button>
      <div class="divider"><span>or sign up with email</span></div>
      <div class="input-row">
        <div class="input-group"><label>First Name</label><input type="text" id="reg-fname" placeholder="Ahmed"></div>
        <div class="input-group"><label>Last Name</label>  <input type="text" id="reg-lname" placeholder="Khan"></div>
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
      <div class="form-toggle-row">Have an account?
        <span class="auth-link" onclick="renderAuthModal('login')">Sign in</span>
      </div>`;
  }
}

/* ── Social login ── */
function socialLogin(provider) {
  const btn = event.target;
  btn.textContent = 'Connecting...';
  btn.disabled = true;
  setTimeout(() => {
    const user = {
      id:     'social_' + Date.now(),
      name:   provider === 'google' ? 'Google User' : 'LinkedIn User',
      email:  provider + '@social.com',
      role:   'seeker',
      avatar: provider === 'google' ? 'GU' : 'LU'
    };
    DB.setSession(user);
    AppState.currentUser = user;
    closeAuth();
    updateAuthUI();
    toast(`Signed in with ${provider === 'google' ? 'Google' : 'LinkedIn'}!`, 'success');
  }, 1200);
}

/* ── Login ── */
function handleLogin() {
  const emailVal = document.getElementById('login-email')?.value.trim() || '';
  const passVal  = document.getElementById('login-pass')?.value || '';
  let valid = true;

  if (!emailVal || !/\S+@\S+\.\S+/.test(emailVal)) {
    document.getElementById('login-email-grp')?.classList.add('has-error');
    valid = false;
  } else {
    document.getElementById('login-email-grp')?.classList.remove('has-error');
  }

  if (!passVal) {
    document.getElementById('login-pass-grp')?.classList.add('has-error');
    valid = false;
  } else {
    document.getElementById('login-pass-grp')?.classList.remove('has-error');
  }

  if (!valid) return;

  const btn = document.getElementById('login-submit-btn');
  btn.classList.add('btn-loading');
  btn.textContent = '';
  btn.disabled = true;

  setTimeout(() => {
    const found = DB.getUserByEmail(emailVal);
    btn.classList.remove('btn-loading');
    btn.disabled = false;
    btn.textContent = 'Sign In';

    if (!found || found.password !== passVal) {
      document.getElementById('login-pass-grp')?.classList.add('has-error');
      const errEl = document.getElementById('login-pass-err');
      if (errEl) errEl.textContent = 'Incorrect email or password';
      toast('Invalid credentials', 'error');
      return;
    }

    DB.setSession(found);
    AppState.currentUser = found;
    closeAuth();
    updateAuthUI();
    toast(`Welcome back, ${found.name.split(' ')[0]}! 👋`, 'success');

    // Redirect employer to dashboard
    if (found.role === 'employer') {
      window.location.href = 'Employer_dashboard.html';
    }
  }, 900);
}

/* ── Signup ── */
function handleSignup() {
  const firstName = document.getElementById('reg-fname')?.value.trim() || '';
  const lastName  = document.getElementById('reg-lname')?.value.trim() || '';
  const email     = document.getElementById('reg-email')?.value.trim() || '';
  const password  = document.getElementById('reg-pass')?.value || '';
  const role      = document.getElementById('reg-role')?.value || 'seeker';
  let valid = true;

  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    document.getElementById('reg-email-grp')?.classList.add('has-error');
    valid = false;
  } else { document.getElementById('reg-email-grp')?.classList.remove('has-error'); }

  if (password.length < 6) {
    document.getElementById('reg-pass-grp')?.classList.add('has-error');
    valid = false;
  } else { document.getElementById('reg-pass-grp')?.classList.remove('has-error'); }

  if (!valid) return;

  if (DB.getUserByEmail(email)) {
    document.getElementById('reg-email-grp')?.classList.add('has-error');
    const errEl = document.getElementById('reg-email-err');
    if (errEl) errEl.textContent = 'This email is already registered';
    return;
  }

  const btn = document.getElementById('reg-submit-btn');
  btn.classList.add('btn-loading');
  btn.textContent = '';
  btn.disabled = true;

  setTimeout(() => {
    const initials = ((firstName[0]||'') + (lastName[0]||'')).toUpperCase() || 'U';
    const newUser  = {
      id:       'u_' + Date.now(),
      name:     (firstName + ' ' + lastName).trim() || 'New User',
      email, password, role,
      avatar:   initials,
      joinedAt: Date.now()
    };
    DB.addUser(newUser);
    DB.setSession(newUser);
    AppState.currentUser = newUser;
    closeAuth();
    updateAuthUI();
    toast(`Account created! Welcome, ${newUser.name.split(' ')[0]}! 🎉`, 'success');

    if (role === 'employer') window.location.href = 'Employer_dashboard.html';
    else window.location.href = 'profile_page.html';
  }, 900);
}

/* ── Logout ── */
function logout() {
  DB.clearSession();
  AppState.currentUser = null;
  updateAuthUI();
  closeDropdown();
  toast('You have been logged out.', 'info');
  window.location.href = 'index.html';
}