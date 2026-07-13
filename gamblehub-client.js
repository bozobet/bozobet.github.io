(function () {
  "use strict";

  const API_BASE = String(window.BOZOBET_API_BASE || "").replace(/\/+$/, "");
  const previousRenderCasino = window.renderCasino;
  const fallbackGames = [
    { title:"Sweet Bonanza", provider:"Pragmatic Play", imageUrl:"assets/mobile/promos/welcome-bonus.png" },
    { title:"Gates of Olympus", provider:"Pragmatic Play", imageUrl:"assets/mobile/banners/big-prize-banner.png" },
    { title:"Aviator", provider:"Spribe", imageUrl:"assets/mobile/banners/live-casino-hero-2.png" },
    { title:"Crazy Time", provider:"Evolution", imageUrl:"assets/mobile/dealers/dealer-live-casino-1.png" },
    { title:"Lightning Roulette", provider:"Evolution", imageUrl:"assets/mobile/dealers/dealer-live-casino-2.png" },
    { title:"Blackjack", provider:"Evolution", imageUrl:"assets/mobile/dealers/dealer-cards.png" }
  ];

  function esc(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function currentUser() {
    return typeof window.getAuthenticatedUser === "function"
      ? window.getAuthenticatedUser()
      : window.user || null;
  }

  function playerLogin(user) {
    return String(user?.username || user?.login || user?.email || user?.id || "").trim().slice(0, 64);
  }

  function apiUrl(path) {
    return API_BASE + path;
  }

  async function safeJson(response) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  async function getStatus() {
    const response = await fetch(apiUrl("/api/gamblehub/status"), { headers:{ Accept:"application/json" } });
    const data = await safeJson(response);
    if (!response.ok || !data?.ok) throw new Error("casino_backend_unavailable");
    return data;
  }

  async function loadGambleHubGames() {
    const response = await fetch(apiUrl("/api/gamblehub/games"), { headers:{ Accept:"application/json" } });
    const data = await safeJson(response);
    if (!response.ok || !data?.ok || !Array.isArray(data.games)) throw new Error("casino_games_unavailable");
    return data.games.filter(game => game && game.isEnabled === true && game.id && game.title).map(game => ({
      id:String(game.id),
      title:String(game.title),
      imageUrl:String(game.imageUrl || ""),
      provider:String(game.provider || "Provider"),
      isEnabled:true
    }));
  }

  function renderCard(game, isFallback) {
    const image = game.imageUrl || "assets/mobile/icons/casino-icon.png";
    return '<article class="gamblehub-game-card">' +
      '<div class="gamblehub-game-image"><img src="' + esc(image) + '" alt="' + esc(game.title) + '" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=\'assets/mobile/icons/casino-icon.png\'"><span>' + esc(game.provider) + '</span></div>' +
      '<div class="gamblehub-game-info"><b>' + esc(game.title) + '</b><small>' + (isFallback ? 'Demo katalog' : 'Gamble Hub Stage') + '</small>' +
      (isFallback
        ? '<button type="button" disabled>Hazırlanıyor</button>'
        : '<button type="button" data-gamblehub-game-id="' + esc(game.id) + '" onclick="playGambleHubGame(this.dataset.gamblehubGameId)">Oyna</button>') +
      '</div></article>';
  }

  function renderGambleHubGames(games, options) {
    const app = document.getElementById("app");
    if (!app || typeof window.shell !== "function") return;
    const fallback = Boolean(options?.fallback);
    const label = options?.label || (fallback ? "Casino Stage bağlantısı hazırlanıyor" : "Gamble Hub Stage aktif");
    const list = Array.isArray(games) && games.length ? games : fallbackGames;
    app.innerHTML = window.shell(
      '<section id="mobile-casino-view" class="gamblehub-casino">' +
        '<header class="gamblehub-hero"><div><small>CASINO & SLOT</small><h1>Casino Oyunları</h1><p>Mobil casino kataloğu</p></div><strong>' + list.length + '</strong></header>' +
        '<div class="gamblehub-stage-label"><i></i><span>' + esc(label) + '</span></div>' +
        '<section class="gamblehub-games-grid">' + list.map(game => renderCard(game, fallback)).join("") + '</section>' +
      '</section>'
    );
  }

  function renderLoading() {
    const app = document.getElementById("app");
    if (!app || typeof window.shell !== "function") return;
    app.innerHTML = window.shell('<section class="gamblehub-loading"><span></span><b>Casino Stage kontrol ediliyor...</b></section>');
  }

  function friendlyOpenError(error) {
    if (error?.message === "setup_required") return "Casino Stage bağlantısı henüz yapılandırılmadı.";
    if (error?.message === "invalid_request") return "Oyun bilgileri geçersiz. Lütfen tekrar deneyin.";
    return "Oyun şu anda açılamıyor. Lütfen daha sonra tekrar deneyin.";
  }

  async function openGambleHubGame(gameId, options) {
    const user = currentUser();
    if (!user) {
      if (typeof window.loginModal === "function") window.loginModal();
      throw new Error("login_required");
    }
    const login = playerLogin(user);
    if (!gameId || !login) throw new Error("invalid_request");

    const popup = window.open("about:blank", "_blank");
    if (popup) {
      popup.opener = null;
      try {
        popup.document.title = "BozoBet Casino";
        popup.document.body.textContent = "Oyun hazırlanıyor...";
      } catch {}
    }

    try {
      const response = await fetch(apiUrl("/api/gamblehub/open-game"), {
        method:"POST",
        headers:{ "Content-Type":"application/json", Accept:"application/json" },
        body:JSON.stringify({
          gameId:String(gameId),
          playerLogin:login,
          currency:String(options?.currency || "USD"),
          language:String(options?.language || "tr"),
          demo:String(options?.demo ?? "1"),
          exitUrl:String(options?.exitUrl || window.location.href)
        })
      });
      const data = await safeJson(response);
      if (!response.ok || !data?.ok || typeof data.gameUrl !== "string") {
        throw new Error(data?.error === "setup_required" ? "setup_required" : "open_game_failed");
      }
      if (popup && !popup.closed) popup.location.replace(data.gameUrl);
      else window.location.assign(data.gameUrl);
      return data;
    } catch (error) {
      if (popup && !popup.closed) popup.close();
      throw error;
    }
  }

  async function renderCasinoWithGambleHub() {
    if (!window.matchMedia("(max-width: 760px)").matches) {
      return typeof previousRenderCasino === "function" ? previousRenderCasino.apply(this, arguments) : undefined;
    }
    renderLoading();
    try {
      const status = await getStatus();
      if (!status.configured) {
        renderGambleHubGames(fallbackGames, { fallback:true, label:"Casino Stage bağlantısı hazırlanıyor" });
        return;
      }
      const games = await loadGambleHubGames();
      renderGambleHubGames(games, { fallback:false, label:"Gamble Hub Stage aktif" });
    } catch {
      renderGambleHubGames(fallbackGames, { fallback:true, label:"Casino Stage bağlantısı hazırlanıyor" });
    }
  }

  window.loadGambleHubGames = loadGambleHubGames;
  window.openGambleHubGame = openGambleHubGame;
  window.renderGambleHubGames = renderGambleHubGames;
  window.playGambleHubGame = async function (gameId) {
    try {
      await openGambleHubGame(gameId, { demo:"1" });
    } catch (error) {
      if (error?.message !== "login_required") alert(friendlyOpenError(error));
    }
  };
  window.renderCasino = renderCasinoWithGambleHub;
})();
