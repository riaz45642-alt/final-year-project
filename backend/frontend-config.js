/**
 * TalentBridge — API Base URL Configuration
 *
 * Automatically switches between:
 *  • Local dev  → http://localhost:5000/api
 *  • Production → your Railway backend URL
 *
 * HOW TO UPDATE FOR PRODUCTION:
 *   Replace the RAILWAY_URL value below with your actual Railway domain,
 *   e.g. "https://talentbridge-production.up.railway.app/api"
 */

(function () {
  const RAILWAY_URL  = "https://YOUR-APP-NAME.up.railway.app/api"; // ← update after deploy
  const LOCAL_URL    = "http://localhost:5000/api";
  const isLocalhost  = location.hostname === "localhost" || location.hostname === "127.0.0.1";

  window.TB_API_BASE = isLocalhost ? LOCAL_URL : RAILWAY_URL;
})();
