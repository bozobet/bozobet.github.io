(function () {
  "use strict";

  let games = [];
  let visibleLimit = 120;
  let searchText = "";
  let providerFilter = "all";

  const esc = value =>
    String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

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

  function shellSafe(content) {
    return typeof window.shell === "function"
      ? window.shell(content)
      : `<main class="real-final-shell">${content}</main>`;
  }

  async function loadGames() {
    const providerResponse = await fetch("/api/providers");
    if (!providerResponse.ok) throw new Error(`Provider listesi yüklenemedi: ${providerResponse.status}`);
    const providerJson = await providerResponse.json();
    const providers = findArray(providerJson)
      .map(item => typeof item === "string" ? item : item.provider || item.name || item.code || item.id)
      .filter(Boolean);

    const catalogs = await Promise.all(providers.map(async provider => {
      const response = await fetch(`/api/games?provider=${encodeURIComponent(provider)}`);
      if (!response.ok) throw new Error(`${provider} oyunları yüklenemedi: ${response.status}`);
      return findArray(await response.json()).map((game, index) => normalizeGame(game, provider, index));
    }));
    games = catalogs.flat().filter(game => game.id && game.name);

    return games;
  }

  function findArray(value) {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== "object") return [];
    for (const key of ["data", "providers", "games", "result", "results", "items", "list"]) {
      const found = findArray(value[key]);
      if (found.length) return found;
    }
    return [];
  }

  function normalizeGame(game, provider, index) {
    return {
      id: String(game.gameId || game.game_id || game.id || game.code || game.slug || ""),
      name: String(game.gameName || game.name || game.title || `Oyun ${index + 1}`),
      img: String(game.image || game.img || game.icon || game.thumbnail || game.logo || ""),
      provider: String(game.provider || game.providerName || provider),
      type: String(game.category || game.type || game.gameType || "Casino")
    };
  }

  function filteredGames() {
    const query = searchText.toLocaleLowerCase("tr");

    return games.filter(game => {
      const provider = String(game.provider || "");
      const searchable = `${game.name || ""} ${provider} ${game.type || ""}`
        .toLocaleLowerCase("tr");

      const searchMatch = !query || searchable.includes(query);
      const providerMatch =
        providerFilter === "all" ||
        provider.toLocaleLowerCase("tr") ===
          providerFilter.toLocaleLowerCase("tr");

      return searchMatch && providerMatch;
    });
  }

  function providerNames() {
    return [...new Set(
      games
        .map(game => String(game.provider || "").trim())
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));
  }

  function gameCard(game) {
    const id = esc(game.id);
    const name = esc(game.name || "Oyun");
    const image = esc(game.img);
    const provider = esc(game.provider || "Provider");
    const type = esc(game.type || "Casino");

    return `
      <article class="rf-game-card">
        <div class="rf-game-image">
          <img
            src="${image}"
            alt="${name}"
            loading="lazy"
            decoding="async"
            onerror="this.closest('.rf-game-card').remove()"
          >
          <span>${provider}</span>
        </div>

        <div class="rf-game-info">
          <b>${name}</b>
          <small>${type}</small>
          <button onclick="rfOpenGame('${id}')">Hemen Oyna</button>
        </div>
      </article>
    `;
  }

  function renderGrid() {
    const grid = document.querySelector(".rf-games-grid");
    const count = document.querySelector(".rf-result-count");
    const more = document.querySelector(".rf-load-more");

    if (!grid) return;

    const filtered = filteredGames();
    const shown = filtered.slice(0, visibleLimit);

    grid.innerHTML = shown.map(gameCard).join("");

    if (count) {
      count.textContent = `${filtered.length} oyundan ${shown.length} tanesi gösteriliyor`;
    }

    if (more) {
      more.style.display =
        shown.length < filtered.length ? "block" : "none";
    }
  }

  window.rfSearchGames = function () {
    searchText =
      document.getElementById("rfGameSearch")?.value?.trim() || "";

    visibleLimit = 120;
    renderGrid();
  };

  window.rfSetProvider = function (provider) {
    providerFilter = provider || "all";
    visibleLimit = 120;

    document.querySelectorAll(".rf-provider-tabs button").forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.provider === providerFilter
      );
    });

    renderGrid();
  };

  window.rfLoadMore = function () {
    visibleLimit += 120;
    renderGrid();
  };

  window.rfOpenGame = async function (gameId) {
    if (!currentUser()) {
      alert("Lütfen hesabınıza giriş yapın.");

      if (typeof window.loginModal === "function") {
        setTimeout(window.loginModal, 100);
      }

      return;
    }

    try {
      const current = currentUser();
      const response = await fetch("/api/game-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: current.username || current.id, gameId: String(gameId) })
      });
      const data = await response.json();
      if (!response.ok || !data.launchUrl) throw new Error(data.error || "Oyun bağlantısı alınamadı.");
      window.open(data.launchUrl, "_blank");
    } catch (error) {
      alert(error.message);
    }
  };

  async function renderGamesPage(title) {
    const app = document.getElementById("app");
    if (!app) return;

    app.innerHTML = shellSafe(`
      <section class="rf-loading">
        <b>Oyunlar yükleniyor...</b>
      </section>
    `);

    try {
      if (!games.length) {
        await loadGames();
      }

      const providers = providerNames();

      app.innerHTML = shellSafe(`
        <section class="rf-hero">
          <div>
            <span>OYUNLAR</span>
            <h1>${esc(title)}</h1>
            <p>Betnex sağlayıcılarından alınan gerçek oyun kataloğu.</p>
          </div>

          <strong>${games.length}</strong>
        </section>

        <section class="rf-toolbar">
          <div class="rf-search">
            <input
              id="rfGameSearch"
              type="search"
              placeholder="Oyun veya sağlayıcı ara"
              oninput="rfSearchGames()"
            >
          </div>

          <div class="rf-provider-tabs">
            <button
              class="active"
              data-provider="all"
              onclick="rfSetProvider('all')"
            >
              Tümü
            </button>

            ${providers.map(provider => `
              <button
                data-provider="${esc(provider)}"
                onclick="rfSetProvider('${esc(provider)}')"
              >
                ${esc(provider)}
              </button>
            `).join("")}
          </div>
        </section>

        <p class="rf-result-count"></p>

        <section class="rf-games-grid"></section>

        <button class="rf-load-more" onclick="rfLoadMore()">
          Daha Fazla Oyun Göster
        </button>
      `);

      renderGrid();
      cleanDesktopIcons();

    } catch (error) {
      console.error(error);

      app.innerHTML = shellSafe(`
        <section class="rf-loading">
          <b>Oyunlar yüklenemedi</b>
          <span>${esc(error.message)}</span>
        </section>
      `);
    }
  }

  function cleanDesktopIcons() {
    if (window.innerWidth <= 800) return;

    const selectors = [
      ".bbf-nav",
      ".bb-clean-nav",
      ".bb-bottom-nav-real",
      ".bb-bottom-nav-final",
      ".bb-hard-mobile-login-bar",
      ".bb-hard-mobile-login-bar-final",
      ".bb-mobile-auth-actions"
    ];

    document.querySelectorAll(selectors.join(",")).forEach(element => {
      element.remove();
    });

    document.querySelectorAll("img").forEach(image => {
      const src = image.getAttribute("src") || "";

      const isOldMobileIcon =
        src.includes("assets/mobile/icons/") ||
        src.includes("neon_yeşil_ev") ||
        src.includes("parlak_futbol_topu") ||
        src.includes("slot_makinesi") ||
        src.includes("kullanıcı_ikonu") ||
        src.includes("bildirim_simgesi");

      if (isOldMobileIcon) {
        const parent =
          image.closest("button") ||
          image.closest("nav") ||
          image.closest(".bbf-nav") ||
          image.closest(".bb-clean-nav");

        if (parent) {
          parent.remove();
        } else {
          image.remove();
        }
      }
    });
  }

  window.renderCasino = () => renderGamesPage("Casino Oyunları");
  window.renderSlot = () => renderGamesPage("Slot Oyunları");
  window.renderVirtualGames = () => renderGamesPage("Sanal Oyunlar");

  // Eski butonların yeni fonksiyonu çağırmasını garanti et
  document.addEventListener("click", event => {
    const element = event.target.closest("button,a");
    if (!element) return;

    const text = String(element.textContent || "")
      .trim()
      .toLocaleLowerCase("tr");

    if (
      text === "casino" ||
      text === "casino oyunları" ||
      text === "slot" ||
      text === "slot oyunları"
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();

      renderGamesPage(
        text.includes("slot") ? "Slot Oyunları" : "Casino Oyunları"
      );
    }
  }, true);

  window.addEventListener("load", () => {
    cleanDesktopIcons();
    setTimeout(cleanDesktopIcons, 400);
    setTimeout(cleanDesktopIcons, 1500);
  });

  window.addEventListener("resize", cleanDesktopIcons);
})();

