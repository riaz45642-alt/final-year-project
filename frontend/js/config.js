/**
 * TalentBridge — API Base URL Configuration
 *
 * Automatically switches between:
 *  • Local dev  → http://localhost:8080/api
 *  • Production → Render backend URL
 *
 * SETUP (one-time after Render deploy):
 *   Replace RENDER_DOMAIN below with your Render service domain.
 *   Find it in: Render dashboard → your service → top of page
 *   e.g.  talentbridge-api.onrender.com
 */
(function () {
  // ← Paste your Render domain here (no https://, no /api, no trailing slash)
  var RENDER_DOMAIN = "YOUR-SERVICE-NAME.onrender.com";

  var isLocal =
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1";

  window.TB_API_BASE = isLocal
    ? "http://localhost:8080/api"
    : "https://" + RENDER_DOMAIN + "/api";

  // Uncomment to debug:
  // console.log("[TalentBridge] API base:", window.TB_API_BASE);
})();
