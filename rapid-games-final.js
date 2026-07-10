(function () {
  let rapidGames = [];

  const esc = (value) =>
    String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  async function loadGames() {
    const response = await fetch(`games.json?v=${Date.now()}`, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`games.json yüklenemedi: ${response.status}`);
    }

    const json = await response.json();
    rapidGames = Array.isArray(json.games) ? json.games : [];
    return rapidGames;
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

  window.openRapidGame = function (gameId) {
    if (!currentUser()) {
      alert("Lütfen hesabınıza giriş yapın.");

      if (typeof window.loginModal === "function") {
        setTimeout(window.loginModal, 100);
      }

      return;
    }

    alert(
      "Oyun listesi ve görseller hazır. GitHub Pages üzerinde oyun açılış bağlantısı için sunucu bağlantısı gerekiyor."
    );
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
