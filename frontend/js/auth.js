/* ──────────────────────────────────────────────
   AUTH SYSTEM — auth.js  (Firebase + TiDB Edition)

   FIX SUMMARY (vs original):
   ① Role is ALWAYS fetched from TiDB before auth resolves.
     localStorage role cache is only a fallback, never source of truth.
   ② window._authResolved promise resolves only AFTER DB role is known.
     Guard.js waits on this promise — no more race conditions.
   ③ 'authRoleReady' event fires with the real DB role.
     login/google-signin redirect ONLY after this event fires.
   ④ All DB profile fields (title, bio, location, skills, experience)
     are merged into AppState on every login — profile page always
     shows persisted data after refresh.
   ⑤ Role cache is cleared on logout so stale role never persists.
────────────────────────────────────────────── */

/* ── Firebase config ── */
const _FB_CONFIG = {
  apiKey:            "AIzaSyCrfCUtWatSi4W2PCoIA-0apJX2i0CJO8w",
  authDomain:        "talent-bridge1.firebaseapp.com",
  projectId:         "talent-bridge1",
  storageBucket:     "talent-bridge1.firebasestorage.app",
  messagingSenderId: "43218428741",
  appId:             "1:43218428741:web:031a50e8a83e91af35542c",
  measurementId:     "G-3XQHW50SMS"
};

/* FIX ①: Promise that resolves only after DB role is confirmed*/
window._authResolved = new Promise(function(resolve) {
  window._resolveAuth = resolve;
});

/* ── Bootstrap Firebase via an injected module script ── */
(function () {
  const s = document.createElement('script');
  s.type = 'module';
  s.textContent = ` 
    import { initializeApp }                    from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
    import { getAuth, onAuthStateChanged,
             signInWithEmailAndPassword,
             createUserWithEmailAndPassword,
             signInWithPopup, GoogleAuthProvider,
             sendPasswordResetEmail,
             signOut as fbSignOut,
             updateProfile }                    from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

    const app  = initializeApp(window._FB_CONFIG);
    const auth = getAuth(app);
    const gp   = new GoogleAuthProvider();

    window._fbAuth    = auth;
    window._fbSignIn  = (e,p)  => signInWithEmailAndPassword(auth, e, p);
    window._fbSignUp  = (e,p)  => createUserWithEmailAndPassword(auth, e, p);
    window._fbGoogle  = ()     => signInWithPopup(auth, gp);
    window._fbReset   = (e)    => sendPasswordResetEmail(auth, e);
    window._fbSignOut = ()     => fbSignOut(auth);
    window._fbProfile = (u,d)  => updateProfile(u, d);

    /*  FIX : Auth observer — always await DB fetch before resolving  */
    onAuthStateChanged(auth, async fbUser => {
      if (fbUser) {
        // Start with cached/Firebase data
        var appUser = window._toAppUser(fbUser);

        // FIX ①②: Always fetch full profile from TiDB before resolving auth
        // This guarantees role-dependent UI sees the correct role
        var apiBase = window.TB_API_BASE || 'http://localhost:5000/api';
        try {
          const dbProfile = await fetch(apiBase + '/users/' + fbUser.uid)
            .then(r => r.ok ? r.json() : null)
            .catch(() => null);

          if (dbProfile && dbProfile.role) {
            // FIX ④: Merge ALL DB profile fields — not just role
            appUser = Object.assign({}, appUser, {
              role:            dbProfile.role,
              title:           dbProfile.title           || '',
              bio:             dbProfile.bio             || '',
              location:        dbProfile.location        || '',
              phone:           dbProfile.phone           || '',
              website:         dbProfile.website         || '',
              linkedin:        dbProfile.linkedin        || '',
              github:          dbProfile.github          || '',
              company:         dbProfile.company         || '',
              experienceYears: dbProfile.experienceYears || '',
              skills:          dbProfile.skills          || [],
              experience:      dbProfile.experience      || [],
              education:       dbProfile.education       || [],
            });
            // Keep localStorage cache in sync with DB
            try { localStorage.setItem('tb_user_role_' + fbUser.uid, dbProfile.role); } catch(e) {}
          } else if (!dbProfile) {
            // First-ever login — create profile row in DB
            if (typeof DB !== 'undefined') {
              DB.saveProfile(appUser).catch(e => console.warn('[auth] initial profile save failed', e));
            }
          }
        } catch(e) {
          console.warn('[auth] DB fetch failed — using cached role:', e);
        }

        // Update all state stores
        if (typeof DB !== 'undefined')       DB.setSession(appUser);
        if (typeof AppState !== 'undefined') AppState.currentUser = appUser;

        // FIX ③: Dispatch with REAL role from DB
        document.dispatchEvent(new CustomEvent('authRoleReady', { detail: appUser }));

      } else {
        // Logged out
        if (typeof DB !== 'undefined')       DB.clearSession();
        if (typeof AppState !== 'undefined') AppState.currentUser = null;
        document.dispatchEvent(new CustomEvent('authRoleReady', { detail: null }));
      }

      // FIX Resolve the global promise once — Guard.requireEmployer() awaits this
      if (typeof window._resolveAuth === 'function') {
        window._resolveAuth(typeof AppState !== 'undefined' ? AppState.currentUser : null);
        window._resolveAuth = null;
      }

      if (typeof updateAuthUI === 'function') updateAuthUI();

      // Legacy compat
      window._fbReady = true;
      document.dispatchEvent(new Event('fbReady'));
    });
  `;
  document.head.appendChild(s);
})();

