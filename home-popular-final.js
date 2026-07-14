(() => {
  "use strict";

  const MOBILE_QUERY = "(max-width: 760px)";
  const BET_SLIP_KEY = "bozobetBetSlip";
  const FALLBACK_IMAGE = "assets/mobile/banners/big-prize-banner.png";
  const TEAM_LOGO_BASE = "assets/futbol takım logoları/";

  const popularGames = [
    { title:"Sweet Bonanza", provider:"Pragmatic Play", category:"Slot", badge:"Popüler", image:"assets/mobile/promos/welcome-bonus.png", aliases:["sweet bonanza"] },
    { title:"Gates of Olympus", provider:"Pragmatic Play", category:"Slot", badge:"Popüler", image:"assets/mobile/banners/big-prize-banner.png", aliases:["gates of olympus", "olympus"] },
    { title:"Big Bass Bonanza", provider:"Pragmatic Play", category:"Slot", badge:"Slot", image:"assets/mobile/banners/live-casino-hero-1.png", aliases:["big bass bonanza", "big bass"] },
    { title:"Sugar Rush", provider:"Pragmatic Play", category:"Slot", badge:"Popüler", image:"assets/mobile/promos/freespin.png", aliases:["sugar rush"] },
    { title:"Aviator", provider:"Spribe", category:"Crash", badge:"Popüler", image:"assets/mobile/banners/live-casino-hero-2.png", aliases:["aviator"] },
    { title:"Crazy Time", provider:"Evolution", category:"Game Show", badge:"Canlı", image:"assets/mobile/dealers/dealer-live-casino-1.png", aliases:["crazy time"] }
  ];

  const newGames = [
    { title:"Mines", provider:"Spribe", category:"Crash", badge:"Yeni", image:"assets/mobile/promos/bonus-campaign.png", aliases:["mines"] },
    { title:"Plinko", provider:"Spribe", category:"Arcade", badge:"Yeni", image:"assets/mobile/promos/mobile-pocket.png", aliases:["plinko"] },
    { title:"Starlight Princess", provider:"Pragmatic Play", category:"Slot", badge:"Yeni", image:"assets/mobile/banners/vip-casino-banner.png", aliases:["starlight princess"] },
    { title:"Fruit Party", provider:"Pragmatic Play", category:"Slot", badge:"Yeni", image:"assets/mobile/promos/no-wager-bonus.png", aliases:["fruit party"] },
    { title:"Wanted Dead or a Wild", provider:"Hacksaw", category:"Slot", badge:"Yeni", image:"assets/mobile/banners/live-casino-hero-3.png", aliases:["wanted dead or a wild", "wanted dead"] },
    { title:"Reactoonz", provider:"Play'n GO", category:"Slot", badge:"Yeni", image:"assets/mobile/icons/slot-icon.png", aliases:["reactoonz"] }
  ];

  const liveCasinoGames = [
    { title:"Canlı Rulet", provider:"Evolution", category:"Canlı Casino", badge:"CANLI", image:"assets/mobile/dealers/dealer-live-casino-1.png", aliases:["live roulette", "canlı rulet", "roulette"] },
    { title:"Blackjack", provider:"Evolution", category:"Canlı Casino", badge:"CANLI", image:"assets/mobile/dealers/dealer-cards.png", aliases:["blackjack"] },
    { title:"Baccarat", provider:"Evolution", category:"Canlı Casino", badge:"CANLI", image:"assets/mobile/dealers/dealer-live-casino-3.png", aliases:["baccarat"] },
    { title:"Game Show", provider:"Pragmatic Play", category:"Canlı Casino", badge:"CANLI", image:"assets/mobile/dealers/dealer-live-casino-4.png", aliases:["game show", "sweet bonanza candyland"] },
    { title:"Lightning Roulette", provider:"Evolution", category:"Canlı Casino", badge:"CANLI", image:"assets/mobile/dealers/dealer-live-casino-2.png", aliases:["lightning roulette"] },
    { title:"Mega Ball", provider:"Evolution", category:"Canlı Casino", badge:"CANLI", image:"assets/mobile/dealers/dealer-live-casino-5.png", aliases:["mega ball"] }
  ];

  const liveMatches = [
    {
      id:"home-live-mun-ars", minute:"72'", league:"Premier League", home:"Manchester United", away:"Arsenal", score:"1 - 2", odds:[2.85, 3.40, 2.18], markets:47,
      homeLogo:TEAM_LOGO_BASE + "english-premier-league-2026-2027.football-logos.cc/64x64/manchester-united.football-logos.cc.png",
      awayLogo:TEAM_LOGO_BASE + "english-premier-league-2026-2027.football-logos.cc/64x64/arsenal.football-logos.cc.png"
    },
    {
      id:"home-live-fb-gs", minute:"38'", league:"Trendyol Süper Lig", home:"Fenerbahçe", away:"Galatasaray", score:"1 - 0", odds:[1.92, 3.25, 3.70], markets:58,
      homeLogo:TEAM_LOGO_BASE + "turkey-super-lig-2025-2026.football-logos.cc/64x64/fenerbahce.football-logos.cc.png",
      awayLogo:TEAM_LOGO_BASE + "turkey-super-lig-2025-2026.football-logos.cc/64x64/galatasaray.football-logos.cc.png"
    },
    { id:"home-live-efes-fbb", minute:"3. Ç · 04:18", league:"EuroLeague", home:"Anadolu Efes", away:"Fenerbahçe Beko", score:"61 - 57", odds:[1.48, 12.00, 2.54], markets:24 }
  ];

  const promotions = [
    { title:"Hoş Geldin Bonusu", text:"İlk yatırımına özel hoş geldin avantajlarını keşfet.", image:"assets/promos/welcome-bonus.webp" },
    { title:"250 FreeSpin", text:"Seçili slotlarda geçerli FreeSpin fırsatı.", image:"assets/promos/freespin-250.webp" },
    { title:"Kayıp Bonusu", text:"Günlük casino kayıplarına özel iade kampanyası.", image:"assets/promos/loss-bonus.webp" },
    { title:"Kripto Bonusu", text:"Kripto yatırımlarına özel hızlı bonus fırsatı.", image:"assets/mobile/promos/mobile-pocket.png" },
    { title:"Arkadaşını Getir", text:"Davet ettiğin arkadaşlarınla birlikte kazan.", image:"assets/mobile/promos/bonus-campaign.png" },
    { title:"VIP Ayrıcalıkları", text:"Özel limitler, teklifler ve kişisel destek.", image:"assets/promos/vip.webp" }
  ];

  const providers = ["Pragmatic Play", "Evolution", "PG Soft", "EGT", "NetEnt", "Play'n GO", "Hacksaw", "Relax Gaming"];
  const trustItems = [
    { title:"Hızlı Yatırım", text:"Anında bakiye", icon:"assets/icons/trust/fast-deposit.webp" },
    { title:"Güvenli Sistem", text:"Korunan hesap", icon:"assets/icons/trust/secure-game.webp" },
    { title:"7/24 Destek", text:"Her an yanında", icon:"assets/icons/trust/support-247.webp" },
    { title:"Hızlı Çekim", text:"Pratik ödeme", icon:"assets/icons/trust/fast-withdraw.webp" }
  ];

  function esc(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function currentGames() {
    try {
      const games = typeof window.getBetApiGames === "function" ? window.getBetApiGames() : [];
      return Array.isArray(games) ? games : [];
    } catch (error) {
      return [];
    }
  }

  function enrichGame(game) {
    const found = currentGames().find(item => {
      const title = String(item.title || item.name || "").toLocaleLowerCase("tr-TR");
      return game.aliases.some(alias => title.includes(alias.toLocaleLowerCase("tr-TR")));
    });

    if (!found) return { ...game, gameId:"" };
    return {
      ...game,
      gameId:String(found.gameId || found.id || ""),
      title:String(found.title || found.name || game.title),
      provider:String(found.provider || game.provider),
      category:String(found.category || found.type || game.category),
      image:String(game.image || FALLBACK_IMAGE)
    };
  }

  function sectionHeader(title, action, label) {
    return `<header class="section-header"><h2 class="section-title">${esc(title)}</h2>${action ? `<button type="button" class="section-see-all" data-home-action="${esc(action)}">${esc(label || "Tümünü Gör")} <span aria-hidden="true">›</span></button>` : ""}</header>`;
  }

  function renderGameCard(game, index, wide) {
    const item = enrichGame(game);
    return `
      <article class="mobile-game-card${wide ? " mobile-game-card-live" : ""}">
        <div class="mobile-game-art">
          <img src="${esc(item.image || FALLBACK_IMAGE)}" data-fallback="${esc(game.image || FALLBACK_IMAGE)}" alt="${esc(item.title)}" loading="lazy" decoding="async">
          <span class="mobile-game-badge${String(item.badge).toLocaleLowerCase("tr-TR") === "canli" ? " is-live" : ""}">${esc(item.badge)}</span>
        </div>
        <div class="mobile-game-info">
          <h3>${esc(item.title)}</h3>
          <div class="mobile-game-meta"><span>${esc(item.provider)}</span><small>${esc(item.category)}</small></div>
          <button type="button" class="mobile-game-play" data-game-index="${index}" data-game-title="${esc(game.title)}" data-game-id="${esc(item.gameId)}">Oyna</button>
        </div>
      </article>`;
  }

  function gameSection(title, games, action, wide) {
    return `<section class="mobile-home-section">${sectionHeader(title, action)}<div class="mobile-horizontal-row mobile-game-row${wide ? " mobile-live-casino-row" : ""}">${games.map((game, index) => renderGameCard(game, index, wide)).join("")}</div></section>`;
  }

  function readSlip() {
    try {
      const slip = JSON.parse(localStorage.getItem(BET_SLIP_KEY) || "[]");
      return Array.isArray(slip) ? slip : [];
    } catch (error) {
      return [];
    }
  }

  function matchKey(match) {
    return `${match.home} - ${match.away}`;
  }

  function teamLogo(match, side) {
    const name = match[side];
    const logo = match[`${side}Logo`];
    const initials = name.split(/\s+/).map(part => part[0]).slice(0, 2).join("");
    return `<span class="mobile-live-team-logo">${logo ? `<img src="${esc(logo)}" alt="" loading="lazy" decoding="async">` : `<b aria-hidden="true">${esc(initials)}</b>`}</span>`;
  }

  function oddButton(match, pick, odd) {
    const selected = readSlip().some(item => item.match === matchKey(match) && item.pick === pick);
    return `<button type="button" class="mobile-live-odd odd${selected ? " selected" : ""}" data-live-match="${esc(match.id)}" data-pick="${pick}" aria-pressed="${selected}"><small>${pick}</small><strong>${Number(odd).toFixed(2)}</strong></button>`;
  }

  function liveMatchCard(match) {
    return `
      <article class="mobile-live-match" data-match-card="${esc(match.id)}">
        <header><div><span class="mobile-live-label"><i></i> CANLI</span><b>${esc(match.minute)}</b><small>${esc(match.league)}</small></div><strong>${esc(match.score)}</strong></header>
        <div class="mobile-live-teams">
          <div>${teamLogo(match, "home")}<span>${esc(match.home)}</span></div>
          <div>${teamLogo(match, "away")}<span>${esc(match.away)}</span></div>
        </div>
        <div class="mobile-live-market">
          ${oddButton(match, "1", match.odds[0])}${oddButton(match, "X", match.odds[1])}${oddButton(match, "2", match.odds[2])}
          <button type="button" class="mobile-live-more" data-home-action="sports">+${esc(match.markets)}</button>
        </div>
      </article>`;
  }

  function promotionsSection() {
    return `<section class="mobile-home-section">${sectionHeader("PROMOSYONLAR", "promotions")}<div class="mobile-horizontal-row mobile-promotion-row">${promotions.map((promo, index) => `<button type="button" class="mobile-promotion-card" data-promotion-index="${index}"><img src="${esc(promo.image)}" alt="${esc(promo.title)}" loading="lazy" decoding="async"></button>`).join("")}</div></section>`;
  }

  function providersSection() {
    return `<section class="mobile-home-section mobile-provider-section">${sectionHeader("OYUN SAĞLAYICILARI")}<div class="mobile-horizontal-row mobile-provider-row">${providers.map(provider => `<button type="button" class="mobile-provider-card" data-provider="${esc(provider)}"><span>${esc(provider)}</span></button>`).join("")}</div></section>`;
  }

  function trustSection() {
    return `<section class="mobile-home-trust" aria-label="GalaxyBet avantajları">${trustItems.map(item => `<article><img src="${esc(item.icon)}" alt="" loading="lazy"><div><b>${esc(item.title)}</b><span>${esc(item.text)}</span></div></article>`).join("")}</section>`;
  }

  function mobileBanner() {
    const banners = [
      ["assets/banners/home-hero.png", "GalaxyBet hoş geldin kampanyası"],
      ["assets/banners/sports-hero.png", "GalaxyBet spor kampanyası"],
      ["assets/banners/roulette-hero.png", "GalaxyBet rulet kampanyası"],
      ["assets/banners/slot-hero.png", "GalaxyBet slot kampanyası"],
      ["assets/mobile/banners/live-casino-hero-1.png", "GalaxyBet canlı casino kampanyası"],
      ["assets/mobile/banners/big-prize-banner.png", "GalaxyBet büyük ödül kampanyası"],
      ["assets/mobile/banners/vip-casino-banner.png", "GalaxyBet VIP casino kampanyası"]
    ];

    return `
      <section class="mobile-hero-slider" id="mobileHeroSlider" aria-label="Kampanyalar">
        <div class="mobile-hero-track">
          ${banners.map(([src, alt], index) => `<img class="mobile-hero-slide${index === 0 ? " active" : ""}" src="${src}" alt="${alt}">`).join("")}
        </div>
        <div class="mobile-hero-dots" aria-label="Banner seçimi">
          ${banners.map((_, index) => `<button class="${index === 0 ? "active" : ""}" type="button" aria-label="${index + 1}. banner" onclick="setMobileHeroSlide(${index})"></button>`).join("")}
        </div>
      </section>`;
  }

  function categoryCard(icon, title, subtitle) {
    return `<div class="cat"><div class="cat-left"><div class="cat-icon"><img src="${icon}" alt="${title}"></div><div><b>${title}</b><span>${subtitle}</span></div></div><div class="arrow">›</div></div>`;
  }

  function mobileCategories() {
    return `
      <section class="category-row" aria-label="Kategoriler">
        ${categoryCard("assets/icons/categories/football.webp", "FUTBOL", "500+ Lig")}
        ${categoryCard("assets/icons/categories/basketball.webp", "BASKETBOL", "200+ Lig")}
        ${categoryCard("assets/icons/categories/tennis.webp", "TENİS", "150+ Turnuva")}
        ${categoryCard("assets/icons/categories/esport.webp", "E-SPOR", "100+ Karşılaşma")}
        ${categoryCard("assets/icons/categories/live-bet.webp", "CANLI BAHİS", "Anında Bahis")}
        ${categoryCard("assets/mobile/icons/slot-icon.png", "SLOT", "Slot Oyunları")}
      </section>`;
  }

  function mobileHomeContent() {
    return `
      ${mobileBanner()}
      ${mobileCategories()}
      <div class="bb-mobile-home-content" aria-label="Mobil ana sayfa içeriği">
        ${gameSection("POPÜLER OYUNLAR", popularGames, "popular", false)}
        <section class="mobile-home-section">${sectionHeader("CANLI MAÇLAR", "sports")}<div class="mobile-live-match-list">${liveMatches.map(liveMatchCard).join("")}</div></section>
        ${promotionsSection()}
        ${gameSection("YENİ OYUNLAR", newGames, "new", false)}
        ${gameSection("CANLI CASINO", liveCasinoGames, "live-casino", true)}
        ${providersSection()}
        ${trustSection()}
      </div>`;
  }

  function renderMobileHome() {
    const app = document.getElementById("app");
    if (!app) return;

    // Mobile gets its own render tree. Legacy homepage sections are never
    // created and therefore cannot survive in the DOM behind display:none.
    app.innerHTML = window.shell(mobileHomeContent()).replace("👤 Üye Ol", "Üye Ol");
    document.querySelectorAll(".bb-gen-mobile-visuals,.bb-hard-mobile-login-bar,.bb-hard-mobile-login-bar-final,.bb-mobile-auth-actions,.bb-gen-bottom-nav,.bb-bottom-nav-final,.bbf-nav,.bb-clean-nav").forEach(node => node.remove());
    if (typeof window.initMobileHomeSlider === "function") requestAnimationFrame(window.initMobileHomeSlider);
    syncHomeOdds();
  }

  function syncHomeOdds() {
    const slip = readSlip();
    document.querySelectorAll(".mobile-live-odd[data-live-match]").forEach(button => {
      const match = liveMatches.find(item => item.id === button.dataset.liveMatch);
      const selected = Boolean(match && slip.some(item => item.match === matchKey(match) && item.pick === button.dataset.pick));
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  function selectHomeOdd(button) {
    const match = liveMatches.find(item => item.id === button.dataset.liveMatch);
    if (!match || typeof window.addToCoupon !== "function") return;
    const pick = button.dataset.pick;
    const oddIndex = pick === "1" ? 0 : (pick === "X" ? 1 : 2);
    const result = pick === "1" ? match.home : (pick === "X" ? "Beraberlik" : match.away);
    window.addToCoupon(matchKey(match), pick, match.odds[oddIndex], match.league, result);
    syncHomeOdds();
  }

  function openGame(button) {
    const gameId = button.dataset.gameId;
    const title = button.dataset.gameTitle;
    if (gameId && typeof window.launchBetApiGame === "function") {
      window.launchBetApiGame(gameId);
      return;
    }
    if (typeof window.bbPlayCatalogGame === "function") {
      window.bbPlayCatalogGame(title);
      return;
    }
    if (!window.user && typeof window.loginModal === "function") {
      window.loginModal();
      return;
    }
    openCasinoFilter("category", title);
  }

  function markCasinoActive() {
    window.bbActiveBottomPage = "casino";
    document.querySelectorAll(".bb-bottom-nav-real > button[data-page]").forEach(button => {
      button.classList.toggle("active", button.dataset.page === "casino");
      if (button.dataset.page === "casino") button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
  }

  function applyCasinoFilter(type, value) {
    const normalized = String(value || "").toLocaleLowerCase("tr-TR");
    const terms = type === "titles"
      ? normalized.split("|").map(term => term.trim()).filter(Boolean)
      : [normalized];
    let cards = [...document.querySelectorAll(".bb-real-game-card,.bb-catalog-game-card,.premium-game-card,.bb-public-game-card-final,.gamblehub-game-card")];
    if (!cards.length) {
      const grid = document.querySelector(".bb-real-games-grid,.bb-catalog-games-grid,.bb-public-games-grid-final,.gamblehub-games-grid");
      if (grid) {
        const catalog = [...popularGames, ...newGames, ...liveCasinoGames];
        const filtered = catalog.filter(game => {
          const searchable = `${game.title} ${game.provider} ${game.category}`.toLocaleLowerCase("tr-TR");
          return !normalized || terms.some(term => searchable.includes(term));
        });
        grid.classList.add("bb-filtered-casino-results", "mobile-game-row");
        grid.innerHTML = filtered.length
          ? filtered.map((game, index) => renderGameCard(game, index, game.category === "Canlı Casino")).join("")
          : `<div class="mobile-casino-empty"><b>${esc(value)}</b><span>Bu filtrede gösterilecek oyunlar hazırlanıyor.</span></div>`;
        cards = [...grid.querySelectorAll(".mobile-game-card")];
      }
    }
    cards.forEach(card => {
      const providerText = card.querySelector(".mobile-game-meta span,.gamblehub-game-image span,small,.premium-game-provider,.bb-public-game-card-info span")?.textContent || "";
      const cardText = type === "provider" ? providerText : card.textContent;
      const searchable = String(cardText).toLocaleLowerCase("tr-TR");
      const visible = !normalized || terms.some(term => searchable.includes(term));
      card.hidden = !visible;
    });

    const input = document.getElementById("betGameSearchInput");
    if (input && type !== "provider") {
      input.value = normalized === "popüler" ? "" : value;
      if (typeof window.searchBetGames === "function") window.searchBetGames();
    }
    const pageTitle = document.querySelector(".bb-real-games-hero h1,.bb-games-mobile-hero h1,.bb-public-games-hero h1,.gamblehub-hero h1");
    if (pageTitle && value) pageTitle.textContent = type === "provider" ? value : "Filtrelenmiş Oyunlar";
  }

  function openCasinoFilter(type, value) {
    if (typeof window.navigateMobile === "function") window.navigateMobile("casino");
    else if (typeof window.renderCasino === "function") window.renderCasino();
    markCasinoActive();
    window.scrollTo({ top:0, behavior:"auto" });

    let runs = 0;
    const filterTimer = window.setInterval(() => {
      applyCasinoFilter(type, value);
      markCasinoActive();
      runs += 1;
      if (runs >= 60) window.clearInterval(filterTimer);
    }, 250);
  }

  function openPromotion(index) {
    const promotion = promotions[index];
    if (!promotion) return;
    if (typeof window.modal === "function") {
      window.modal(`
        <div class="mobile-promotion-modal">
          <button type="button" class="mobile-promotion-close" data-close-promotion aria-label="Kapat">×</button>
          <img src="${esc(promotion.image)}" alt="${esc(promotion.title)}">
          <div><span>GALAXYBET KAMPANYA</span><h2>${esc(promotion.title)}</h2><p>${esc(promotion.text)}</p><button type="button" class="btn primary full-btn" data-close-promotion>Kampanyayı İncele</button></div>
        </div>`);
      return;
    }
    if (typeof window.renderPromotions === "function") window.renderPromotions();
  }

  document.addEventListener("error", event => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement) || !image.closest(".bb-mobile-home-content")) return;
    if (image.closest(".mobile-live-team-logo")) {
      const holder = image.closest(".mobile-live-team-logo");
      holder.innerHTML = `<b aria-hidden="true">${esc(image.alt || "--")}</b>`;
      return;
    }
    const fallback = image.dataset.fallback || FALLBACK_IMAGE;
    if (!image.src.endsWith(fallback)) image.src = fallback;
  }, true);

  document.addEventListener("click", event => {
    const target = event.target;
    const odd = target.closest(".mobile-live-odd[data-live-match]");
    if (odd) {
      event.preventDefault();
      selectHomeOdd(odd);
      return;
    }

    const play = target.closest(".mobile-game-play");
    if (play) {
      event.preventDefault();
      openGame(play);
      return;
    }

    const promotion = target.closest("[data-promotion-index]");
    if (promotion) {
      event.preventDefault();
      openPromotion(Number(promotion.dataset.promotionIndex));
      return;
    }

    const provider = target.closest("[data-provider]");
    if (provider) {
      event.preventDefault();
      openCasinoFilter("provider", provider.dataset.provider);
      return;
    }

    const action = target.closest("[data-home-action]")?.dataset.homeAction;
    if (!action) return;
    event.preventDefault();
    if (action === "sports") {
      if (typeof window.navigateMobile === "function") window.navigateMobile("sports");
      else if (typeof window.renderSports === "function") window.renderSports();
    } else if (action === "promotions") {
      if (typeof window.renderPromotions === "function") window.renderPromotions();
    } else {
      const filters = {
        popular:["titles", popularGames.map(game => game.title).join("|")],
        new:["titles", newGames.map(game => game.title).join("|")],
        "live-casino":["category", "Canlı Casino"]
      };
      if (filters[action]) openCasinoFilter(filters[action][0], filters[action][1]);
    }
  });

  document.addEventListener("click", event => {
    if (!event.target.closest("[data-close-promotion]")) return;
    event.target.closest(".modal-back")?.remove();
  });

  if (typeof window.renderHome === "function") {
    const originalRenderHome = window.renderHome;
    window.renderHome = function () {
      if (!window.matchMedia(MOBILE_QUERY).matches) {
        return originalRenderHome.apply(this, arguments);
      }
      renderMobileHome();
    };
  }

  window.bbOpenCasinoFilter = openCasinoFilter;
  const requestedPage = location.hash.slice(1) || localStorage.getItem("bozobetMobileView") || "home";
  if (window.matchMedia(MOBILE_QUERY).matches && requestedPage === "home") {
    renderMobileHome();
  }
  window.addEventListener("load", () => {
    if (window.matchMedia(MOBILE_QUERY).matches && window.bbActiveBottomPage === "home") {
      renderMobileHome();
    }
  });
})();