// GAME LAUNCH HARD FIX V2
window.rfOpenGame = async function (gameId) {
  let currentUser = null;

  try {
    currentUser =
      window.user ||
      JSON.parse(localStorage.getItem("bozobet_user") || "null") ||
      JSON.parse(localStorage.getItem("bozobet_current_user") || "null");
  } catch (error) {
    currentUser = window.user || null;
  }

  if (!currentUser) {
    alert("Lütfen hesabınıza giriş yapın.");

    if (typeof window.loginModal === "function") {
      setTimeout(() => window.loginModal(), 100);
    }

    return;
  }

  if (!gameId) {
    alert("Bu oyunun gameId bilgisi bulunamadı.");
    return;
  }

  const rawUsername =
    currentUser.username ||
    currentUser.id ||
    currentUser.email ||
    "bozobetuser";

  let username = String(rawUsername)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 32);

  if (username.length < 4) {
    username = "user" + Date.now().toString().slice(-8);
  }

  // Safari ve mobil tarayıcı pop-up engellemesin diye sekmeyi tıklama anında aç
  const gameWindow = window.open("about:blank", "_blank");

  if (gameWindow) {
    gameWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Oyun açılıyor</title>
          <style>
            body{
              margin:0;
              min-height:100vh;
              display:flex;
              align-items:center;
              justify-content:center;
              background:#07110c;
              color:#65ff35;
              font-family:Arial,sans-serif;
              font-size:18px;
              font-weight:800;
            }
          </style>
        </head>
        <body>Oyun açılıyor...</body>
      </html>
    `);
  }

  try {
    const response = await fetch(
      "/api/game-url",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username,
          gameId: String(gameId)
        })
      }
    );

    const responseText = await response.text();

    let data;

    try {
      data = JSON.parse(responseText);
    } catch (error) {
      throw new Error("Sunucudan geçersiz cevap geldi: " + responseText.slice(0, 120));
    }

    if (!response.ok) {
      throw new Error(
        data.error ||
        data.message ||
        "Oyun bağlantısı alınamadı."
      );
    }

    if (!data.launchUrl) {
      throw new Error("Sunucu oyun açılış adresi göndermedi.");
    }

    if (gameWindow && !gameWindow.closed) {
      gameWindow.location.replace(data.launchUrl);
    } else {
      window.location.href = data.launchUrl;
    }

  } catch (error) {
    console.error("Oyun açma hatası:", error);

    if (gameWindow && !gameWindow.closed) {
      gameWindow.close();
    }

    alert("Oyun açılamadı: " + error.message);
  }
};