/* ── Helpers ── */
window._FB_CONFIG = _FB_CONFIG;

/* FIX: _toAppUser only builds a base object.
   Real profile data is merged in onAuthStateChanged after DB fetch. */
window._toAppUser = function (fbUser, overrideRole) {
  const name     = fbUser.displayName || fbUser.email || 'User';
  const initials = name.split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || 'U';

  var savedRole = 'seeker';
  try {
    var stored = localStorage.getItem('tb_user_role_' + fbUser.uid);
    if (stored === 'employer' || stored === 'seeker') savedRole = stored;
  } catch(e) {}

  var role = overrideRole || savedRole;

  return {
    id:         fbUser.uid,
    name:       name,
    email:      fbUser.email,
    role:       role,
    avatar:     initials,
    joinedAt:   Date.now(),
    // These will be overwritten by DB fetch in onAuthStateChanged
    title:      '',
    bio:        '',
    location:   '',
    skills:     [],
    experience: [],
  };
};

function _friendlyError(code) {
  const m = {
    'auth/invalid-email':          'Invalid email address.',
    'auth/user-not-found':         'No account found with this email.',
    'auth/wrong-password':         'Incorrect password.',
    'auth/invalid-credential':     'Incorrect email or password.',
    'auth/email-already-in-use':   'This email is already registered.',
    'auth/weak-password':          'Password must be at least 6 characters.',
    'auth/too-many-requests':      'Too many attempts — wait a moment.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/popup-blocked':          'Pop-up blocked. Allow pop-ups for this site.',
    'auth/popup-closed-by-user':   '',
  };
  return m[code] || ('Something went wrong. (' + code + ')');
}

function _setLoading(btn, on, label) {
  if (!btn) return;
  btn.disabled = on;
  if (on) { btn._orig = btn.textContent; btn.classList.add('btn-loading'); btn.textContent = ''; }
  else    { btn.classList.remove('btn-loading'); btn.textContent = label || btn._orig || 'Submit'; }
}

function _showErr(groupId, errId, msg) {
  var g = document.getElementById(groupId);
  var e = document.getElementById(errId);
  if (g) g.classList.add('has-error');
  if (e) e.textContent = msg;
}
function _clearErr(groupId) {
  var g = document.getElementById(groupId);
  if (g) g.classList.remove('has-error');
}

/* ─────────────────────────────────────────────
   MODAL
───────────────────────────────────────────── */
var authMode = 'login';

function openAuth(mode) {
  authMode = mode || 'login';
  var modal = document.getElementById('auth-modal');
  if (!modal) { console.warn('auth-modal not found'); return; }
  renderAuthModal(authMode);
  modal.classList.add('open');
}

function closeAuth() {
  var m = document.getElementById('auth-modal');
  if (m) m.classList.remove('open');
}

