(function () {
  "use strict";

  const TEAM_LOGO_BASE = "assets/futbol takım logoları/";
  const TEAM_LOGOS = {
    arsenal: TEAM_LOGO_BASE + "english-premier-league-2026-2027.football-logos.cc/64x64/arsenal.football-logos.cc.png",
    chelsea: TEAM_LOGO_BASE + "english-premier-league-2026-2027.football-logos.cc/64x64/chelsea.football-logos.cc.png",
    liverpool: TEAM_LOGO_BASE + "english-premier-league-2026-2027.football-logos.cc/64x64/liverpool.football-logos.cc.png",
    manchesterCity: TEAM_LOGO_BASE + "english-premier-league-2026-2027.football-logos.cc/64x64/manchester-city.football-logos.cc.png",
    galatasaray: TEAM_LOGO_BASE + "turkey-super-lig-2025-2026.football-logos.cc/64x64/galatasaray.football-logos.cc.png",
    fenerbahce: TEAM_LOGO_BASE + "turkey-super-lig-2025-2026.football-logos.cc/64x64/fenerbahce.football-logos.cc.png",
    besiktas: TEAM_LOGO_BASE + "turkey-super-lig-2025-2026.football-logos.cc/64x64/besiktas.football-logos.cc.png",
    barcelona: TEAM_LOGO_BASE + "spain-la-liga-2025-2026.football-logos.cc/64x64/barcelona.football-logos.cc.png",
    realMadrid: TEAM_LOGO_BASE + "spain-la-liga-2025-2026.football-logos.cc/64x64/real-madrid.football-logos.cc.png",
    inter: TEAM_LOGO_BASE + "italy-serie-a-2025-2026.football-logos.cc/64x64/inter.football-logos.cc.png",
    juventus: TEAM_LOGO_BASE + "italy-serie-a-2025-2026.football-logos.cc/64x64/juventus.football-logos.cc.png",
    bayern: TEAM_LOGO_BASE + "germany-bundesliga-2025-2026.football-logos.cc/64x64/bayern-munchen.football-logos.cc.png",
    dortmund: TEAM_LOGO_BASE + "germany-bundesliga-2025-2026.football-logos.cc/64x64/borussia-dortmund.football-logos.cc.png"
  };

  const sportsbookEvents = [
    { id:"live-ars-che", sport:"Futbol", league:"Premier League", live:true, minute:"68'", startTime:"", home:"Arsenal", away:"Chelsea", score:"2 - 1", markets:{home:1.62,draw:3.85,away:5.20}, marketCount:42, homeLogo:TEAM_LOGOS.arsenal, awayLogo:TEAM_LOGOS.chelsea },
    { id:"live-gs-fb", sport:"Futbol", league:"Süper Lig", live:true, minute:"34'", startTime:"", home:"Galatasaray", away:"Fenerbahçe", score:"1 - 0", markets:{home:2.05,draw:3.20,away:3.45}, marketCount:58, homeLogo:TEAM_LOGOS.galatasaray, awayLogo:TEAM_LOGOS.fenerbahce },
    { id:"live-rm-bar", sport:"Futbol", league:"La Liga", live:true, minute:"52'", startTime:"", home:"Real Madrid", away:"Barcelona", score:"1 - 1", markets:{home:2.32,draw:3.05,away:2.88}, marketCount:67, homeLogo:TEAM_LOGOS.realMadrid, awayLogo:TEAM_LOGOS.barcelona },
    { id:"live-efes-fcb", sport:"Basketbol", league:"EuroLeague", live:true, minute:"3. Çeyrek · 04:18", startTime:"", home:"Anadolu Efes", away:"Barcelona", score:"61 - 57", markets:{home:1.48,draw:12.00,away:2.54}, marketCount:24 },
    { id:"live-lal-bos", sport:"Basketbol", league:"NBA", live:true, minute:"4. Çeyrek · 08:42", startTime:"", home:"LA Lakers", away:"Boston Celtics", score:"94 - 91", markets:{home:1.76,draw:14.00,away:1.98}, marketCount:31 },
    { id:"live-sin-alc", sport:"Tenis", league:"ATP", live:true, minute:"2. Set", startTime:"", home:"J. Sinner", away:"C. Alcaraz", score:"6-4 · 2-3", markets:{home:1.72,draw:8.50,away:2.08}, marketCount:18 },
    { id:"up-liv-mci", sport:"Futbol", league:"Premier League", live:false, dateGroup:"Bugün", minute:"", startTime:"20:00", home:"Liverpool", away:"Manchester City", score:"-", markets:{home:2.44,draw:3.40,away:2.66}, marketCount:86, homeLogo:TEAM_LOGOS.liverpool, awayLogo:TEAM_LOGOS.manchesterCity },
    { id:"up-bjk-gs", sport:"Futbol", league:"Süper Lig", live:false, dateGroup:"Bugün", minute:"", startTime:"21:30", home:"Beşiktaş", away:"Galatasaray", score:"-", markets:{home:2.75,draw:3.15,away:2.42}, marketCount:74, homeLogo:TEAM_LOGOS.besiktas, awayLogo:TEAM_LOGOS.galatasaray },
    { id:"up-int-juv", sport:"Futbol", league:"Serie A", live:false, dateGroup:"Yarın", minute:"", startTime:"19:45", home:"Inter", away:"Juventus", score:"-", markets:{home:1.92,draw:3.30,away:3.85}, marketCount:63, homeLogo:TEAM_LOGOS.inter, awayLogo:TEAM_LOGOS.juventus },
    { id:"up-bay-bvb", sport:"Futbol", league:"Bundesliga", live:false, dateGroup:"Yarın", minute:"", startTime:"22:00", home:"Bayern Münih", away:"Borussia Dortmund", score:"-", markets:{home:1.68,draw:4.10,away:4.35}, marketCount:91, homeLogo:TEAM_LOGOS.bayern, awayLogo:TEAM_LOGOS.dortmund },
    { id:"up-rm-ars", sport:"Futbol", league:"Şampiyonlar Ligi", live:false, dateGroup:"Hafta Sonu", minute:"", startTime:"22:45", home:"Real Madrid", away:"Arsenal", score:"-", markets:{home:2.08,draw:3.35,away:3.25}, marketCount:105, homeLogo:TEAM_LOGOS.realMadrid, awayLogo:TEAM_LOGOS.arsenal },
    { id:"up-bar-rso", sport:"Futbol", league:"La Liga", live:false, dateGroup:"Hafta Sonu", minute:"", startTime:"18:30", home:"Barcelona", away:"Real Sociedad", score:"-", markets:{home:1.42,draw:4.45,away:6.60}, marketCount:78, homeLogo:TEAM_LOGOS.barcelona },
    { id:"up-mil-nap", sport:"Futbol", league:"Serie A", live:false, dateGroup:"Hafta Sonu", minute:"", startTime:"21:45", home:"Milan", away:"Napoli", score:"-", markets:{home:2.18,draw:3.10,away:3.28}, marketCount:57 },
    { id:"up-nba", sport:"Basketbol", league:"NBA", live:false, dateGroup:"Yarın", minute:"", startTime:"03:30", home:"Golden State Warriors", away:"Miami Heat", score:"-", markets:{home:1.57,draw:13.00,away:2.35}, marketCount:39 },
    { id:"up-euro", sport:"Basketbol", league:"EuroLeague", live:false, dateGroup:"Hafta Sonu", minute:"", startTime:"20:30", home:"Fenerbahçe Beko", away:"Olympiacos", score:"-", markets:{home:1.80,draw:12.00,away:1.94}, marketCount:33 },
    { id:"up-atp", sport:"Tenis", league:"ATP", live:false, dateGroup:"Bugün", minute:"", startTime:"16:00", home:"A. Zverev", away:"D. Medvedev", score:"-", markets:{home:1.88,draw:7.50,away:1.92}, marketCount:22 },
    { id:"up-volley", sport:"Voleybol", league:"CEV Şampiyonlar Ligi", live:false, dateGroup:"Yarın", minute:"", startTime:"19:00", home:"VakıfBank", away:"Conegliano", score:"-", markets:{home:1.74,draw:9.00,away:2.02}, marketCount:16 },
    { id:"up-esport", sport:"E-Spor", league:"ESL Pro League", live:false, dateGroup:"Hafta Sonu", minute:"", startTime:"17:00", home:"NAVI", away:"G2 Esports", score:"-", markets:{home:1.66,draw:6.50,away:2.18}, marketCount:29 }
  ];

  const leagueOrder = ["Şampiyonlar Ligi", "Premier League", "Süper Lig", "La Liga", "Serie A", "Bundesliga", "EuroLeague", "NBA", "ATP"];
  const sportIcons = { Futbol:"⚽", Basketbol:"◉", Tenis:"●", Voleybol:"◆", "E-Spor":"⌁" };
  const state = { tab:"live", sport:"Futbol", date:"Bugün", league:"Şampiyonlar Ligi", query:"", searchOpen:false, events:[] };
  let desktopRenderSports = window.renderSports;

  function esc(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function readSlip() {
    try {
      const value = JSON.parse(localStorage.getItem("bozobetBetSlip") || "[]");
      return Array.isArray(value) ? value : [];
    } catch (error) {
      return [];
    }
  }

  function matchId(event) { return event.home + " - " + event.away; }
  function selectionName(event, pick) { return pick === "1" ? event.home : (pick === "X" ? "Beraberlik" : event.away); }
  function isSelected(event, pick) { return readSlip().some(item => item.match === matchId(event) && item.pick === pick); }

  /*
   * Stage API login, API password, user_id, secret_api_key ve Transfer Wallet
   * veya Seamless Wallet callback bilgileri geldiğinde yalnızca
   * loadSportsbookEvents ile bahis gönderme katmanı değiştirilecektir.
   * Gerçek API anahtarları frontend'e yazılmamalı; secret bilgiler backend
   * ya da serverless function içinde tutulmalıdır.
   */
  async function loadSportsbookEvents() {
    return sportsbookEvents.map(normalizeSportsbookEvent);
  }

  function normalizeSportsbookEvent(rawEvent) {
    const rawMarkets = rawEvent && rawEvent.markets ? rawEvent.markets : {};
    return {
      id:String(rawEvent.id), sport:String(rawEvent.sport || "Futbol"), league:String(rawEvent.league || "Diğer"),
      live:Boolean(rawEvent.live), minute:String(rawEvent.minute || ""), startTime:String(rawEvent.startTime || ""),
      dateGroup:String(rawEvent.dateGroup || "Bugün"), home:String(rawEvent.home || "Ev Sahibi"),
      away:String(rawEvent.away || "Deplasman"), score:String(rawEvent.score || "-"),
      markets:{ home:Number(rawMarkets.home), draw:Number(rawMarkets.draw), away:Number(rawMarkets.away) },
      marketCount:Number(rawEvent.marketCount || 0), homeLogo:rawEvent.homeLogo || "", awayLogo:rawEvent.awayLogo || ""
    };
  }

  function teamLogo(event, side) {
    const name = event[side];
    const logo = event[side + "Logo"];
    if (logo) return '<img src="' + esc(logo) + '" alt="' + esc(name) + '" loading="lazy">';
    return '<span aria-hidden="true">' + esc(name.split(/\s+/).map(part => part[0]).slice(0, 2).join("")) + '</span>';
  }

  function oddButton(event, pick, odd) {
    return '<button type="button" class="sportsbook-odd odd' + (isSelected(event, pick) ? ' selected' : '') + '"' +
      ' data-match-id="' + esc(matchId(event)) + '" data-pick="' + pick + '" aria-pressed="' + isSelected(event, pick) + '"' +
      ' onclick="selectSportsbookOdd(\'' + esc(event.id) + '\',\'' + pick + '\')">' +
      '<small>' + pick + '</small><strong>' + Number(odd).toFixed(2) + '</strong></button>';
  }

  function eventCard(event) {
    const liveMeta = event.live
      ? '<span class="sportsbook-live"><i></i> CANLI</span><b>' + esc(event.minute) + '</b>'
      : '<span class="sportsbook-time">' + esc(event.startTime) + '</span><b>' + esc(event.dateGroup) + '</b>';
    return '<article class="sportsbook-event" data-event-id="' + esc(event.id) + '">' +
      '<header><div class="sportsbook-event-meta">' + liveMeta + '<span>' + esc(event.league) + '</span></div>' +
      '<button type="button" class="sportsbook-favorite" aria-label="Favoriye ekle" onclick="toggleSportsbookFavorite(this)">☆</button></header>' +
      '<div class="sportsbook-fixture"><div class="sportsbook-teams">' +
      '<div><span class="sportsbook-team-logo">' + teamLogo(event, "home") + '</span><strong>' + esc(event.home) + '</strong></div>' +
      '<div><span class="sportsbook-team-logo">' + teamLogo(event, "away") + '</span><strong>' + esc(event.away) + '</strong></div></div>' +
      '<div class="sportsbook-score">' + esc(event.score).replace(" - ", "<br>") + '</div></div>' +
      '<div class="sportsbook-market"><span class="sportsbook-market-label">Maç Sonucu</span><div class="sportsbook-odds">' +
      oddButton(event, "1", event.markets.home) + oddButton(event, "X", event.markets.draw) + oddButton(event, "2", event.markets.away) +
      '<button type="button" class="sportsbook-more" aria-label="Daha fazla market">+' + event.marketCount + '</button></div></div>' +
      (!event.live ? '<button type="button" class="sportsbook-more-link">Daha Fazla Market <span>›</span></button>' : '') + '</article>';
  }

  function filteredEvents(events) {
    let result = events.slice();
    if (state.tab === "live") result = result.filter(event => event.live && event.sport === state.sport);
    if (state.tab === "upcoming") result = result.filter(event => !event.live && event.sport === state.sport && event.dateGroup === state.date);
    if (state.tab === "leagues") result = result.filter(event => event.league === state.league);
    if (state.query) {
      const query = state.query.toLocaleLowerCase("tr-TR");
      result = result.filter(event => [event.home, event.away, event.league, event.sport].join(" ").toLocaleLowerCase("tr-TR").includes(query));
    }
    return result;
  }

  function renderSportsbookEvents(events) {
    const target = document.getElementById("sportsbookEventList");
    if (!target) return;
    const filtered = filteredEvents(events.map(normalizeSportsbookEvent));
    target.innerHTML = filtered.length ? filtered.map(eventCard).join("") : '<div class="sportsbook-empty"><span>⌕</span><b>Karşılaşma bulunamadı</b><p>Başka bir kategori veya filtre deneyin.</p></div>';
  }

  function sportStrip() {
    return '<div class="sportsbook-sports" aria-label="Spor kategorileri">' + Object.keys(sportIcons).map(sport =>
      '<button type="button" class="' + (state.sport === sport ? 'active' : '') + '" onclick="setSportsbookSport(\'' + esc(sport) + '\')">' +
      '<span>' + sportIcons[sport] + '</span><b>' + esc(sport) + '</b></button>').join("") + '</div>';
  }

  function filters() {
    if (state.tab === "upcoming") return '<div class="sportsbook-date-filters">' + ["Bugün", "Yarın", "Hafta Sonu"].map(date =>
      '<button type="button" class="' + (state.date === date ? 'active' : '') + '" onclick="setSportsbookDate(\'' + date + '\')">' + date + '</button>').join("") + '</div>';
    if (state.tab === "leagues") return '<div class="sportsbook-leagues">' + leagueOrder.map(league => {
      const count = state.events.filter(event => event.league === league).length;
      return '<button type="button" class="' + (state.league === league ? 'active' : '') + '" onclick="setSportsbookLeague(\'' + esc(league) + '\')"><span>★</span><b>' + esc(league) + '</b><small>' + count + ' maç</small><i>›</i></button>';
    }).join("") + '</div>';
    return "";
  }

  function pageMarkup() {
    return '<section id="mobile-sports-view" class="mobile-sportsbook">' +
      '<header class="sportsbook-head"><div><small>GALAXYBET SPORTS</small><h1>Spor Bahisleri</h1></div>' +
      '<button type="button" aria-label="Maç ara" aria-expanded="' + state.searchOpen + '" onclick="toggleSportsbookSearch()">⌕</button></header>' +
      '<div class="sportsbook-search' + (state.searchOpen ? ' open' : '') + '"><input id="sportsbookSearch" type="search" value="' + esc(state.query) + '" placeholder="Takım veya lig ara" oninput="searchSportsbook(this.value)"></div>' +
      '<nav class="sportsbook-tabs" role="tablist">' + [["live","Canlı"],["upcoming","Yaklaşan"],["leagues","Ligler"]].map(tab =>
      '<button type="button" role="tab" aria-selected="' + (state.tab === tab[0]) + '" class="' + (state.tab === tab[0] ? 'active' : '') + '" onclick="setSportsbookTab(\'' + tab[0] + '\')">' + tab[1] + (tab[0] === "live" ? '<i></i>' : '') + '</button>').join("") + '</nav>' +
      (state.tab !== "leagues" ? sportStrip() : '') + filters() +
      '<div class="sportsbook-list-head"><div><small>' + (state.tab === "live" ? "ŞİMDİ CANLI" : state.tab === "upcoming" ? state.date.toLocaleUpperCase("tr-TR") : "SEÇİLİ LİG") + '</small><h2>' + (state.tab === "leagues" ? esc(state.league) : esc(state.sport) + ' Maçları') + '</h2></div><span id="sportsbookEventCount"></span></div>' +
      '<div id="sportsbookEventList" class="sportsbook-event-list"></div></section>';
  }

  function renderMobileSportsbook() {
    const app = document.getElementById("app");
    if (!app || typeof window.shell !== "function") return;
    app.innerHTML = window.shell(pageMarkup());
    renderSportsbookEvents(state.events);
    const count = document.getElementById("sportsbookEventCount");
    if (count) count.textContent = filteredEvents(state.events).length + " karşılaşma";
  }

  async function openMobileSportsbook() {
    state.events = await loadSportsbookEvents();
    renderMobileSportsbook();
    window.scrollTo({ top:0, behavior:"auto" });
  }

  window.sportsbookEvents = sportsbookEvents;
  window.loadSportsbookEvents = loadSportsbookEvents;
  window.normalizeSportsbookEvent = normalizeSportsbookEvent;
  window.renderSportsbookEvents = renderSportsbookEvents;
  window.renderSports = function () {
    if (window.matchMedia("(max-width: 760px)").matches) return openMobileSportsbook();
    return typeof desktopRenderSports === "function" ? desktopRenderSports.apply(this, arguments) : undefined;
  };

  window.setSportsbookTab = function (tab) { state.tab = ["live","upcoming","leagues"].includes(tab) ? tab : "live"; renderMobileSportsbook(); };
  window.setSportsbookSport = function (sport) { state.sport = Object.prototype.hasOwnProperty.call(sportIcons, sport) ? sport : "Futbol"; renderMobileSportsbook(); };
  window.setSportsbookDate = function (date) { state.date = ["Bugün","Yarın","Hafta Sonu"].includes(date) ? date : "Bugün"; renderMobileSportsbook(); };
  window.setSportsbookLeague = function (league) { state.league = leagueOrder.includes(league) ? league : leagueOrder[0]; renderMobileSportsbook(); };
  window.toggleSportsbookSearch = function () { state.searchOpen = !state.searchOpen; renderMobileSportsbook(); if (state.searchOpen) requestAnimationFrame(() => document.getElementById("sportsbookSearch")?.focus()); };
  window.searchSportsbook = function (query) { state.query = String(query || ""); renderSportsbookEvents(state.events); const count = document.getElementById("sportsbookEventCount"); if (count) count.textContent = filteredEvents(state.events).length + " karşılaşma"; };
  window.toggleSportsbookFavorite = function (button) { const active = button.classList.toggle("active"); button.textContent = active ? "★" : "☆"; button.setAttribute("aria-label", active ? "Favorilerden çıkar" : "Favoriye ekle"); };
  window.selectSportsbookOdd = function (eventId, pick) {
    const event = state.events.find(item => item.id === eventId);
    if (!event || typeof window.addToCoupon !== "function") return;
    const odd = pick === "1" ? event.markets.home : (pick === "X" ? event.markets.draw : event.markets.away);
    window.addToCoupon(matchId(event), pick, odd, event.league, selectionName(event, pick));
    renderSportsbookEvents(state.events);
  };
})();
