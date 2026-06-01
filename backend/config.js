(function () {
  var RENDER_URL = "https://talentbridge-api-e2pd.onrender.com";
  var LOCAL_URL  = "http://localhost:8080";
  var isLocal    = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  window.TB_API_BASE = (isLocal ? LOCAL_URL : RENDER_URL) + "/api";
})();