function renderAuthModal(mode) {
  var box = document.getElementById('auth-modal-box');
  if (!box) return;

  if (window._defaultAuthMode && !window._urlParamsApplied) {
    mode = window._defaultAuthMode;
    window._urlParamsApplied = true;
  }

  var preselectedRole = window._defaultRole || 'seeker';

  if (mode === 'login') {
    box.innerHTML =
      '<button class="modal-close" onclick="closeAuth()">&#x2715;</button>' +
      '<div class="auth-logo"><div class="logo">Talent<span>Bridge</span></div></div>' +
      '<div class="auth-title">Welcome back</div>' +
      '<div class="auth-subtitle">Sign in to your account to continue</div>' +
      '<button class="social-btn" id="google-btn" onclick="socialLogin(\'google\')">&#x1F535; Continue with Google</button>' +
      '<div class="divider"><span>or sign in with email</span></div>' +
      '<div class="input-group" id="login-email-grp">' +
        '<label>Email address</label>' +
        '<input type="email" id="login-email" placeholder="you@example.com">' +
        '<div class="error-msg" id="login-email-err">Please enter a valid email</div>' +
      '</div>' +
      '<div class="input-group" id="login-pass-grp">' +
        '<label>Password</label>' +
        '<input type="password" id="login-pass" placeholder="&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;" onkeydown="if(event.key===\'Enter\')handleLogin()">' +
        '<div class="error-msg" id="login-pass-err">Password is required</div>' +
      '</div>' +
      '<div style="text-align:right;margin-bottom:14px">' +
        '<span class="auth-link" style="font-size:13px" onclick="handleForgotPassword()">Forgot password?</span>' +
      '</div>' +
      '<button class="btn btn-primary btn-full" id="login-submit-btn" onclick="handleLogin()">Sign In</button>' +
      '<div class="form-toggle-row">No account? <span class="auth-link" onclick="renderAuthModal(\'signup\')">Create one free</span></div>';
  } else {
    var roleSeeker   = preselectedRole === 'seeker'   ? ' selected' : '';
    var roleEmployer = preselectedRole === 'employer' ? ' selected' : '';
    box.innerHTML =
      '<button class="modal-close" onclick="closeAuth()">&#x2715;</button>' +
      '<div class="auth-logo"><div class="logo">Talent<span>Bridge</span></div></div>' +
      '<div class="auth-title">Create your account</div>' +
      '<div class="auth-subtitle">Join thousands of job seekers and employers</div>' +
      '<button class="social-btn" id="google-btn" onclick="socialLogin(\'google\')">&#x1F535; Continue with Google</button>' +
      '<div class="divider"><span>or sign up with email</span></div>' +
      '<div class="input-row">' +
        '<div class="input-group"><label>First Name</label><input type="text" id="reg-fname" placeholder="Ahmed"></div>' +
        '<div class="input-group"><label>Last Name</label><input type="text" id="reg-lname" placeholder="Khan"></div>' +
      '</div>' +
      '<div class="input-group" id="reg-email-grp">' +
        '<label>Email</label>' +
        '<input type="email" id="reg-email" placeholder="you@example.com">' +
        '<div class="error-msg" id="reg-email-err">Valid email required</div>' +
      '</div>' +
      '<div class="input-group" id="reg-pass-grp">' +
        '<label>Password</label>' +
        '<input type="password" id="reg-pass" placeholder="Minimum 6 characters" onkeydown="if(event.key===\'Enter\')handleSignup()">' +
        '<div class="error-msg" id="reg-pass-err">Password must be at least 6 characters</div>' +
      '</div>' +
      '<div class="input-group">' +
        '<label>I am a</label>' +
        '<select id="reg-role">' +
          '<option value="seeker"' + roleSeeker + '>Job Seeker</option>' +
          '<option value="employer"' + roleEmployer + '>Employer / Recruiter</option>' +
        '</select>' +
      '</div>' +
      '<button class="btn btn-primary btn-full" id="reg-submit-btn" onclick="handleSignup()">Create Account</button>' +
      '<div class="form-toggle-row">Have an account? <span class="auth-link" onclick="renderAuthModal(\'login\')">Sign in</span></div>';
  }
}

