(function () {
  let providerGames = [];

  const esc = (value) =>
    String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  async function loadGames() {
    const providerResponse = await fetch("/api/providers");
    if (!providerResponse.ok) throw new Error(`Provider listesi yüklenemedi: ${providerResponse.status}`);
    const providerJson = await providerResponse.json();
    const providerList = Array.isArray(providerJson) ? providerJson : providerJson.providers || providerJson.data || [];
    const providers = providerList.map(item => typeof item === "string" ? item : item.provider || item.name || item.code || item.id).filter(Boolean);
    const catalogs = await Promise.all(providers.map(async provider => {
      const response = await fetch(`/api/games?provider=${encodeURIComponent(provider)}`);
      if (!response.ok) return [];
      const json = await response.json();
      const games = Array.isArray(json) ? json : json.games || json.data || [];
      return games.map(game => ({
        id: String(game.gameId || game.game_id || game.id || game.code || ""),
        name: String(game.gameName || game.name || game.title || "Oyun"),
        img: String(game.image || game.img || game.icon || game.thumbnail || ""),
        provider: String(game.provider || game.providerName || provider),
        type: String(game.category || game.type || game.gameType || "Casino")
      }));
    }));
    providerGames = catalogs.flat();
    return providerGames;
  }

  function currentUser() {
    try {
      return (
        window.user ||
        JSON.parse(localStorage.getItem("bozobet_user") || "null") ||
        JSON.parse(localStorage.getItem("bozobet_current_user") || "null")
      );
    } catch {
      return window.user || null;
    }
  }

  function gameCard(game) {
    return `
      <article class="rapid-final-card">
        <div class="rapid-final-image">
          <img
            src="${esc(game.img)}"
            alt="${esc(game.name)}"
            loading="lazy"
            decoding="async"
          >
          <span>${esc(game.provider)}</span>
        </div>

        <div class="rapid-final-content">
          <b>${esc(game.name)}</b>
          <small>${esc(game.type)}</small>

          <button onclick="openRapidGame('${esc(game.id)}')">
            Hemen Oyna
          </button>
        </div>
      </article>
    `;
  }

  window.openRapidGame = async function (gameId) {
    if (!currentUser()) {
      alert("Lütfen hesabınıza giriş yapın.");

      if (typeof window.loginModal === "function") {
        setTimeout(window.loginModal, 100);
      }

      return;
    }

    try {
      const user = currentUser();
      const response = await fetch("/api/game-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user.username || user.id, gameId: String(gameId) })
      });
      const data = await response.json();
      if (!response.ok || !data.launchUrl) throw new Error(data.error || "Oyun bağlantısı alınamadı.");
      window.open(data.launchUrl, "_blank");
    } catch (error) {
      alert(error.message);
    }
  };

  async function renderGames(title) {
    const app = document.getElementById("app");
    if (!app) return;

    app.innerHTML = typeof window.shell === "function"
      ? window.shell(`
          <section class="rapid-final-hero">
            <div>
              <span>OYUNLAR</span>
              <h1>${esc(title)}</h1>
              <p>Oyunlar yükleniyor...</p>
            </div>
          </section>
        `)
      : `<section class="rapid-final-hero"><h1>${esc(title)}</h1></section>`;

    try {
      const games = await loadGames();

      const content = `
        <section class="rapid-final-hero">
          <div>
            <span>OYUNLAR</span>
            <h1>${esc(title)}</h1>
            <p>${games.length} oyun ve gerçek sağlayıcı görselleri.</p>
          </div>
          <strong>${games.length}</strong>
        </section>

        <section class="rapid-final-grid">
          ${games.map(gameCard).join("")}
        </section>
      `;

      app.innerHTML =
        typeof window.shell === "function"
          ? window.shell(content)
          : content;

    } catch (error) {
      console.error(error);

      app.innerHTML =
        typeof window.shell === "function"
          ? window.shell(`
              <div class="empty-coupon">
                <b>Oyunlar yüklenemedi</b>
                <span>${esc(error.message)}</span>
              </div>
            `)
          : `<p>Oyunlar yüklenemedi.</p>`;
    }
  }

  window.renderCasino = () => renderGames("Casino Oyunları");
  window.renderSlot = () => renderGames("Slot Oyunları");
  window.renderVirtualGames = () => renderGames("Sanal Oyunlar");
})();
