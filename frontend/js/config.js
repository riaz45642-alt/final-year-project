/**
 * TalentBridge — API Base URL
 *
 * Automatically switches between local dev and Railway production.
 *
 * SETUP (one-time after Railway deploy):
 *   Replace YOUR-APP-NAME below with the subdomain from:
 *   Railway dashboard → your service → Settings → Domains
 *   e.g.  talentbridge-production.up.railway.app
 *
 * DO NOT change anything else.
 */
(function () {
  // ← Paste your Railway domain here (no https://, no /api, no trailing slash)
  var RAILWAY_DOMAIN = "YOUR-APP-NAME.up.railway.app";

  var isLocal =
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1";

  window.TB_API_BASE = isLocal
    ? "http://localhost:5000/api"
    : "https://" + RAILWAY_DOMAIN + "/api";

  // Uncomment the line below while debugging to see which URL is active:
  // console.log("[TalentBridge] API base:", window.TB_API_BASE);
})();
