(function installGalaxyBetBootstrap(){
  "use strict";

  const state = window.__GALAXYBET_BOOTSTRAP__ = window.__GALAXYBET_BOOTSTRAP__ || {
    installedAt:Date.now(),
    initializeCalls:0,
    removeCalls:0,
    errors:[],
    events:[]
  };

  function record(event, detail){
    state.events.push({event, detail:detail || "", at:Date.now()});
    console.info(`[bootstrap] ${event}${detail ? `: ${detail}` : ""}`);
  }

  function getLoadingScreen(){
    return document.getElementById("loading") ||
      document.querySelector(".loading-screen, .site-loader, .loader-screen");
  }

  function removeLoadingScreen(reason){
    state.removeCalls += 1;
    state.lastRemoveReason = reason || "unspecified";
    record("removeLoadingScreen called", state.lastRemoveReason);

    const loading = getLoadingScreen();
    document.body?.classList.add("site-ready");
    if(!loading){
      state.removed = true;
      return false;
    }

    loading.setAttribute("aria-hidden", "true");
    loading.style.opacity = "0";
    loading.style.pointerEvents = "none";

    let finished = false;
    const finish = () => {
      if(finished) return;
      finished = true;
      if(loading.isConnected) loading.remove();
      state.removed = !getLoadingScreen();
      state.removedAt = Date.now();
      record("loading DOM removed", reason || "unspecified");
    };

    // Keep the short fade when frames are running, but never depend on it.
    requestAnimationFrame(() => setTimeout(finish, 360));
    setTimeout(finish, 750);
    return true;
  }

  function renderInitialPage(){
    const app = document.getElementById("app");
    if(!app || app.innerHTML.trim()) return;

    if(typeof window.renderAppRoute === "function"){
      window.renderAppRoute(location.hash.slice(1) || "home");
    }else if(typeof window.renderHome === "function"){
      window.renderHome();
    }else{
      const captured = state.errors.at(-1)?.message || "Uygulama başlangıç dosyası tamamlanamadı.";
      app.innerHTML = `
        <main class="safe-error-screen">
          <h1>Site açılırken hata oluştu</h1>
          <p>${String(captured).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</p>
          <button type="button" onclick="location.reload()">Tekrar Dene</button>
        </main>
      `;
    }
  }

  function initializeApp(source){
    state.initializeCalls += 1;
    record("initializeApp called", source || document.readyState);
    if(state.initializePromise) return state.initializePromise;

    state.initializePromise = Promise.resolve()
      .then(renderInitialPage)
      .catch(error => {
        state.errors.push({type:"initialize", message:String(error?.message || error)});
        console.error("[bootstrap] initializeApp failed", error);
      })
      .then(() => new Promise(resolve => requestAnimationFrame(resolve)))
      .then(() => removeLoadingScreen(`initializeApp/${source || document.readyState}`));

    return state.initializePromise;
  }

  window.removeLoadingScreen = removeLoadingScreen;
  window.hideLoading = reason => removeLoadingScreen(reason || "hideLoading");
  window.hideSplash = reason => removeLoadingScreen(reason || "hideSplash");
  window.initializeApp = initializeApp;

  window.addEventListener("error", event => {
    state.errors.push({
      type:"error",
      message:String(event.message || "Unknown runtime error"),
      source:event.filename || "",
      line:event.lineno || 0
    });
    console.error("[bootstrap] runtime error captured", event.error || event.message);
    initializeApp("window.error");
  });

  window.addEventListener("unhandledrejection", event => {
    const reason = event.reason;
    state.errors.push({type:"unhandledrejection", message:String(reason?.message || reason)});
    console.error("[bootstrap] unhandled rejection captured", reason);
    initializeApp("unhandledrejection");
  });

  document.addEventListener("DOMContentLoaded", () => initializeApp("DOMContentLoaded"), {once:true});
  window.addEventListener("load", () => initializeApp("window.load"), {once:true});

  // This watchdog is independent from DOMContentLoaded, window.load, promises and rAF.
  setTimeout(() => {
    if(getLoadingScreen()) removeLoadingScreen("watchdog");
  }, 2500);

  record("bootstrap installed", document.readyState);
})();