/* ─────────────────────────────────────────────
   GOOGLE SIGN-IN
───────────────────────────────────────────── */
function socialLogin(provider) {
  if (provider !== 'google') {
    if (typeof toast === 'function') toast(provider + ' login is not configured.', 'error');
    return;
  }
  if (!window._fbGoogle) {
    if (typeof toast === 'function') toast('Auth not ready, try again.', 'error');
    return;
  }
  var btn = document.getElementById('google-btn');
  if (btn) { btn.textContent = 'Connecting...'; btn.disabled = true; }

  window._fbGoogle().then(function (result) {
    closeAuth();
    if (typeof toast === 'function') toast('Signed in! Welcome, ' + (result.user.displayName || '').split(' ')[0] + ' \uD83D\uDC4B', 'success');
    // FIX ③: Redirect AFTER authRoleReady (real DB role confirmed)
    document.addEventListener('authRoleReady', function(e) {
      var user = e.detail;
      if (user && user.role === 'employer') window.location.href = 'Employer_dashboard.html';
      // else stay on current page
    }, { once: true });
  }).catch(function (e) {
    if (e.code !== 'auth/popup-closed-by-user') {
      if (typeof toast === 'function') toast(_friendlyError(e.code), 'error');
    }
    if (btn) { btn.textContent = '\uD83D\uDD35 Continue with Google'; btn.disabled = false; }
  });
}

/* ─────────────────────────────────────────────
   EMAIL LOGIN
───────────────────────────────────────────── */
function handleLogin() {
  var emailEl  = document.getElementById('login-email');
  var passEl   = document.getElementById('login-pass');
  var emailVal = emailEl ? emailEl.value.trim() : '';
  var passVal  = passEl  ? passEl.value          : '';
  var valid = true;

  if (!emailVal || !/\S+@\S+\.\S+/.test(emailVal)) {
    _showErr('login-email-grp', 'login-email-err', 'Please enter a valid email'); valid = false;
  } else { _clearErr('login-email-grp'); }

  if (!passVal) {
    _showErr('login-pass-grp', 'login-pass-err', 'Password is required'); valid = false;
  } else { _clearErr('login-pass-grp'); }

  if (!valid) return;
  if (!window._fbSignIn) { if (typeof toast === 'function') toast('Auth not ready, try again.', 'error'); return; }

  var btn = document.getElementById('login-submit-btn');
  _setLoading(btn, true);

  window._fbSignIn(emailVal, passVal).then(function (cred) {
    closeAuth();
    if (typeof toast === 'function') toast('Signing in...', 'info');

    // FIX ③: Wait for authRoleReady (DB role confirmed) before redirecting
    document.addEventListener('authRoleReady', function(e) {
      var user = e.detail;
      if (user) {
        if (typeof toast === 'function') toast('Welcome back, ' + user.name.split(' ')[0] + '! \uD83D\uDC4B', 'success');
        if (user.role === 'employer') window.location.href = 'Employer_dashboard.html';
        // Seekers stay on job feed (dashboard.html)
      }
    }, { once: true });

  }).catch(function (e) {
    _showErr('login-pass-grp', 'login-pass-err', _friendlyError(e.code));
    if (typeof toast === 'function') toast(_friendlyError(e.code), 'error');
    _setLoading(btn, false, 'Sign In');
  });
}

