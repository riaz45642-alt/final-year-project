// Auto-switches: localhost (dev) ↔ Fly.io (production)
// After deploy: replace FLY_APP_NAME with your actual Fly.io app name
(function () {
  var FLY_URL  = "https://FLY_APP_NAME.fly.dev";
  var LOCAL_URL = "http://localhost:8080";
  var isLocal  = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  window.TB_API_BASE = (isLocal ? LOCAL_URL : FLY_URL) + "/api";
})();
