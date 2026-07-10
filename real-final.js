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
    const response = await fetch(`games.json?v=real-final-5`, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`games.json yüklenemedi: ${response.status}`);
    }

    const json = await response.json();
    games = Array.isArray(json.games) ? json.games : [];

    return games;
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

  window.rfOpenGame = function (gameId) {
    if (!currentUser()) {
      alert("Lütfen hesabınıza giriş yapın.");

      if (typeof window.loginModal === "function") {
        setTimeout(window.loginModal, 100);
      }

      return;
    }

    alert(
      "Oyun listesi ve gerçek görseller hazır. Oyunu açmak için API anahtarını gizleyen sunucu bağlantısını eklememiz gerekiyor."
    );
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
            <p>RapidAPI sağlayıcılarından alınan gerçek oyun kataloğu.</p>
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
