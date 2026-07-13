(function () {
  "use strict";
  const VERCEL_BACKEND = "https://bozobet-v2.vercel.app";
  const host = window.location.hostname;
  window.BOZOBET_API_BASE = host.endsWith("github.io") ? VERCEL_BACKEND : "";
})();