/* ─────────────────────────────────────────────
   EMAIL SIGN-UP
───────────────────────────────────────────── */
function handleSignup() {
  var firstName = document.getElementById('reg-fname') ? document.getElementById('reg-fname').value.trim() : '';
  var lastName  = document.getElementById('reg-lname') ? document.getElementById('reg-lname').value.trim() : '';
  var email     = document.getElementById('reg-email') ? document.getElementById('reg-email').value.trim() : '';
  var password  = document.getElementById('reg-pass')  ? document.getElementById('reg-pass').value          : '';
  var role      = document.getElementById('reg-role')  ? document.getElementById('reg-role').value           : 'seeker';
  var valid = true;

  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    _showErr('reg-email-grp', 'reg-email-err', 'Valid email required'); valid = false;
  } else { _clearErr('reg-email-grp'); }

  if (password.length < 6) {
    _showErr('reg-pass-grp', 'reg-pass-err', 'Password must be at least 6 characters'); valid = false;
  } else { _clearErr('reg-pass-grp'); }

  if (!valid) return;
  if (!window._fbSignUp) { if (typeof toast === 'function') toast('Auth not ready, try again.', 'error'); return; }

  var btn = document.getElementById('reg-submit-btn');
  _setLoading(btn, true);

  var fullName = (firstName + ' ' + lastName).trim() || 'New User';

  window._fbSignUp(email, password)
    .then(function (cred) {
      return window._fbProfile(cred.user, { displayName: fullName }).then(function () { return cred; });
    })
    .then(function (cred) {
      // FIX: Set role cache BEFORE onAuthStateChanged fires
      try { localStorage.setItem('tb_user_role_' + cred.user.uid, role); } catch(e) {}

      var appUser = Object.assign({}, window._toAppUser(cred.user, role), { name: fullName, role: role });

      // FIX: Save to TiDB first with correct role, THEN let onAuthStateChanged proceed
      var apiBase = window.TB_API_BASE || 'http://localhost:5000/api';
      return fetch(apiBase + '/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appUser)
      }).catch(function(err) {
        console.warn('[handleSignup] TiDB save failed:', err);
      }).then(function() {
        closeAuth();
        if (typeof toast === 'function') toast('Account created! Welcome, ' + (firstName || 'there') + '! \uD83C\uDF89', 'success');
        if (role === 'employer') window.location.href = 'Employer_dashboard.html';
        else                     window.location.href = 'profile_page.html';
      });
    })
    .catch(function (e) {
      _showErr('reg-email-grp', 'reg-email-err', _friendlyError(e.code));
      if (typeof toast === 'function') toast(_friendlyError(e.code), 'error');
      _setLoading(btn, false, 'Create Account');
    });
}

/* ─────────────────────────────────────────────
   FORGOT PASSWORD
───────────────────────────────────────────── */
function handleForgotPassword() {
  var emailEl  = document.getElementById('login-email');
  var emailVal = emailEl ? emailEl.value.trim() : '';
  if (!emailVal) {
    _showErr('login-email-grp', 'login-email-err', 'Enter your email first');
    if (typeof toast === 'function') toast('Enter your email address first.', 'warning');
    return;
  }
  if (!window._fbReset) { if (typeof toast === 'function') toast('Auth not ready.', 'error'); return; }
  window._fbReset(emailVal)
    .then(function () { if (typeof toast === 'function') toast('Reset link sent! Check your inbox.', 'success'); })
    .catch(function (e) { if (typeof toast === 'function') toast(_friendlyError(e.code), 'error'); });
}

/* ─────────────────────────────────────────────
   LOGOUT
───────────────────────────────────────────── */
function logout() {
  var doLogout = function () {
    if (typeof DB !== 'undefined')       DB.clearSession();
    if (typeof AppState !== 'undefined') AppState.currentUser = null;
    // FIX ⑤: Clear role cache so stale role doesn't persist for next user
    try {
      Object.keys(localStorage).forEach(function(key) {
        if (key.startsWith('tb_user_role_')) localStorage.removeItem(key);
      });
    } catch(e) {}
    if (typeof closeDropdown === 'function') closeDropdown();
    if (typeof toast === 'function') toast('You have been logged out.', 'info');
    setTimeout(function () { window.location.href = 'index.html'; }, 600);
  };
  if (window._fbSignOut) window._fbSignOut().then(doLogout).catch(doLogout);
  else doLogout();
}

/* ─────────────────────────────────────────────
   URL PARAMS
───────────────────────────────────────────── */
(function applyUrlParams() {
  var params = new URLSearchParams(window.location.search);
  var role   = params.get('role');
  var mode   = params.get('mode');
  if (mode === 'signup') {
    window._defaultAuthMode = 'signup';
    window._defaultRole     = role || 'seeker';
  } else if (role) {
    window._defaultRole     = role;
    window._defaultAuthMode = 'signup';
  }
})();

/* ── Expose globals ── */
window.openAuth             = openAuth;
window.closeAuth            = closeAuth;
window.renderAuthModal      = renderAuthModal;
window.socialLogin          = socialLogin;
window.handleLogin          = handleLogin;
window.handleSignup         = handleSignup;
window.handleForgotPassword = handleForgotPassword;
window.logout               = logout;
