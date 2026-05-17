/* ════════════════════════════════════════════════════
   guard.js — Role-Based Page Access Control
   TalentBridge

   Usage: include AFTER script.js and auth.js on any page.
   Then call:
     Guard.requireLogin()            → any signed-in user
     Guard.requireSeeker()           → only job seekers
     Guard.requireEmployer()         → only employers

   How it works:
   1. Tries the localStorage session cache first (instant).
   2. If no cache, polls 200ms intervals up to 3 seconds
      for Firebase's onAuthStateChanged to resolve.
   3. Once user is confirmed (or timeout), runs the rule.
   4. On rule violation → redirect with a toast message.
════════════════════════════════════════════════════ */

(function () {

  /* ── helpers ── */
  function getUser() {
    if (typeof AppState !== 'undefined' && AppState.currentUser) return AppState.currentUser;
    try { var s = localStorage.getItem('tb_session'); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  }

  function showToast(msg, type) {
    if (typeof toast === 'function') toast(msg, type || 'warning');
  }

  /* ── core: run rule once user is known ── */
  function whenResolved(ruleFn) {
    var user = getUser();
    if (user) { ruleFn(user); return; }   // already have session → instant

    // Wait for Firebase (up to 3 s, checking every 200 ms)
    var elapsed = 0;
    var interval = setInterval(function () {
      elapsed += 200;
      var u = getUser();
      if (u || elapsed >= 3000) {
        clearInterval(interval);
        ruleFn(u);   // u may be null after timeout → rule handles redirect
      }
    }, 200);

    // Also listen for the fbReady event that auth.js fires
    document.addEventListener('fbReady', function () {
      clearInterval(interval);
      ruleFn(getUser());
    }, { once: true });
  }

  /* ── public API ── */
  window.Guard = {

    /* Any signed-in user — guests are redirected to login */
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

    /* Only job-seekers; employers and guests are redirected */
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
        // role === 'seeker' → access granted, do nothing
      });
    },

    /* Only employers; seekers and guests are redirected */
    requireEmployer: function (opts) {
      opts = opts || {};
      whenResolved(function (user) {
        if (!user) {
          showToast('Please sign in as an employer to access this page.', 'warning');
          setTimeout(function () { window.location.href = opts.loginUrl || 'auth.html?mode=login&role=employer'; }, 600);
          return;
        }
        if (user.role !== 'employer') {
          showToast('Employer Hub is only for employers.', 'warning');
          setTimeout(function () { window.location.href = opts.fallbackUrl || 'index.html'; }, 900);
        }
        // role === 'employer' → access granted, do nothing
      });
    },
  };

})();
