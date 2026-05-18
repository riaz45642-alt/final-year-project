/* ════════════════════════════════════════════════════
   guard.js — Role-Based Page Access Control
   TalentBridge

   FIX SUMMARY (vs original):
   ① Uses window._authResolved promise (set in auth.js) to wait for
     the REAL DB role — not just the Firebase token + localStorage cache.
     Original code polled every 200ms and could redirect based on stale role.
   ② Hide role-restricted elements immediately with CSS, then show
     correct ones only after authRoleReady fires. This eliminates the
     "Employer Hub flashes then disappears" bug.
   ③ applyRoleBasedUI() now also hides the employer sidebar button
     from seekers at the DOM level (not just display:none via CSS).

   Usage: include AFTER script.js and auth.js on any page.
   Then call:
     Guard.requireLogin()       → any signed-in user
     Guard.requireSeeker()      → only job seekers
     Guard.requireEmployer()    → only employers
════════════════════════════════════════════════════ */

(function () {

  /* ── FIX ②: Hide ALL role-gated elements immediately (before auth resolves)
     so there's no flash of wrong content ── */
  (function hideRoleElementsEarly() {
    var style = document.createElement('style');
    style.id = 'guard-role-hide';
    // Hide all role elements until we know the user's role
    style.textContent = '[data-role] { display: none !important; }';
    document.head.appendChild(style);
  })();

  /* ── helpers ── */
  function getUser() {
    if (typeof AppState !== 'undefined' && AppState.currentUser) return AppState.currentUser;
    try { var s = localStorage.getItem('tb_session'); return s ? JSON.parse(s) : null; } catch(e) { return null; }
  }

  function showToast(msg, type) {
    if (typeof toast === 'function') toast(msg, type || 'warning');
  }

  /* ── FIX ①: Wait for authResolved promise (DB role confirmed) ── */
  function whenResolved(ruleFn) {
    // If _authResolved is available (auth.js loaded first), use it
    if (window._authResolved && typeof window._authResolved.then === 'function') {
      window._authResolved.then(function(user) {
        // Double-check AppState which may have been updated by then
        var finalUser = (typeof AppState !== 'undefined' && AppState.currentUser)
                      ? AppState.currentUser : user;
        ruleFn(finalUser);
      });
      return;
    }

    // Fallback: poll until AppState user is available (legacy compat)
    var user = getUser();
    if (user) { ruleFn(user); return; }

    var elapsed  = 0;
    var interval = setInterval(function () {
      elapsed += 200;
      var u = getUser();
      if (u || elapsed >= 4000) {
        clearInterval(interval);
        ruleFn(u);
      }
    }, 200);

    document.addEventListener('authRoleReady', function(e) {
      clearInterval(interval);
      ruleFn(e.detail);
    }, { once: true });
  }

  /* ── FIX ②③: Show role-gated elements after role is known ── */
  function applyRoleVisibility(role) {
    // Remove the early-hide style
    var earlyHide = document.getElementById('guard-role-hide');
    if (earlyHide) earlyHide.remove();

    // Show elements matching the user's role; hide the other role's elements
    document.querySelectorAll('[data-role]').forEach(function(el) {
      var elRole = el.getAttribute('data-role');
      if (!role) {
        // Guest — hide everything role-restricted
        el.style.display = 'none';
      } else if (elRole === role) {
        // Matches user's role — show
        el.style.display = '';
      } else {
        // Doesn't match — hide
        el.style.display = 'none';
      }
    });
  }

  /* ── Listen for authRoleReady to apply visibility on every page ── */
  document.addEventListener('authRoleReady', function(e) {
    var user = e.detail;
    applyRoleVisibility(user ? user.role : null);
    // Also call the global applyRoleBasedUI if script.js loaded it
    if (typeof applyRoleBasedUI === 'function') applyRoleBasedUI();
  });

  // Also apply if auth resolves before this listener was added
  if (window._authResolved && typeof window._authResolved.then === 'function') {
    window._authResolved.then(function() {
      var user = (typeof AppState !== 'undefined') ? AppState.currentUser : null;
      if (user) applyRoleVisibility(user.role);
    });
  }

  /* ── Public API ── */
  window.Guard = {

    /* Any signed-in user */
    requireLogin: function (opts) {
      opts = opts || {};
      whenResolved(function (user) {
        if (!user) {
          showToast('Please sign in to access this page.', 'warning');
          setTimeout(function () {
            window.location.href = (opts.loginUrl || 'auth.html') + '?mode=login&next=' + encodeURIComponent(window.location.pathname);
          }, 600);
        }
      });
    },

    /* Only job-seekers */
    requireSeeker: function (opts) {
      opts = opts || {};
      whenResolved(function (user) {
        if (!user) {
          showToast('Please sign in to access this page.', 'warning');
          setTimeout(function () { window.location.href = opts.loginUrl || 'auth.html?mode=login'; }, 600);
          return;
        }
        if (user.role === 'employer') {
          showToast('This page is for job seekers only.', 'warning');
          setTimeout(function () { window.location.href = opts.fallbackUrl || 'Employer_dashboard.html'; }, 900);
        }
      });
    },

    /* Only employers — FIX: now waits for DB role, not localStorage guess */
    requireEmployer: function (opts) {
      opts = opts || {};
      whenResolved(function (user) {
        if (!user) {
          showToast('Please sign in as an employer to access this page.', 'warning');
          setTimeout(function () { window.location.href = opts.loginUrl || 'auth.html?mode=login&role=employer'; }, 600);
          return;
        }
        if (user.role !== 'employer') {
          // FIX: This now only triggers after DB confirms the role is NOT employer.
          // Previously this could trigger on stale localStorage cache.
          showToast('Employer Hub is only for employers.', 'warning');
          setTimeout(function () { window.location.href = opts.fallbackUrl || 'dashboard.html'; }, 900);
        }
        // role === 'employer' → access granted
      });
    },
  };

})();
