(() => {
  "use strict";

  let allGames = [];

  const wantedGames = [
    {
      label: "Sweet Bonanza",
      matches: ["sweet bonanza"]
    },
    {
      label: "Gates of Olympus",
      matches: ["gates of olympus", "gates olympus"]
    },
    {
      label: "Big Bass",
      matches: ["big bass bonanza", "big bass"]
    },
    {
      label: "Sugar Rush",
      matches: ["sugar rush"]
    },
    {
      label: "Aviator",
      matches: ["aviator"]
    }
  ];

  function esc(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function loadGames() {
    if (allGames.length) return allGames;

    const providerResponse = await fetch("/api/providers");
    if (!providerResponse.ok) throw new Error("Provider listesi yüklenemedi");
    const providerJson = await providerResponse.json();
    const providerList = Array.isArray(providerJson) ? providerJson : providerJson.providers || providerJson.data || [];
    const providers = providerList.map(item => typeof item === "string" ? item : item.provider || item.name || item.code || item.id).filter(Boolean);
    const catalogs = await Promise.all(providers.map(async provider => {
      const response = await fetch(`/api/games?provider=${encodeURIComponent(provider)}`);
      if(!response.ok) return [];
      const json = await response.json();
      const list = Array.isArray(json) ? json : json.games || json.data || [];
      return list.map(game => ({
        id: String(game.gameId || game.game_id || game.id || game.code || ""),
        name: String(game.gameName || game.name || game.title || "Oyun"),
        img: String(game.image || game.img || game.icon || game.thumbnail || ""),
        provider: String(game.provider || game.providerName || provider),
        type: String(game.category || game.type || game.gameType || "Casino")
      }));
    }));
    allGames = catalogs.flat();

    return allGames;
  }

  function findGame(item) {
    return allGames.find(game => {
      const name = String(game.name || "").toLocaleLowerCase("tr");

      return item.matches.some(match =>
        name.includes(match.toLocaleLowerCase("tr"))
      );
    });
  }

  function cardHtml(game, requestedName) {
    if (!game) {
      return `
        <article class="hpf-game-card unavailable">
          <div class="hpf-game-image">
            <div class="hpf-no-image"></div>
          </div>

          <div class="hpf-game-content">
            <b>${esc(requestedName)}</b>
            <span>Yakında</span>
          </div>
        </article>
      `;
    }

    return `
      <article
        class="hpf-game-card"
        onclick="rfOpenGame('${esc(game.id)}')"
      >
        <div class="hpf-game-image">
          <img
            src="${esc(game.img)}"
            alt="${esc(game.name)}"
            loading="lazy"
            decoding="async"
            onerror="this.closest('.hpf-game-card').style.display='none'"
          >

          <span>${esc(game.provider || "Provider")}</span>

          <div class="hpf-play">
            Oyna
          </div>
        </div>

        <div class="hpf-game-content">
          <b>${esc(game.name)}</b>
          <small>${esc(game.type || "Casino")}</small>
        </div>
      </article>
    `;
  }

  function findPopularSection() {
    const titles = [
      ...document.querySelectorAll(
        "h1,h2,h3,h4,b,strong,.section-title,.card-title"
      )
    ];

    const title = titles.find(element => {
      const text = String(element.textContent || "")
        .trim()
        .toLocaleLowerCase("tr");

      return text === "popüler oyunlar";
    });

    if (!title) return null;

    return (
      title.closest(".card") ||
      title.closest("section") ||
      title.parentElement?.parentElement ||
      null
    );
  }

  async function replacePopularGames() {
    const section = findPopularSection();
    if (!section) return;

    if (section.dataset.hpfReady === "1") return;

    try {
      await loadGames();

      const selected = wantedGames.map(item => ({
        requestedName: item.label,
        game: findGame(item)
      }));

      const existingGrid =
        section.querySelector(
          ".bb-home-popular-real," +
          ".bbf-home-popular," +
          ".bb-home-popular-final-grid," +
          ".bb-home-popular-games-fixed," +
          ".games-grid," +
          ".game-grid"
        );

      if (existingGrid) {
        existingGrid.remove();
      }

      section
        .querySelectorAll(
          ".bb-catalog-game-card," +
          ".bbf-card," +
          ".premium-game-card," +
          ".api-game-card"
        )
        .forEach(card => card.remove());

      section.insertAdjacentHTML(
        "beforeend",
        `
          <div class="hpf-popular-grid">
            ${selected
              .map(item =>
                cardHtml(item.game, item.requestedName)
              )
              .join("")}
          </div>
        `
      );

      section.dataset.hpfReady = "1";

    } catch (error) {
      console.error("Ana sayfa oyunları yüklenemedi:", error);
    }
  }

  if (typeof window.renderHome === "function") {
    const oldRenderHome = window.renderHome;

    window.renderHome = function () {
      oldRenderHome();

      setTimeout(replacePopularGames, 100);
      setTimeout(replacePopularGames, 500);
    };
  }

  window.addEventListener("load", () => {
    setTimeout(replacePopularGames, 300);
    setTimeout(replacePopularGames, 1000);
  });

  document.addEventListener("click", () => {
    setTimeout(replacePopularGames, 250);
  });

  console.log("BozoBet ana sayfa gerçek oyun kartları aktif");
})();
