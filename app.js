const AUTH_CURRENT_USER_KEY = "bozobetCurrentUser";
const AUTH_SESSION_KEY = "bozobetSession";
const AUTH_REMEMBER_KEY = "bozobetRememberMe";
const AUTH_SESSION_MAX_IDLE = 30 * 24 * 60 * 60 * 1000;
const AUTH_TOUCH_THROTTLE = 30 * 1000;
const LEGACY_AUTH_KEYS = [
  "bozobet_user",
  "bozobet_current_user",
  "currentUser",
  "loggedInUser",
  "userSession",
  "bozobetUser"
];

function parseStoredJson(storage, key){
  try{
    return JSON.parse(storage.getItem(key) || "null");
  }catch(error){
    storage.removeItem(key);
    return null;
  }
}

function sessionStorageFor(rememberMe){
  return rememberMe ? localStorage : sessionStorage;
}

function sanitizeSessionUser(value){
  if(!value || typeof value !== "object" || (!value.username && !value.id)) return null;
  const safeUser = {...value};
  delete safeUser.password;
  return safeUser;
}

function defaultSessionUser(session){
  const identity = session?.username || session?.userId;
  if(!identity) return null;
  return {
    id:session.userId || identity,
    username:String(identity),
    name:"GalaxyBet",
    surname:"Üyesi",
    email:"",
    phone:"",
    tc:"",
    birth:"",
    balance:0,
    role:session?.role || (String(identity).toLocaleLowerCase("tr-TR") === "admin" ? "admin" : "user")
  };
}

function recoverSessionUser(session){
  const users = parseStoredJson(localStorage, "bozobet_users");
  if(Array.isArray(users)){
    const recovered = users.find(item =>
      String(item?.id || "") === String(session?.userId || "") ||
      String(item?.username || "").toLocaleLowerCase("tr-TR") === String(session?.username || "").toLocaleLowerCase("tr-TR")
    );
    const safeUser = sanitizeSessionUser(recovered);
    if(safeUser) return safeUser;
  }
  return defaultSessionUser(session);
}

function isSessionValid(session){
  if(!session || typeof session !== "object") return false;
  const lastActivity = Number(session.lastActivity);
  return Boolean(
    (session.userId || session.username) &&
    Number.isFinite(lastActivity) &&
    Date.now() - lastActivity < AUTH_SESSION_MAX_IDLE
  );
}

function writeSession(storage, authUser, session){
  storage.setItem(AUTH_CURRENT_USER_KEY, JSON.stringify(authUser));
  storage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  storage.setItem(AUTH_REMEMBER_KEY, String(session.rememberMe));
}

function clearAuthStorage(storage){
  storage.removeItem(AUTH_CURRENT_USER_KEY);
  storage.removeItem(AUTH_SESSION_KEY);
  storage.removeItem(AUTH_REMEMBER_KEY);
}

function saveSession(authUser, rememberMe){
  const safeUser = sanitizeSessionUser(authUser);
  if(!safeUser) return null;

  const persistent = Boolean(rememberMe);
  const now = Date.now();
  const session = {
    userId:safeUser.id || safeUser.username,
    username:safeUser.username || String(safeUser.id),
    loginTime:now,
    lastActivity:now,
    rememberMe:persistent,
    role:safeUser.role || "user"
  };

  clearAuthStorage(localStorage);
  clearAuthStorage(sessionStorage);
  writeSession(sessionStorageFor(persistent), safeUser, session);
  LEGACY_AUTH_KEYS.forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
  return safeUser;
}

function loadSessionFrom(storage, expectedRememberMe){
  const session = parseStoredJson(storage, AUTH_SESSION_KEY);
  let storedUser = sanitizeSessionUser(parseStoredJson(storage, AUTH_CURRENT_USER_KEY));
  const rememberValue = storage.getItem(AUTH_REMEMBER_KEY) === "true";

  if(!session && !storedUser) return null;
  if(!isSessionValid(session) || rememberValue !== expectedRememberMe || Boolean(session.rememberMe) !== expectedRememberMe){
    clearAuthStorage(storage);
    return null;
  }
  if(!storedUser){
    storedUser = recoverSessionUser(session);
    if(!storedUser){
      clearAuthStorage(storage);
      return null;
    }
    storage.setItem(AUTH_CURRENT_USER_KEY, JSON.stringify(storedUser));
  }
  if(String(session.userId) !== String(storedUser.id || storedUser.username)){
    const recoveredUser = recoverSessionUser(session);
    if(!recoveredUser || String(session.userId) !== String(recoveredUser.id || recoveredUser.username)){
      clearAuthStorage(storage);
      return null;
    }
    storedUser = recoveredUser;
    storage.setItem(AUTH_CURRENT_USER_KEY, JSON.stringify(storedUser));
  }
  return storedUser;
}

function migrateLegacySession(){
  const legacyUser = sanitizeSessionUser(parseStoredJson(localStorage, "bozobet_user"));
  LEGACY_AUTH_KEYS.forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
  return legacyUser ? saveSession(legacyUser, true) : null;
}

function loadSession(){
  const persistentUser = loadSessionFrom(localStorage, true);
  if(persistentUser){
    clearAuthStorage(sessionStorage);
    return persistentUser;
  }

  const temporaryUser = loadSessionFrom(sessionStorage, false);
  if(temporaryUser) return temporaryUser;

  return migrateLegacySession();
}

function clearSession(){
  clearAuthStorage(localStorage);
  clearAuthStorage(sessionStorage);
  LEGACY_AUTH_KEYS.forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

function activeSessionStorage(){
  if(isSessionValid(parseStoredJson(localStorage, AUTH_SESSION_KEY))) return localStorage;
  if(isSessionValid(parseStoredJson(sessionStorage, AUTH_SESSION_KEY))) return sessionStorage;
  return null;
}

function touchSession(){
  if(!user) return false;
  const storage = activeSessionStorage();
  if(!storage){
    clearSession();
    applyGuestUI(true);
    return false;
  }

  const session = parseStoredJson(storage, AUTH_SESSION_KEY);
  session.lastActivity = Date.now();
  storage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  return true;
}

function persistSessionUser(){
  if(!user) return;
  const storage = activeSessionStorage();
  const safeUser = sanitizeSessionUser(user);
  if(storage && safeUser) storage.setItem(AUTH_CURRENT_USER_KEY, JSON.stringify(safeUser));
  window.user = safeUser;
}

function applyAuthenticatedUI(authUser, rerender){
  user = sanitizeSessionUser(authUser);
  window.user = user;
  document.body.classList.toggle("is-authenticated", Boolean(user));
  document.body.classList.toggle("is-guest", !user);
  if(rerender && typeof renderHome === "function") renderHome();
}

function applyGuestUI(rerender){
  user = null;
  window.user = null;
  document.body.classList.remove("is-authenticated");
  document.body.classList.add("is-guest");
  if(rerender && typeof renderHome === "function") renderHome();
}

function getAuthenticatedUser(){
  if(!user) return null;
  if(!activeSessionStorage()){
    clearSession();
    applyGuestUI(true);
    return null;
  }
  return user;
}

let user = null;
user = loadSession();
if(user) applyAuthenticatedUI(user);
else applyGuestUI();

window.saveSession = saveSession;
window.loadSession = loadSession;
window.clearSession = clearSession;
window.isSessionValid = isSessionValid;
window.touchSession = touchSession;
window.applyAuthenticatedUI = applyAuthenticatedUI;
window.applyGuestUI = applyGuestUI;
window.getAuthenticatedUser = getAuthenticatedUser;

let lastSessionTouch = 0;
function throttledSessionTouch(){
  const now = Date.now();
  if(now - lastSessionTouch < AUTH_TOUCH_THROTTLE) return;
  lastSessionTouch = now;
  touchSession();
}

["mousemove", "keydown", "click", "touchstart"].forEach(eventName => {
  document.addEventListener(eventName, throttledSessionTouch, {passive:true});
});

setInterval(() => {
  if(user && !activeSessionStorage()){
    clearSession();
    applyGuestUI(true);
  }
}, 60 * 1000);
let coupon = (() => {
  try{
    const stored = JSON.parse(localStorage.getItem("bozobetBetSlip") || "[]");
    return Array.isArray(stored) ? stored : [];
  }catch(error){
    return [];
  }
})();

// MOBILE ROUTING + PERSISTENT DEMO COUPON SYSTEM
(function(){
  "use strict";

  const BET_SLIP_KEY = "bozobetBetSlip";
  const COUPON_HISTORY_KEY = "bozobetCouponHistory";
  const COUPON_STAKE_KEY = "bozobetCouponStake";
  const MOBILE_VIEW_KEY = "bozobetMobileView";
  const mobilePages = ["home", "sports", "casino", "coupon", "profile"];
  let activeMobilePage = "home";
  let activeCouponTab = "active";
  let navSyncQueued = false;

  function esc(value){
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function readArray(key){
    try{
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value : [];
    }catch(error){
      return [];
    }
  }

  function saveCoupon(){
    localStorage.setItem(BET_SLIP_KEY, JSON.stringify(coupon));
  }

  function getStake(){
    const stored = localStorage.getItem(COUPON_STAKE_KEY);
    const legacy = localStorage.getItem("coupon_stake");
    const value = Number(stored ?? legacy ?? 100);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }

  function totalOdd(){
    return coupon.reduce((total, selection) => {
      const odd = Number(selection.odd);
      return total * (Number.isFinite(odd) && odd > 0 ? odd : 1);
    }, 1);
  }

  function selectionResult(match, pick){
    if(pick === "1") return match.home || "Ev sahibi";
    if(pick === "X") return "Beraberlik";
    return match.away || "Deplasman";
  }

  function matchKey(match){
    return `${match.home || ""} - ${match.away || ""}`;
  }

  function isSelected(match, pick){
    return coupon.some(item => item.match === match && item.pick === pick);
  }

  // The live and upcoming match renderers share this markup on home and sports pages.
  window.matchHtml = function(match){
    const key = matchKey(match);
    const teamLogo = typeof teamLogoHtml === "function"
      ? teamLogoHtml
      : (name, fallback) => `<span class="club-logo">${esc(fallback || "⚽")}</span>`;
    const oddButton = (pick, odd) => `
      <button
        type="button"
        class="odd ${isSelected(key, pick) ? "selected" : ""}"
        data-match-id="${esc(key)}"
        data-league="${esc(match.league)}"
        data-pick="${pick}"
        data-result="${esc(selectionResult(match, pick))}"
        data-odd="${esc(odd)}"
        aria-pressed="${isSelected(key, pick)}"
        onclick="addToCouponFromButton(this)"
      ><span>${pick}</span><b>${esc(odd)}</b></button>`;

    return `
      <div class="match pro-match" data-match-id="${esc(key)}">
        <div class="match-status">
          <span class="${match.status === "CANLI" ? "live live-pulse" : "time-badge"}">${esc(match.status)}</span>
          <small>${esc(match.minute)}</small>
        </div>
        <div class="teams pro-teams">
          <small><span>${esc(match.flag)}</span> ${esc(match.league)}</small>
          <div class="team-row">
            <div class="club">${teamLogo(match.home, match.homeLogo)}<b>${esc(match.home)}</b></div>
            <div class="score-box">${esc(match.score)}</div>
            <div class="club away"><b>${esc(match.away)}</b>${teamLogo(match.away, match.awayLogo)}</div>
          </div>
        </div>
        <div class="odds pro-odds">
          ${oddButton("1", match.odds?.[0])}
          ${oddButton("X", match.odds?.[1])}
          ${oddButton("2", match.odds?.[2])}
        </div>
        <div class="more">${esc(match.markets)} ›</div>
      </div>`;
  };

  function syncSelectedOdds(){
    document.querySelectorAll(".odd[data-match-id]").forEach(button => {
      const selected = coupon.some(item =>
        item.match === button.dataset.matchId && item.pick === button.dataset.pick
      );
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  function couponBadgeCount(){
    return coupon.length;
  }

  function canonicalNavHtml(){
    const items = [
      ["home", "assets/mobile/icons/nav-home-transparent.png", "Ana Sayfa"],
      ["sports", "assets/mobile/icons/nav-sports-transparent.png", "Spor"],
      ["casino", "assets/mobile/icons/nav-casino-transparent.png", "Casino"],
      ["coupon", "assets/mobile/icons/nav-coupon-transparent.png", "Kupon"],
      ["profile", "assets/mobile/icons/nav-account-transparent.png", "Hesabım"]
    ];

    return items.map(([page, icon, label]) => `
      <button type="button" data-page="${page}" class="${page === "coupon" ? "coupon" : ""}">
        <img src="${icon}" alt="" aria-hidden="true">
        ${page === "coupon" ? `<i class="bb-mobile-coupon-badge">${couponBadgeCount()}</i>` : ""}
        <b>${label}</b>
      </button>`).join("");
  }

  function syncBottomNav(){
    const navs = Array.from(document.querySelectorAll(".bb-bottom-nav-real"));
    const nav = navs.at(-1);
    navs.slice(0, -1).forEach(item => item.remove());
    document.querySelectorAll(".bb-bottom-nav-final,.bb-gen-bottom-nav,.bbf-nav,.bb-clean-nav")
      .forEach(item => item.remove());

    if(!nav) return;
    if(nav.dataset.mobileCouponNav !== "1"){
      nav.dataset.mobileCouponNav = "1";
      nav.setAttribute("aria-label", "Mobil alt navigasyon");
      nav.innerHTML = canonicalNavHtml();
    }

    nav.querySelectorAll(":scope > button").forEach(button => {
      const isActive = button.dataset.page === activeMobilePage;
      button.classList.toggle("active", isActive);
      if(isActive) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });

    const badge = nav.querySelector(".bb-mobile-coupon-badge");
    if(badge) badge.textContent = String(couponBadgeCount());
  }

  function queueNavSync(){
    if(navSyncQueued) return;
    navSyncQueued = true;
    requestAnimationFrame(() => {
      navSyncQueued = false;
      syncBottomNav();
    });
  }

  function ensureBottomNav(){
    let nav = document.querySelector(".bb-bottom-nav-real");
    if(!nav){
      nav = document.createElement("nav");
      nav.className = "bb-bottom-nav-real";
      document.body.appendChild(nav);
    }
    syncBottomNav();
  }

  function setMobilePage(page, updateHistory){
    if(!mobilePages.includes(page)) page = "home";
    activeMobilePage = page;
    window.bbActiveBottomPage = page;
    localStorage.setItem(MOBILE_VIEW_KEY, page);

    if(updateHistory){
      const hash = `#${page}`;
      if(location.hash !== hash) history.pushState({ bozobetPage:page }, "", hash);
    }
    queueNavSync();
  }

  function renderCouponEmpty(){
    return `
      <div class="mobile-coupon-empty">
        <div class="mobile-coupon-empty-icon" aria-hidden="true">▤</div>
        <h2>Kuponunuz henüz boş</h2>
        <p>Bahis oranlarına dokunarak kuponunuza seçim ekleyebilirsiniz.</p>
        <button type="button" class="btn primary" onclick="navigateMobile('sports')">Bahislere Git</button>
      </div>`;
  }

  function renderCouponSelections(){
    const stake = getStake();
    const odd = totalOdd();
    const possibleWin = stake * odd;

    return `
      <div class="mobile-coupon-selections">
        ${coupon.map(selection => `
          <article class="mobile-coupon-selection">
            <div class="mobile-coupon-selection-head">
              <small>${esc(selection.league || "Spor Bahisleri")}</small>
              <button type="button" data-match-id="${esc(selection.match)}" onclick="removeCouponSelection(this)" aria-label="Seçimi kaldır">×</button>
            </div>
            <h3>${esc(selection.match)}</h3>
            <div class="mobile-coupon-pick">
              <span><b>${esc(selection.pick)}</b>${esc(selection.result || selection.pick)}</span>
              <strong>${Number(selection.odd).toFixed(2)}</strong>
            </div>
          </article>`).join("")}

        <section class="mobile-coupon-summary">
          <div><span>Toplam Oran</span><strong id="mobileCouponTotalOdd">${odd.toFixed(2)}</strong></div>
          <label for="mobileCouponStake">Bahis Tutarı</label>
          <div class="mobile-coupon-stake-wrap">
            <span>₺</span>
            <input id="mobileCouponStake" type="number" min="0.01" step="0.01" inputmode="decimal" value="${stake}" oninput="updateMobileCouponStake(this)">
          </div>
          <p id="mobileCouponStakeError" class="mobile-coupon-error" hidden>Geçerli ve pozitif bir bahis tutarı girin.</p>
          <div><span>Tahmini Kazanç</span><strong id="mobileCouponPossibleWin">${money(possibleWin)}</strong></div>
          <button id="mobileCouponPlay" type="button" class="btn primary full-btn" onclick="playCoupon()">Kuponu Oyna</button>
          <button type="button" class="mobile-coupon-clear" onclick="clearCoupon()">Tümünü Temizle</button>
        </section>
      </div>`;
  }

  function currentUserHistory(){
    const history = readArray(COUPON_HISTORY_KEY);
    if(!user) return [];
    const identity = String(user.id || user.username || "");
    return history.filter(item => String(item.userId || item.username || "") === identity || item.username === user.username);
  }

  function renderCouponHistory(){
    const history = currentUserHistory();
    if(!user){
      return `<div class="mobile-coupon-history-empty"><h2>Kupon geçmişi için giriş yapın</h2><p>Oynadığınız demo kuponlar hesabınıza göre listelenir.</p><button class="btn primary" type="button" onclick="loginModal()">Giriş Yap</button></div>`;
    }
    if(!history.length){
      return `<div class="mobile-coupon-history-empty"><h2>Henüz oynanmış kupon yok</h2><p>Oynadığınız demo kuponlar burada görünecek.</p></div>`;
    }

    return `<div class="mobile-coupon-history-list">${history.map(item => `
      <article class="mobile-coupon-history-card">
        <div class="mobile-coupon-history-head"><span>${esc(new Date(item.createdAt).toLocaleString("tr-TR"))}</span><b class="status-${esc(String(item.status).toLowerCase())}">${esc(item.status)}</b></div>
        <div class="mobile-coupon-history-grid">
          <div><small>Seçim</small><strong>${Number(item.selectionCount || item.selections?.length || 0)}</strong></div>
          <div><small>Toplam Oran</small><strong>${Number(item.totalOdd).toFixed(2)}</strong></div>
          <div><small>Bahis Tutarı</small><strong>${money(item.stake)}</strong></div>
          <div><small>Tahmini Kazanç</small><strong>${money(item.possibleWin)}</strong></div>
        </div>
      </article>`).join("")}</div>`;
  }

  function renderCouponView(){
    const app = document.getElementById("app");
    if(!app) return;
    app.innerHTML = shell(`
      <section id="mobile-coupon-view" class="mobile-coupon-page">
        <header class="mobile-coupon-page-head">
          <button type="button" onclick="navigateMobile('sports')" aria-label="Spor sayfasına dön">‹</button>
          <div><small>BAHİS KUPONU</small><h1>Kuponum</h1></div>
          <span>${coupon.length}</span>
        </header>
        <div class="mobile-coupon-tabs" role="tablist">
          <button type="button" role="tab" aria-selected="${activeCouponTab === "active"}" class="${activeCouponTab === "active" ? "active" : ""}" onclick="setCouponTab('active')">Aktif Kupon</button>
          <button type="button" role="tab" aria-selected="${activeCouponTab === "history"}" class="${activeCouponTab === "history" ? "active" : ""}" onclick="setCouponTab('history')">Kupon Geçmişi</button>
        </div>
        <div class="mobile-coupon-tab-content">
          ${activeCouponTab === "history" ? renderCouponHistory() : (coupon.length ? renderCouponSelections() : renderCouponEmpty())}
        </div>
      </section>`);
    ensureBottomNav();
  }

  window.setCouponTab = function(tab){
    activeCouponTab = tab === "history" ? "history" : "active";
    renderCouponView();
  };

  window.renderCoupon = function(){
    setMobilePage("coupon", true);
    renderCouponView();
    window.scrollTo({ top:0, behavior:"auto" });
  };

  window.addToCouponFromButton = function(button){
    window.addToCoupon(
      button.dataset.matchId,
      button.dataset.pick,
      button.dataset.odd,
      button.dataset.league,
      button.dataset.result
    );
  };

  window.addToCoupon = function(match, pick, odd, league, result){
    const numericOdd = Number(odd);
    if(!match || !["1", "X", "2"].includes(String(pick)) || !Number.isFinite(numericOdd) || numericOdd <= 0) return;
    const selection = {
      match:String(match),
      league:String(league || "Spor Bahisleri"),
      pick:String(pick),
      result:String(result || pick),
      odd:Number(numericOdd.toFixed(2))
    };
    const existingIndex = coupon.findIndex(item => item.match === selection.match);
    if(existingIndex >= 0) coupon.splice(existingIndex, 1, selection);
    else coupon.push(selection);
    saveCoupon();
    refreshCouponBox();
    syncSelectedOdds();
    queueNavSync();
  };

  window.removeCouponSelection = function(button){
    const match = button.dataset.matchId;
    coupon = coupon.filter(item => item.match !== match);
    saveCoupon();
    syncSelectedOdds();
    renderCouponView();
  };

  window.removeCoupon = function(index){
    if(Number.isInteger(Number(index))) coupon.splice(Number(index), 1);
    saveCoupon();
    refreshCouponBox();
    syncSelectedOdds();
    if(document.getElementById("mobile-coupon-view")) renderCouponView();
    queueNavSync();
  };

  window.clearCoupon = function(){
    coupon = [];
    saveCoupon();
    refreshCouponBox();
    syncSelectedOdds();
    if(document.getElementById("mobile-coupon-view")) renderCouponView();
    queueNavSync();
  };

  window.updateMobileCouponStake = function(input){
    const value = input.valueAsNumber;
    const valid = Number.isFinite(value) && value > 0;
    const error = document.getElementById("mobileCouponStakeError");
    const playButton = document.getElementById("mobileCouponPlay");
    if(valid){
      localStorage.setItem(COUPON_STAKE_KEY, String(value));
      localStorage.setItem("coupon_stake", String(value));
    }else{
      localStorage.setItem(COUPON_STAKE_KEY, "0");
      localStorage.setItem("coupon_stake", "0");
    }
    if(error) error.hidden = valid;
    if(playButton) playButton.disabled = !valid;
    const possibleWin = document.getElementById("mobileCouponPossibleWin");
    if(possibleWin) possibleWin.textContent = money(valid ? value * totalOdd() : 0);
  };

  window.playCoupon = function(){
    if(!user){
      loginModal();
      return;
    }
    if(!coupon.length){
      alert("Önce kuponunuza bir seçim ekleyin.");
      return;
    }
    const stake = getStake();
    if(!Number.isFinite(stake) || stake <= 0){
      alert("Geçerli ve pozitif bir bahis tutarı girin.");
      return;
    }

    const odd = totalOdd();
    const history = readArray(COUPON_HISTORY_KEY);
    const id = typeof crypto?.randomUUID === "function"
      ? crypto.randomUUID()
      : `coupon-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    history.unshift({
      id,
      userId:String(user.id || user.username || ""),
      username:user.username || "",
      createdAt:new Date().toISOString(),
      status:"Bekliyor",
      selectionCount:coupon.length,
      selections:coupon.map(item => ({ ...item })),
      totalOdd:Number(odd.toFixed(2)),
      stake:Number(stake.toFixed(2)),
      possibleWin:Number((stake * odd).toFixed(2))
    });
    localStorage.setItem(COUPON_HISTORY_KEY, JSON.stringify(history));
    coupon = [];
    saveCoupon();
    activeCouponTab = "history";
    renderCouponView();
    queueNavSync();
  };

  // Keep the existing desktop sports coupon usable while sharing mobile state.
  window.couponHtml = function(){
    if(!coupon.length) return `<h3>Bahis Kuponu</h3><div class="empty-coupon"><b>Kuponun boş</b><span>Oran seçerek kupona ekleyebilirsin.</span></div>`;
    return `<div class="coupon-head"><h3>Bahis Kuponu</h3><button onclick="clearCoupon()">Temizle</button></div><div class="coupon-items">${coupon.map((item, index) => `<div class="coupon-item"><button class="coupon-remove" onclick="removeCoupon(${index})">×</button><b>${esc(item.match)}</b><span>Seçim: ${esc(item.pick)} · ${esc(item.result)}</span><strong>${Number(item.odd).toFixed(2)}</strong></div>`).join("")}</div><div class="coupon-total"><span>Toplam Oran</span><b>${totalOdd().toFixed(2)}</b></div><button class="btn primary full-btn" onclick="renderCoupon()">Kuponu Aç</button>`;
  };

  function openMobilePage(page, updateHistory){
    if(!mobilePages.includes(page)) page = "home";
    if(page === "profile" && !user){
      loginModal();
      return;
    }
    setMobilePage(page, updateHistory);
    if(page === "coupon") renderCouponView();
    else if(page === "home" && typeof renderHome === "function") renderHome();
    else if(page === "sports" && typeof renderSports === "function") renderSports();
    else if(page === "casino" && typeof renderCasino === "function") renderCasino();
    else if(page === "profile" && typeof renderProfile === "function") renderProfile();
    queueNavSync();
    window.scrollTo({ top:0, behavior:"auto" });
  }

  window.navigateMobile = function(page){
    openMobilePage(page, true);
  };

  function installRendererTracking(){
    const mapping = { renderHome:"home", renderSports:"sports", renderCasino:"casino", renderProfile:"profile" };
    Object.entries(mapping).forEach(([name, page]) => {
      const original = window[name];
      if(typeof original !== "function" || original.mobileCouponTracked) return;
      const wrapped = function(){
        setMobilePage(page, location.hash !== `#${page}`);
        const output = original.apply(this, arguments);
        queueNavSync();
        return output;
      };
      wrapped.mobileCouponTracked = true;
      window[name] = wrapped;
    });
  }

  document.addEventListener("click", event => {
    const button = event.target.closest(".bb-bottom-nav-real > button[data-page]");
    if(!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openMobilePage(button.dataset.page, true);
  }, true);

  new MutationObserver(queueNavSync).observe(document.body, { childList:true, subtree:true });
  window.addEventListener("popstate", () => openMobilePage(location.hash.slice(1) || "home", false));
  window.addEventListener("load", () => {
    installRendererTracking();
    ensureBottomNav();
    const hashPage = location.hash.slice(1);
    const storedPage = localStorage.getItem(MOBILE_VIEW_KEY);
    const initialPage = mobilePages.includes(hashPage)
      ? hashPage
      : (mobilePages.includes(storedPage) ? storedPage : "home");
    if(window.innerWidth <= 760) openMobilePage(initialPage, false);
    else syncSelectedOdds();
  });
})();

const defaultMatches = [
  {
    status:"CANLI",
    minute:"45'",
    flag:"🏴",
    league:"İngiltere · Premier Lig",
    home:"Manchester United",
    away:"Arsenal",
    homeLogo:"🔴",
    awayLogo:"🔴",
    score:"1 - 0",
    odds:["1.72","3.60","4.80"],
    markets:"+128"
  },
  {
    status:"CANLI",
    minute:"67'",
    flag:"🇪🇸",
    league:"İspanya · La Liga",
    home:"Barcelona",
    away:"Sevilla",
    homeLogo:"🔵",
    awayLogo:"⚪",
    score:"2 - 1",
    odds:["1.45","4.10","6.20"],
    markets:"+132"
  },
  {
    status:"CANLI",
    minute:"32'",
    flag:"🇮🇹",
    league:"İtalya · Serie A",
    home:"Juventus",
    away:"Roma",
    homeLogo:"⚫",
    awayLogo:"🟡",
    score:"0 - 0",
    odds:["2.05","3.25","3.40"],
    markets:"+96"
  },
  {
    status:"21:45",
    minute:"Yakında",
    flag:"🇹🇷",
    league:"Türkiye · Süper Lig",
    home:"Fenerbahçe",
    away:"Trabzonspor",
    homeLogo:"🟡",
    awayLogo:"🔵",
    score:"-",
    odds:["1.88","3.30","4.25"],
    markets:"+104"
  }
];
const storedMatches = parseStoredJson(localStorage, "bozobet_matches");
let matches = Array.isArray(storedMatches) ? storedMatches : defaultMatches;

const games = [
  ["🦁","GATES OF OLYMPUS"],
  ["🍬","SWEET BONANZA"],
  ["🤠","WANTED"],
  ["🔥","100 SUPER HOT"],
  ["✈️","AVIATOR"]
];

function money(n){
  return "₺ " + Number(n || 0).toLocaleString("tr-TR", {minimumFractionDigits:2, maximumFractionDigits:2});
}

function saveUser(){
  persistSessionUser();
}

function premiumCrownIcon(){
  return `<svg class="premium-crown-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7.5 7.8 11 12 4l4.2 7L21 7.5l-1.6 10H4.6L3 7.5Z"/><path d="M5 20h14"/></svg>`;
}

function headerAccountHtml(){
  if(!user) return "";
  const username = esc(user.username || "Oyuncu");
  const initial = esc((user.username || "O").slice(0, 1).toUpperCase());
  return `
    <div class="header-account">
      <button class="header-account-trigger" type="button" onclick="toggleHeaderAccountMenu(event)" aria-haspopup="menu" aria-expanded="false">
        <span class="header-avatar">${initial}<i></i></span>
        <span class="header-account-copy"><small>${premiumCrownIcon()} VIP OYUNCU</small><strong>${username}</strong></span>
        <span class="header-wallet"><small>BAKİYE</small><strong>${money(user.balance)}</strong></span>
        <svg class="header-account-chevron" viewBox="0 0 20 20" aria-hidden="true"><path d="m6 8 4 4 4-4"/></svg>
      </button>
      <div class="header-account-menu" role="menu">
        <div class="header-account-menu-head"><span class="header-avatar">${initial}<i></i></span><div><small>SEVİYE 1</small><strong>${username}</strong></div></div>
        <button type="button" role="menuitem" onclick="renderProfile()"><span>Hesabım</span><b>›</b></button>
        <button type="button" role="menuitem" onclick="renderDepositSitePage()"><span>Para Yatır</span><b>+</b></button>
        <button type="button" role="menuitem" onclick="renderVip()"><span>${premiumCrownIcon()} VIP Kulübü</span><b>›</b></button>
        <button class="header-account-logout" type="button" role="menuitem" onclick="logout()"><span>Güvenli Çıkış</span><b>↗</b></button>
      </div>
    </div>`;
}

function toggleHeaderAccountMenu(event){
  event?.stopPropagation();
  const account = event?.currentTarget?.closest(".header-account");
  if(!account) return;
  const isOpen = account.classList.toggle("open");
  event.currentTarget.setAttribute("aria-expanded", String(isOpen));
}

document.addEventListener("click", (event) => {
  if(event.target.closest(".header-account")) return;
  document.querySelectorAll(".header-account.open").forEach(account => {
    account.classList.remove("open");
    account.querySelector(".header-account-trigger")?.setAttribute("aria-expanded", "false");
  });
});

function shell(content){
  return `
    <header class="topbar mobile-header">
      <div class="topbar-inner">
        <div class="brand-logo logo-img-only mobile-header-logo" onclick="navigateApp('home')">
          <picture>
            <img src="assets/galaxybet/logo.png?v=3" alt="GalaxyBet" class="clean-logo">
          </picture>
        </div>

        <nav class="nav">
          <a href="#sports" onclick="navigateApp('sports', event)">Spor Bahisleri</a>
          <a href="#live-casino" onclick="navigateApp('live-casino', event)">Canlı Casino</a>
          <a href="#casino" onclick="navigateApp('casino', event)">Casino</a>
          <a href="#slot" onclick="navigateApp('slot', event)">Slot</a>
          <a href="#promotions" onclick="navigateApp('promotions', event)">Kampanyalar</a>
          <a href="#virtual" onclick="navigateApp('virtual', event)">Sanal Oyunlar</a>
          <a class="nav-vip" href="#vip" onclick="navigateApp('vip', event)">${premiumCrownIcon()} VIP</a>
          <a href="#support" onclick="navigateApp('support', event)">Destek</a>
          ${user?.role === "admin" ? `<a href="#" onclick="renderAdminDashboard()">Admin</a>` : ""}
        </nav>

        <div class="actions mobile-header-actions">
          ${user ? `${notificationBellHtml()}${headerAccountHtml()}` : `<button id="headerLoginButton" class="btn" type="button" data-auth-trigger="login" onclick="loginModal()">Giriş Yap</button><button id="headerRegisterButton" class="btn primary" type="button" data-auth-trigger="register" onclick="registerModal()">Üye Ol</button>`}
        </div>
      </div>
    </header>

    <main class="wrap">${content}</main>
  `;
}

const APP_ROUTES = new Set(["home", "sports", "live-casino", "casino", "slot", "promotions", "virtual", "vip", "support"]);

function isValidAppRoute(route){
  if(APP_ROUTES.has(route)) return true;
  const match = /^kampanya-(\d+)$/.exec(route || "");
  const campaignCount = window.GALAXYBET_ASSETS?.campaigns?.length || 0;
  return Boolean(match && Number(match[1]) >= 1 && Number(match[1]) <= campaignCount);
}

function renderAppRoute(route){
  const target = isValidAppRoute(route) ? route : "home";
  document.body.dataset.appRoute = target;

  if(target === "sports") renderSports();
  else if(target === "live-casino"){
    renderCasino("Canlı Casino");
  }
  else if(target === "casino") renderCasino();
  else if(target === "slot" && typeof renderSlot === "function") renderSlot();
  else if(target === "virtual" && typeof renderVirtualGames === "function") renderVirtualGames();
  else if(target === "promotions") renderPromotions();
  else if(target.startsWith("kampanya-")) renderCampaignDetail(Number(target.slice(9)) - 1);
  else if(target === "vip") renderVip();
  else if(target === "support") renderSupport();
  else renderHome();

  window.scrollTo({top:0, behavior:"auto"});
}

function navigateApp(route, event){
  event?.preventDefault();
  const target = isValidAppRoute(route) ? route : "home";
  const hash = `#${target}`;
  if(location.hash !== hash) history.pushState({galaxybetRoute:target}, "", hash);
  renderAppRoute(target);
  const menuToggle = document.getElementById("mobileMenuToggle");
  if(menuToggle) menuToggle.checked = false;
}

window.navigateApp = navigateApp;
window.addEventListener("popstate", () => {
  const route = location.hash.slice(1);
  if(isValidAppRoute(route)) renderAppRoute(route);
});
window.addEventListener("load", () => {
  const route = location.hash.slice(1);
  if(isValidAppRoute(route) && route !== "home") setTimeout(() => renderAppRoute(route), 0);
});

function renderHome(){
  const banners = window.GALAXYBET_ASSETS?.desktopSlider || window.GALAXYBET_ASSETS?.slider || window.GALAXYBET_ASSETS?.banners || [];
  const mobileBanners = window.GALAXYBET_ASSETS?.mobileSlider || window.GALAXYBET_ASSETS?.slider || window.GALAXYBET_ASSETS?.banners || [];
  const promotionImages = window.GALAXYBET_ASSETS?.promotions || [];
  const bannerSlides = banners.map((src, index) => `
      <img class="hero-slide-img${index === 0 ? " active" : ""}" src="${src}" alt="GalaxyBet Banner ${index + 1}">`).join("");
  const mobileBannerSlides = mobileBanners.map((src, index) => `
        <img class="mobile-hero-slide${index === 0 ? " active" : ""}" src="${src}" alt="GalaxyBet Banner ${index + 1}">`).join("");

  document.getElementById("app").innerHTML = shell(`
    <section class="hero hero-slider hero-banner" id="heroSlider">
      ${bannerSlides}
      <button class="hero-arrow hero-prev" type="button" aria-label="Önceki banner" onclick="heroPrev()">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
      </button>
      <button class="hero-arrow hero-next" type="button" aria-label="Sonraki banner" onclick="heroNext()">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>
      </button>
    </section>

    <section class="mobile-hero-slider hero-banner" id="mobileHeroSlider" aria-label="Kampanyalar">
      <div class="mobile-hero-track">
        ${mobileBannerSlides}
      </div>
      <button class="hero-arrow hero-prev" type="button" aria-label="Önceki banner" onclick="setMobileHeroSlide(window.bozobetMobileHeroIndex - 1)">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
      </button>
      <button class="hero-arrow hero-next" type="button" aria-label="Sonraki banner" onclick="setMobileHeroSlide(window.bozobetMobileHeroIndex + 1)">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>
      </button>
    </section>

    <section class="mobile-promo-strip" aria-label="Promosyonlar">
      ${promotionImages.map((img, index) => mobilePromo(img, `GalaxyBet Promosyon ${index + 1}`)).join("")}
    </section>

    <section class="category-row home-section">
      ${cat("assets/icons/categories/football.webp","FUTBOL","500+ Lig")}
      ${cat("assets/icons/categories/basketball.webp","BASKETBOL","200+ Lig")}
      ${cat("assets/icons/categories/tennis.webp","TENİS","150+ Turnuva")}
      ${cat("assets/icons/categories/esport.webp","E-SPOR","100+ Karşılaşma")}
      ${cat("assets/icons/categories/live-bet.webp","CANLI BAHİS","Anında Bahis")}
      <div class="cat mobile-slot-category"><div class="cat-left"><div class="cat-icon"><img src="assets/mobile/icons/slot-icon.png" alt="Slot"></div><div><b>SLOT</b><span>Slot Oyunları</span></div></div><div class="arrow">›</div></div>
    </section>

    <section class="main-grid">
      <div class="card">
        <div class="card-head">
          <h3>📡 CANLI KARŞILAŞMALAR</h3>
          <div class="tabs">
            <button class="active">Futbol</button>
            <button>Basketbol</button>
            <button>Tenis</button>
            <button>E-Spor</button>
          </div>
        </div>
        <div class="match-list">
          ${matches.map(matchHtml).join("")}
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <h3>⏱ POPÜLER OYUNLAR</h3>
          <button class="btn">Tümünü Gör</button>
        </div>
        <div class="games">
          ${games.map(g => `<div class="game"><div class="emoji">${g[0]}</div><b>${g[1]}</b></div>`).join("")}
        </div>
      </div>
    </section>

    <section class="card promos">
      <div class="card-head">
        <h3>PROMOSYONLAR</h3>
        <button class="btn" type="button" onclick="renderPromotions()">Tüm Kampanyalar</button>
      </div>
      <div class="promo-grid">
        ${promotionImages.map((img, index) => promo(img, `GalaxyBet Promosyon ${index + 1}`)).join("")}
      </div>
    </section>

    <section class="card trust">
      ${trust("assets/icons/trust/fast-deposit.webp","HIZLI YATIRIM","Anında para yatırma")}
      ${trust("assets/icons/trust/crypto-payment.webp","KRİPTO","Bitcoin ve 50+ kripto")}
      ${trust("assets/icons/trust/support-247.webp","7/24 DESTEK","Canlı destek her zaman yanında")}
      ${trust("assets/icons/trust/fast-withdraw.webp","CANLI ÇEKİM","Hızlı ve güvenli para çekme")}
      ${trust("assets/icons/trust/secure-game.webp","GÜVENLİ DEMO","Temiz prototip altyapısı")}
    </section>

    <footer class="card footer">
      <div>
        <div class="brand-logo footer-brand logo-img-only">
          <img src="assets/galaxybet/logo.png?v=3" alt="GalaxyBet" class="clean-logo footer-clean-logo">
        </div>
        <p>GalaxyBet, spor bahisleri ve online casino deneyimi için hazırlanmış premium arayüzdür.</p>
        <p>© 2026 GalaxyBet</p>
      </div>
      ${foot("KURUMSAL",["Hakkımızda","Kariyer","Ortaklık","Basın","İletişim"])}
      ${foot("YARDIM",["Sıkça Sorulan Sorular","Para Yatırma","Para Çekme","Kurallar","Destek"])}
      ${foot("OYUNLAR",["Casino","Slot","Canlı Casino","Jackpot Oyunları","Tüm Oyunlar"])}
      ${foot("BAHİSLER",["Spor Bahisleri","Canlı Bahis","Yaklaşan Maçlar","Sonuçlar","İstatistikler"])}
      <div>
        <h4>ÖDEME YÖNTEMLERİ</h4>
        <div class="payments">
          ${["VISA","Mastercard","Papara","PayFix","Bitcoin","Tether","Ethereum","Litecoin"].map(x=>`<div class="pay">${x}</div>`).join("")}
        </div>
      </div>
    </footer>
  `);

  requestAnimationFrame(initMobileHomeSlider);
}

function cat(icon,title,sub){
  return `<div class="cat"><div class="cat-left"><div class="cat-icon"><img src="${icon}" alt="${title}"></div><div><b>${title}</b><span>${sub}</span></div></div><div class="arrow">›</div></div>`;
}

function matchHtmlLegacy(m){
  return `
    <div class="match pro-match">
      <div class="match-status">
        <span class="${m.status === "CANLI" ? "live live-pulse" : "time-badge"}">${m.status}</span>
        <small>${m.minute}</small>
      </div>

      <div class="teams pro-teams">
        <small><span>${m.flag}</span> ${m.league}</small>

        <div class="team-row">
          <div class="club">
            <span class="club-logo">${m.homeLogo}</span>
            <b>${m.home}</b>
          </div>

          <div class="score-box">${m.score}</div>

          <div class="club away">
            <b>${m.away}</b>
            <span class="club-logo">${m.awayLogo}</span>
          </div>
        </div>
      </div>

      <div class="odds pro-odds">
        <button class="odd" onclick="addToCoupon('${m.home} - ${m.away}', '1', '${m.odds[0]}')"><span>1</span><b>${m.odds[0]}</b></button>
        <button class="odd" onclick="addToCoupon('${m.home} - ${m.away}', 'X', '${m.odds[1]}')"><span>X</span><b>${m.odds[1]}</b></button>
        <button class="odd" onclick="addToCoupon('${m.home} - ${m.away}', '2', '${m.odds[2]}')"><span>2</span><b>${m.odds[2]}</b></button>
      </div>

      <div class="more">${m.markets} ›</div>
    </div>
  `;
}

function promo(img, title = "GalaxyBet Promosyonu"){
  return `<button type="button" class="promo promo-img-card only-img" onclick="renderPromotions()" aria-label="${title}"><img src="${img}" alt="${title}" loading="lazy" decoding="async"></button>`;
}

function mobilePromo(img, title){
  return `<button type="button" class="mobile-promo-card" onclick="renderPromotions()"><img src="${img}" alt="${title}" loading="lazy" decoding="async"></button>`;
}

function trust(i,b,s){
  return `<div class="trust-item"><i><img src="${i}" alt="${b}"></i><div><b>${b}</b><span>${s}</span></div></div>`;
}

function foot(title,items){
  return `<div><h4>${title}</h4>${items.map(x=>`<a href="#">${x}</a>`).join("")}</div>`;
}

let authModalScrollY = 0;

function syncAuthModalScrollLock(){
  const isOpen = Boolean(document.querySelector(".modal-back.auth-modal-back"));
  const isLocked = document.body.classList.contains("auth-modal-open");

  if(isOpen && !isLocked){
    authModalScrollY = window.scrollY;
    document.documentElement.classList.add("auth-modal-open");
    document.body.classList.add("auth-modal-open");
    document.body.style.top = `-${authModalScrollY}px`;
  }else if(!isOpen && isLocked){
    document.documentElement.classList.remove("auth-modal-open");
    document.body.classList.remove("auth-modal-open");
    document.body.style.top = "";
    window.scrollTo(0, authModalScrollY);
  }
}

function modal(html){
  const div = document.createElement("div");
  div.className = "modal-back";
  div.innerHTML = `<div class="modal">${html}</div>`;
  if(div.querySelector(".auth-box")) div.classList.add("auth-modal-back");
  div.onclick = e => { if(e.target === div) div.remove(); };
  document.body.appendChild(div);
  syncAuthModalScrollLock();
}

new MutationObserver(syncAuthModalScrollLock).observe(document.body, {
  childList:true
});

document.addEventListener("click", event => {
  const trigger = event.target.closest("[data-auth-trigger]");
  if(!trigger) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  if(trigger.dataset.authTrigger === "login") loginModal();
  if(trigger.dataset.authTrigger === "register") registerModal();
}, true);

function loginModal(){
  modal(`
    <div class="auth-box login-auth-box">
      <button class="login-modal-close" type="button" aria-label="Giriş penceresini kapat" onclick="this.closest('.modal-back').remove()">×</button>
      <div class="auth-side">
        <div class="auth-badge">GALAXYBET</div>
        <h2>Hesabına Giriş Yap</h2>
        <p>Bahis, casino ve promosyon dünyasına tek panelden eriş.</p>
        <div class="auth-mini">
          <span>⚡ Hızlı giriş</span>
          <span>🛡️ Güvenli oturum</span>
          <span>🎁 Bonus fırsatları</span>
        </div>
      </div>

      <div class="auth-form">
        <div class="auth-fields">
          <h2>Giriş Yap</h2>
          <label class="field">
            <span>Kullanıcı adı</span>
            <input id="loginUser" placeholder="Kullanıcı adın" autocomplete="username">
          </label>

          <label class="field">
            <span>Şifre</span>
            <div class="pass-wrap">
              <input id="loginPass" type="password" placeholder="Şifren" autocomplete="current-password">
              <button type="button" onclick="togglePass('loginPass', this)">Göster</button>
            </div>
          </label>
        </div>

        <button class="btn primary full-btn" onclick="login()">Giriş Yap</button>

        <button class="link-btn" onclick="document.querySelector('.modal-back').remove(); registerModal();">
          Hesabın yok mu? Üye ol
        </button>

        <div class="login-extra">
          <label>
            <input id="loginRememberMe" type="checkbox" checked>
            <span>Beni hatırla</span>
          </label>
          <a href="#">Şifremi unuttum</a>
        </div>
      </div>
    </div>
  `);
}

function registerModal(){
  modal(`
    <div class="auth-box register-wide">
      <div class="auth-side register-side">
        <div class="auth-badge">YENİ ÜYELİK</div>
        <h2>GalaxyBet’e Katıl</h2>
        <p>Yeni üyelik için bilgilerini doldur.  sistemde veriler sadece tarayıcıda tutulur.</p>
        <div class="auth-mini">
          <span>🎁 %100 Bonus</span>
          <span>🎰 250 Freespin</span>
          <span>⚽ Canlı bahis</span>
        </div>
      </div>

      <div class="auth-form">
        <div class="auth-fields">
          <h2>Üye Ol</h2>

          <div class="register-grid">
            <label class="field">
              <span>Ad</span>
              <input id="regName" value="">
            </label>

          <label class="field">
            <span>Soyad</span>
            <input id="regSurname" value="">
          </label>

          <label class="field">
            <span>Telefon</span>
            <input id="regPhone" value="" placeholder="05xx xxx xx xx">
          </label>

          <label class="field">
            <span>TC Kimlik No</span>
            <input id="regTc" inputmode="numeric" maxlength="11" placeholder="11 haneli TC">
          </label>

          <label class="field">
            <span>E-posta</span>
            <input id="regEmail" type="email" value="" placeholder="ornek@mail.com">
          </label>

          <label class="field">
            <span>Doğum tarihi</span>
            <input id="regBirth" type="date">
          </label>

          <label class="field">
            <span>Kullanıcı adı</span>
            <input id="regUser" placeholder="Kullanıcı adın">
          </label>

            <label class="field full-field">
              <span>Şifre</span>
              <div class="pass-wrap">
                <input id="regPass" type="password" placeholder="Şifre oluştur">
                <button type="button" onclick="togglePass('regPass', this)">Göster</button>
              </div>
            </label>
          </div>
        </div>

        <button class="btn primary full-btn" onclick="register()">Hesap Oluştur</button>

        <button class="link-btn" onclick="document.querySelector('.modal-back').remove(); loginModal();">
          Zaten hesabın var mı? Giriş yap
        </button>
      </div>
    </div>
  `);
}

function loginLegacy(){
  const name = document.getElementById("loginUser").value.trim();
  const pass = document.getElementById("loginPass").value || "";

  if(!name || !pass){
    alert("Kullanıcı adı ve şifre gir.");
    return;
  }

  if(name === "admin" && pass === "admin123"){
    user = {
      username:"admin",
      name:"Admin",
      surname:"Panel",
      email:"admin@galaxybet.local",
      phone:"",
      tc:"",
      birth:"",
      balance:999999,
      role:"admin"
    };
  }else{
    user = {
      username:name,
      name:localStorage.getItem("bozobet_reg_name") || "",
      surname:localStorage.getItem("bozobet_reg_surname") || "",
      email:localStorage.getItem("bozobet_reg_email") || "",
      phone:localStorage.getItem("bozobet_reg_phone") || "",
      tc:localStorage.getItem("bozobet_reg_tc") || "",
      birth:localStorage.getItem("bozobet_reg_birth") || "",
      balance:5250,
      role:"user"
    };
  }

  user = saveSession(user, document.getElementById("loginRememberMe")?.checked === true);
  applyAuthenticatedUI(user);
  document.querySelector(".modal-back").remove();
  renderHome();
}

function registerLegacy(){
  const username = document.getElementById("regUser").value.trim();
  const password = document.getElementById("regPass").value || "";
  const name = document.getElementById("regName").value || "";
  const surname = document.getElementById("regSurname").value || "";
  const phone = document.getElementById("regPhone").value || "";
  const tc = document.getElementById("regTc").value || "";
  const email = document.getElementById("regEmail").value || "";
  const birth = document.getElementById("regBirth").value || "";

  if(!name || !surname || !phone || !tc || !email || !birth || !username || !password){
    alert("Tüm üyelik bilgilerini doldurmalısın.");
    return;
  }

  if(!/^\d{11}$/.test(tc)){
    alert("TC Kimlik No 11 haneli olmalı.");
    return;
  }

  localStorage.setItem("bozobet_reg_name", name);
  localStorage.setItem("bozobet_reg_surname", surname);
  localStorage.setItem("bozobet_reg_phone", phone);
  localStorage.setItem("bozobet_reg_tc", tc);
  localStorage.setItem("bozobet_reg_email", email);
  localStorage.setItem("bozobet_reg_birth", birth);

  user = {
    username,
    name,
    surname,
    phone,
    tc,
    email,
    birth,
    balance:0,
    role:"user"
  };

  user = saveSession(user, true);
  applyAuthenticatedUI(user);
  document.querySelector(".modal-back").remove();
  renderHome();
}

function logout(){
  clearSession();
  applyGuestUI(true);
}

renderHome();



// CLEAN HERO IMAGE SLIDER
window.bozobetHeroIndex = 0;
window.bozobetHeroTimer = null;

function updateHeroSlider(){
  const hero = document.getElementById("heroSlider");
  if(!hero) return;

  const imgs = hero.querySelectorAll(".hero-slide-img");
  const dots = hero.querySelectorAll(".hero-dots span");
  if(!imgs.length) return;
  window.bozobetHeroIndex = ((window.bozobetHeroIndex % imgs.length) + imgs.length) % imgs.length;

  imgs.forEach((img, i) => img.classList.toggle("active", i === window.bozobetHeroIndex));
  dots.forEach((dot, i) => dot.classList.toggle("active", i === window.bozobetHeroIndex));
}

function setHeroSlide(i){
  window.bozobetHeroIndex = i;
  updateHeroSlider();
  restartHeroTimer();
}

function heroNext(){
  window.bozobetHeroIndex += 1;
  updateHeroSlider();
  restartHeroTimer();
}

function heroPrev(){
  window.bozobetHeroIndex -= 1;
  updateHeroSlider();
  restartHeroTimer();
}

function restartHeroTimer(){
  if(window.bozobetHeroTimer) clearInterval(window.bozobetHeroTimer);
  window.bozobetHeroTimer = setInterval(() => {
    window.bozobetHeroIndex += 1;
    updateHeroSlider();
  }, 4200);
}

setInterval(() => {
  if(document.getElementById("heroSlider") && !window.bozobetHeroTimer){
    restartHeroTimer();
  }
}, 300);

window.bozobetMobileHeroIndex = 0;
window.bozobetMobileHeroTimer = null;

function updateMobileHeroSlider(){
  const slider = document.getElementById("mobileHeroSlider");
  if(!slider) return;

  const slides = [...slider.querySelectorAll(".mobile-hero-slide")];
  const dots = [...slider.querySelectorAll(".mobile-hero-dots button")];
  if(!slides.length) return;
  const index = ((window.bozobetMobileHeroIndex % slides.length) + slides.length) % slides.length;

  window.bozobetMobileHeroIndex = index;
  slides.forEach((slide, i) => slide.classList.toggle("active", i === index));
  dots.forEach((dot, i) => {
    dot.classList.toggle("active", i === index);
    dot.setAttribute("aria-current", i === index ? "true" : "false");
  });
}

function restartMobileHeroTimer(){
  if(window.bozobetMobileHeroTimer) clearInterval(window.bozobetMobileHeroTimer);
  window.bozobetMobileHeroTimer = setInterval(() => {
    window.bozobetMobileHeroIndex += 1;
    updateMobileHeroSlider();
  }, 4000);
}

function setMobileHeroSlide(index){
  window.bozobetMobileHeroIndex = index;
  updateMobileHeroSlider();
  restartMobileHeroTimer();
}

function initMobileHomeSlider(){
  const slider = document.getElementById("mobileHeroSlider");
  if(!slider || slider.dataset.ready === "1") return;

  slider.dataset.ready = "1";
  let touchStartX = 0;

  slider.addEventListener("touchstart", event => {
    touchStartX = event.changedTouches[0]?.clientX || 0;
  }, {passive:true});

  slider.addEventListener("touchend", event => {
    const distance = (event.changedTouches[0]?.clientX || 0) - touchStartX;
    if(Math.abs(distance) < 38) return;
    setMobileHeroSlide(window.bozobetMobileHeroIndex + (distance < 0 ? 1 : -1));
  }, {passive:true});

  updateMobileHeroSlider();
  restartMobileHeroTimer();
}


function renderSports(){
  document.getElementById("app").innerHTML = shell(`
    <section class="page-hero mini sports-mini">
      <div>
        <span>SPOR BAHİSLERİ</span>
        <h1>Canlı ve Yaklaşan Karşılaşmalar</h1>
        <p>Günlük maç listesi, oranlar ve kupon görünümü için hazırlanmış premium  alanı.</p>
      </div>
      <button class="btn primary">Bugünün Maçları</button>
    </section>

    <section class="sports-layout">
      <aside class="league-card card">
        <h3>Ligler</h3>
        ${["⚽ Futbol","🏀 Basketbol","🎾 Tenis","🎮 E-Spor","📡 Canlı Bahis","🇹🇷 Süper Lig","🏴 Premier Lig","🇪🇸 La Liga"].map(x=>`<button>${x}</button>`).join("")}
      </aside>

      <div class="card">
        <div class="card-head">
          <h3>Bugünün Öne Çıkan Maçları</h3>
          <div class="tabs"><button class="active">Tümü</button><button>Canlı</button><button>Yaklaşan</button></div>
        </div>
        <div class="match-list">
          ${matches.map(matchHtml).join("")}
          ${matches.map(matchHtml).join("")}
        </div>
      </div>

      <aside class="coupon-card card" id="couponBox">
        ${couponHtml()}
      </aside>
    </section>
  `);
}

function renderCasino(){
  document.getElementById("app").innerHTML = shell(`
    <section class="page-hero mini casino-mini">
      <div>
        <span>CASINO & SLOT</span>
        <h1>Popüler Oyunlar</h1>
        <p>Betnex bağlantısı eklenene kadar seçili oyun kartları gösteriliyor.</p>
      </div>
      <button class="btn gold">Tüm Oyunlar</button>
    </section>

    <section class="casino-tabs">
      ${["Tümü","Slot","Canlı Casino","Rulet","Blackjack","Crash","Popüler"].map((x,i)=>`<button class="${i===0?"active":""}">${x}</button>`).join("")}
    </section>

    <section class="casino-grid">
      ${Array(4).fill(0).map(()=>games.map(g=>`
        <div class="casino-game card">
          <div class="casino-emoji">${g[0]}</div>
          <b>${g[1]}</b>
          <span>GalaxyBet Studio</span>
          <button class="btn primary">Oyna</button>
        </div>
      `).join("")).join("")}
    </section>
  `);
}

function renderPromotions(){
  const campaigns = window.GALAXYBET_ASSETS?.campaigns || [];
  const campaignDetails = window.GALAXYBET_ASSETS?.campaignDetails || [];
  document.getElementById("app").innerHTML = shell(`
    <section class="page-hero mini promo-mini">
      <div>
        <span>KAMPANYALAR</span>
        <h1>Bonus ve Kampanyalar</h1>
        <p>Hoş geldin bonusu, freespin, kayıp bonusu ve VIP ayrıcalıkları.</p>
      </div>
    </section>

    <section class="promo-page-grid" aria-label="GalaxyBet kampanyaları">
      ${campaigns.map((img, index) => {
        const campaign = campaignDetails[index] || {title:"GalaxyBet Özel Fırsatı", description:"GalaxyBet üyelerine özel seçili oyun ve yatırım avantajlarını keşfet."};
        return `
        <article class="campaign-card">
          <div class="campaign-card-media">
            <img src="${img}" alt="${campaign.title}" loading="${index < 2 ? "eager" : "lazy"}" decoding="async">
          </div>
          <div class="campaign-card-footer">
            <div><span>GALAXYBET ÖZEL</span><strong>${campaign.title}</strong><p>${campaign.description}</p></div>
            <button type="button" class="campaign-cta" onclick="navigateApp('kampanya-${index + 1}')">Detaylar <span aria-hidden="true">→</span></button>
          </div>
        </article>`;
      }).join("")}
    </section>
  `);
}

function campaignTerms(campaign, index){
  const percent = campaign.title.match(/%(\d+)/)?.[1];
  const isFreeSpin = /free spin/i.test(campaign.title);
  const isLoss = /kayıp/i.test(campaign.title);
  const isReferral = /arkadaş/i.test(campaign.title);
  return {
    rate:percent ? `%${percent}` : isFreeSpin ? "250 Free Spin" : "Özel paket",
    validity:"31 Aralık 2026, 23:59'a kadar",
    minimum:isReferral ? "Davet edilen üye için ₺500" : index > 11 ? "₺500" : "₺250",
    maximum:isFreeSpin ? "250 Free Spin + ₺5.000" : isLoss ? "₺10.000" : "₺15.000",
    wagering:/çevrimsiz/i.test(campaign.title) ? "Ana para 1x; bonus için ek çevrim yoktur." : isLoss ? "Bonus tutarı 8x çevrime tabidir." : "Bonus tutarı 15x çevrime tabidir.",
    games:/spor/i.test(campaign.title) ? "Spor bahisleri ve canlı bahisler" : isFreeSpin ? "Kampanya sayfasında belirtilen seçili slot oyunları" : "Seçili slot, casino ve canlı casino oyunları"
  };
}

function renderCampaignDetail(index){
  const campaigns = window.GALAXYBET_ASSETS?.campaigns || [];
  const details = window.GALAXYBET_ASSETS?.campaignDetails || [];
  const campaign = details[index];
  const image = campaigns[index];
  if(!campaign || !image){ navigateApp("promotions");return; }
  const terms = campaignTerms(campaign, index);
  const rows = [
    ["Bonus adı", campaign.title],
    ["Bonus oranı", terms.rate],
    ["Geçerlilik tarihi", terms.validity],
    ["Minimum yatırım", terms.minimum],
    ["Maksimum bonus", terms.maximum],
    ["Çevrim şartı", terms.wagering],
    ["Geçerli oyunlar", terms.games]
  ];

  document.getElementById("app").innerHTML = shell(`
    <article class="campaign-detail-page">
      <button class="campaign-back" type="button" onclick="navigateApp('promotions')">← Tüm kampanyalar</button>
      <section class="campaign-detail-hero">
        <img src="${image}" alt="${campaign.title}" decoding="async">
        <div><span>GALAXYBET KAMPANYA ${index + 1}</span><h1>${campaign.title}</h1><p>${campaign.description}</p></div>
      </section>
      <section class="campaign-detail-grid">
        <div class="campaign-facts">${rows.map(([label,value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join("")}</div>
        <aside class="campaign-join-card"><span>NASIL KATILIR?</span><h2>Avantajını üç adımda kullan</h2><ol><li>GalaxyBet hesabına giriş yap veya ücretsiz üye ol.</li><li>Kampanya limitlerine uygun yatırımını tamamla.</li><li>Canlı destek üzerinden kampanya adını belirterek bonusunu talep et.</li></ol><button class="campaign-cta" type="button" onclick="${user ? "openTawkSupport()" : "registerModal()"}">${user ? "Canlı Destek" : "Üye Ol"} <span>→</span></button></aside>
      </section>
      <section class="campaign-rules"><span>KURALLAR</span><h2>Kampanya koşulları</h2><ul><li>Kampanya yalnızca bir gerçek kişi ve bir hesap için kullanılabilir.</li><li>Bonus talebi yatırım tamamlandıktan sonra, oyun başlamadan önce iletilmelidir.</li><li>Çevrim süresince bonus bakiyesi farklı bir kampanyayla birleştirilemez.</li><li>Minimum oran, katkı yüzdeleri ve oyun kısıtları kampanya türüne göre uygulanır.</li><li>Kötüye kullanım, çoklu hesap veya eşleşen ödeme bilgileri bonusun iptaline neden olur.</li></ul></section>
    </article>
  `);
}

function renderVip(){
  document.getElementById("app").innerHTML = shell(`
    <section class="page-hero mini vip-mini">
      <div>
        <span>VIP CLUB</span>
        <h1>Özel Oyuncu Deneyimi</h1>
        <p>Yüksek limitler, kişisel temsilci, özel promosyonlar ve hızlı işlemler.</p>
      </div>
      <button class="btn gold">VIP Başvurusu</button>
    </section>

    <section class="vip-grid">
      ${["Bronze","Silver","Gold","Diamond"].map((x,i)=>`
        <div class="vip-card card">
          <div class="vip-crown">${premiumCrownIcon()}</div>
          <h3>${x}</h3>
          <p>${["Başlangıç seviyesi","Daha yüksek bonuslar","Özel kampanyalar","En yüksek limitler"][i]}</p>
          <button class="btn ${i>1?"gold":"primary"}">Detaylar</button>
        </div>
      `).join("")}
    </section>
  `);
}

function renderSupportLegacy(){
  document.getElementById("app").innerHTML = shell(`
    <section class="page-hero mini support-mini">
      <div>
        <span>DESTEK</span>
        <h1>7/24 Yardım Merkezi</h1>
        <p>Para yatırma, çekim, hesap ve oyun işlemleri için destek alanı.</p>
      </div>
    </section>

    <section class="support-grid">
      ${["Canlı Destek","Telegram Destek","Para Yatırma Yardımı","Çekim İşlemleri"].map((x,i)=>`
        <div class="support-card card">
          <h3>${["🎧","✈️","🏦","💸"][i]} ${x}</h3>
          <p> destek kartı. Sonraki aşamada canlı destek linki veya panel bağlantısı eklenir.</p>
          <button class="btn primary">Aç</button>
        </div>
      `).join("")}
    </section>
  `);
}

function renderProfile(){
  if(!user){
    loginModal();
    return;
  }

  document.getElementById("app").innerHTML = shell(`
    <section class="profile-layout">
      <aside class="profile-card card">
        <div class="avatar">${user.username.slice(0,1).toUpperCase()}</div>
        <h2>${user.username}</h2>
        <span>${user.role === "admin" ? "Admin Hesabı" : " Oyuncu Hesabı"}</span>
        <div class="profile-info">
          <div><small>Ad Soyad</small><b>${user.name || "-"} ${user.surname || ""}</b></div>
          <div><small>E-posta</small><b>${user.email || "-"}</b></div>
          <div><small>Telefon</small><b>${user.phone || "-"}</b></div>
          <div><small>TC Kimlik No</small><b>${user.tc || "-"}</b></div>
          <div><small>Doğum Tarihi</small><b>${user.birth || "-"}</b></div>
        </div>

        <div class="profile-balance">
          <small>Mevcut Bakiye</small>
          <b>${money(user.balance)}</b>
        </div>
        <button class="btn primary full-btn" onclick="renderDepositSitePage()">Para Yatır</button>
        <button class="btn full-btn" onclick="withdrawModal()">Para Çek</button>
      </aside>

      <section class="card history-card">
        <div class="card-head"><h3>İşlem Geçmişi</h3></div>
        <div class="history-row"><span>Yatırım Talebi</span><b>₺1.000</b><em>Bekliyor</em></div>
        <div class="history-row"><span>Casino Oyun</span><b>-₺250</b><em>Tamamlandı</em></div>
        <div class="history-row"><span>Bonus</span><b>₺500</b><em>Onaylandı</em></div>
      </section>
    </section>
  `);
}

function withdrawModalLegacy(){
  modal(`
    <div class="pay-modal">
      <div class="pay-head">
        <div>
          <h2>Para Çek</h2>
          <p> V2 çekim paneli. Agentix bağlantısı sonraki adımda temiz kurulacak.</p>
        </div>
        <div class="pay-balance"><span>Bakiye</span><b>${money(user?.balance || 0)}</b></div>
      </div>

      <div class="pay-grid">
        <label class="field"><span>Ad Soyad</span><input id="wdName" value="Bozo Test"></label>
        <label class="field"><span>Banka</span><input id="wdBank" value="Akbank"></label>
        <label class="field"><span>IBAN</span><input id="wdIban" value="TR00 0000 0000 0000 0000 0000 00"></label>
        <label class="field"><span>Tutar</span><input id="wdAmount" type="number" value="1000"></label>
      </div>

      <button class="btn primary full-btn" onclick="document.getElementById('wdMsg').textContent='Çekim talebi  olarak oluşturuldu.'">Çekim Talebi Oluştur</button>
      <div class="msg" id="wdMsg"></div>
    </div>
  `);
}


function couponHtml(){
  const totalOdd = coupon.reduce((acc, x) => acc * Number(x.odd), 1);
  const stake = Number(localStorage.getItem("coupon_stake") || 100);
  const win = totalOdd * stake;

  if(!coupon.length){
    return `
      <h3>Bahis Kuponu</h3>
      <div class="empty-coupon">
        <b>Kuponun boş</b>
        <span>Oran seçerek kupona ekleyebilirsin.</span>
      </div>
      <div class="coupon-total">
        <span>Toplam Oran</span>
        <b>1.00</b>
      </div>
      <button class="btn primary full-btn">Kuponu Oyna</button>
    `;
  }

  return `
    <div class="coupon-head">
      <h3>Bahis Kuponu</h3>
      <button onclick="clearCoupon()">Temizle</button>
    </div>

    <div class="coupon-items">
      ${coupon.map((x,i)=>`
        <div class="coupon-item">
          <button class="coupon-remove" onclick="removeCoupon(${i})">×</button>
          <b>${x.match}</b>
          <span>Seçim: ${x.pick}</span>
          <strong>${x.odd}</strong>
        </div>
      `).join("")}
    </div>

    <label class="field coupon-stake">
      <span>Kupon Tutarı</span>
      <input type="number" value="${stake}" oninput="localStorage.setItem('coupon_stake', this.value); refreshCouponBox();">
    </label>

    <div class="coupon-total">
      <span>Toplam Oran</span>
      <b>${totalOdd.toFixed(2)}</b>
    </div>

    <div class="coupon-total">
      <span>Muhtemel Kazanç</span>
      <b>${money(win)}</b>
    </div>

    <button class="btn primary full-btn" onclick="playCoupon()">Kuponu Oyna</button>
  `;
}

function addToCoupon(match, pick, odd){
  const exists = coupon.findIndex(x => x.match === match);

  if(exists >= 0){
    coupon[exists] = {match, pick, odd};
  }else{
    coupon.push({match, pick, odd});
  }

  refreshCouponBox();

  const box = document.getElementById("couponBox");
  if(box){
    box.classList.add("coupon-glow");
    setTimeout(()=>box.classList.remove("coupon-glow"), 700);
  }
}

function refreshCouponBox(){
  const box = document.getElementById("couponBox");
  if(box) box.innerHTML = couponHtml();
}

function removeCoupon(i){
  coupon.splice(i,1);
  refreshCouponBox();
}

function clearCoupon(){
  coupon = [];
  refreshCouponBox();
}

function playCouponLegacy(){
  if(!user){
    loginModal();
    return;
  }

  if(!coupon.length){
    alert("Önce oran seçmelisin.");
    return;
  }

  const stake = Number(localStorage.getItem("coupon_stake") || 100);

  if(stake <= 0){
    alert("Geçerli kupon tutarı gir.");
    return;
  }

  if(Number(user.balance || 0) < stake){
    alert("Yetersiz bakiye. Para yatırmalısın.");
    depositModal();
    return;
  }

  user.balance = Number(user.balance || 0) - stake;
  saveUser();
  alert("Kupon  olarak oynandı. Bakiye güncellendi.");
  coupon = [];
  renderSports();
}


function saveMatches(){
  localStorage.setItem("bozobet_matches", JSON.stringify(matches));
}

function renderMatchAdminLegacy(){
  if(user?.role !== "admin"){
    alert("Bu alana sadece admin hesabı erişebilir.");
    loginModal();
    return;
  }

  document.getElementById("app").innerHTML = shell(`
    <section class="page-hero mini admin-mini">
      <div>
        <span>MANUEL SPOR YÖNETİMİ</span>
        <h1>Günlük Maç Girişi</h1>
        <p>Buradan ana sayfa ve spor bahisleri bölümünde görünecek maçları manuel ekleyip düzenleyebilirsin.</p>
      </div>
      <button class="btn gold" onclick="resetMatches()">Varsayılana Dön</button>
    </section>

    <section class="admin-layout">
      <div class="card admin-form-card">
        <h3>Maç Ekle</h3>

        <div class="admin-form-grid">
          <label class="field"><span>Durum</span><input id="mStatus" value="CANLI"></label>
          <label class="field"><span>Dakika / Saat</span><input id="mMinute" value="22:00"></label>
          <label class="field"><span>Bayrak</span><input id="mFlag" value="🇹🇷"></label>
          <label class="field"><span>Lig</span><input id="mLeague" value="Türkiye · Süper Lig"></label>

          <label class="field"><span>Ev Sahibi</span><input id="mHome" value="Galatasaray"></label>
          <label class="field"><span>Deplasman</span><input id="mAway" value="Beşiktaş"></label>
          <label class="field"><span>Ev Logo Emoji</span><input id="mHomeLogo" value="🟡"></label>
          <label class="field"><span>Dep Logo Emoji</span><input id="mAwayLogo" value="⚫"></label>

          <label class="field"><span>Skor</span><input id="mScore" value="-"></label>
          <label class="field"><span>Oran 1</span><input id="mOdd1" value="1.85"></label>
          <label class="field"><span>Oran X</span><input id="mOddX" value="3.40"></label>
          <label class="field"><span>Oran 2</span><input id="mOdd2" value="4.20"></label>
        </div>

        <button class="btn primary full-btn" onclick="addMatchFromAdmin()">Maçı Ekle</button>
        <button class="btn full-btn cancel-edit-btn" onclick="cancelMatchEdit()">Düzenlemeyi İptal Et</button>
      </div>

      <div class="card admin-list-card">
        <div class="card-head">
          <h3>Aktif Maç Listesi</h3>
          <span>${matches.length} maç</span>
        </div>

        <div class="admin-match-list">
          ${matches.map((m,i)=>`
            <div class="admin-match">
              <div>
                <b>${m.flag} ${m.home} - ${m.away}</b>
                <span>${m.league} · ${m.status} · ${m.minute}</span>
              </div>
              <div class="admin-odds">${m.odds[0]} / ${m.odds[1]} / ${m.odds[2]}</div>
              <div class="admin-actions">
                <button class="edit-btn" onclick="editMatch(${i})">Düzenle</button>
                <button onclick="deleteMatch(${i})">Sil</button>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    </section>
  `);
}

function addMatchFromAdmin(){
  const item = {
    status: document.getElementById("mStatus").value || "CANLI",
    minute: document.getElementById("mMinute").value || "Yakında",
    flag: document.getElementById("mFlag").value || "🏳️",
    league: document.getElementById("mLeague").value || "Lig",
    home: document.getElementById("mHome").value || "Ev Sahibi",
    away: document.getElementById("mAway").value || "Deplasman",
    homeLogo: document.getElementById("mHomeLogo").value || "⚽",
    awayLogo: document.getElementById("mAwayLogo").value || "⚽",
    score: document.getElementById("mScore").value || "-",
    odds:[
      document.getElementById("mOdd1").value || "1.90",
      document.getElementById("mOddX").value || "3.20",
      document.getElementById("mOdd2").value || "4.10"
    ],
    markets:"+100"
  };

  matches.unshift(item);
  saveMatches();
  renderMatchAdmin();
}

function deleteMatch(i){
  matches.splice(i,1);
  saveMatches();
  renderMatchAdmin();
}

function resetMatches(){
  localStorage.removeItem("bozobet_matches");
  location.reload();
}

// REAL TEAM LOGO SYSTEM
function normalizeTeamName(name){
  return String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("ı","i")
    .replace(/[^a-z0-9]+/g, "");
}

function findTeamLogo(teamName){
  const logos = window.TEAM_LOGOS || {};
  const key = normalizeTeamName(teamName);

  if(logos[key]) return logos[key];

  const keys = Object.keys(logos);

  let found = keys.find(k => k.includes(key) || key.includes(k));
  if(found) return logos[found];

  const parts = key.match(/[a-z0-9]{4,}/g) || [];
  for(const part of parts){
    found = keys.find(k => k.includes(part));
    if(found) return logos[found];
  }

  return "";
}

function teamLogoHtml(teamName, fallback){
  const logo = findTeamLogo(teamName);

  if(logo){
    return `<span class="club-logo real-logo"><img src="${logo}" alt="${teamName}"></span>`;
  }

  return `<span class="club-logo">${fallback || "⚽"}</span>`;
}

// matchHtml override - gerçek takım logolu
function matchHtml(m){
  return `
    <div class="match pro-match">
      <div class="match-status">
        <span class="${m.status === "CANLI" ? "live live-pulse" : "time-badge"}">${m.status}</span>
        <small>${m.minute}</small>
      </div>

      <div class="teams pro-teams">
        <small><span>${m.flag}</span> ${m.league}</small>

        <div class="team-row">
          <div class="club">
            ${teamLogoHtml(m.home, m.homeLogo)}
            <b>${m.home}</b>
          </div>

          <div class="score-box">${m.score}</div>

          <div class="club away">
            <b>${m.away}</b>
            ${teamLogoHtml(m.away, m.awayLogo)}
          </div>
        </div>
      </div>

      <div class="odds pro-odds">
        <button class="odd" onclick="addToCoupon('${m.home} - ${m.away}', '1', '${m.odds[0]}')"><span>1</span><b>${m.odds[0]}</b></button>
        <button class="odd" onclick="addToCoupon('${m.home} - ${m.away}', 'X', '${m.odds[1]}')"><span>X</span><b>${m.odds[1]}</b></button>
        <button class="odd" onclick="addToCoupon('${m.home} - ${m.away}', '2', '${m.odds[2]}')"><span>2</span><b>${m.odds[2]}</b></button>
      </div>

      <div class="more">${m.markets} ›</div>
    </div>
  `;
}

// TEAM SEARCH / ADMIN HELPERS
function prettyTeamNameFromKey(key){
  return String(key || "")
    .replace(/footballlogoscc$/i, "")
    .replace(/fc$/i, "")
    .replace(/sk$/i, "")
    .replace(/jk$/i, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2");
}

function getTeamOptions(){
  const logos = window.TEAM_LOGOS || {};
  const keys = Object.keys(logos || {});

  const clean = keys
    .filter(k => k && k.length > 3)
    .filter(k => !k.includes("64x64"))
    .filter(k => !k.includes("2025"))
    .filter(k => !k.includes("2026"))
    .filter(k => !k.includes("footballlogos"))
    .slice(0, 600);

  return clean;
}

function teamDatalistHtml(){
  const teams = getTeamOptions();
  return `
    <datalist id="teamList">
      ${teams.map(t => `<option value="${t}"></option>`).join("")}
    </datalist>
  `;
}

// renderMatchAdmin override - datalist destekli
function renderMatchAdmin(){
  if(user?.role !== "admin"){
    alert("Bu alana sadece admin hesabı erişebilir.");
    loginModal();
    return;
  }

  document.getElementById("app").innerHTML = shell(`
    <section class="page-hero mini admin-mini">
      <div>
        <span>MANUEL SPOR YÖNETİMİ</span>
        <h1>Günlük Maç Girişi</h1>
        <p>Takım adlarını logo klasöründen otomatik eşleştirir. Örnek: manchesterunited, arsenal, fenerbahce.</p>
      </div>
      <button class="btn gold" onclick="resetMatches()">Varsayılana Dön</button>
    </section>

    ${teamDatalistHtml()}

    <section class="admin-layout">
      <div class="card admin-form-card">
        <h3>Maç Ekle</h3>

        <div class="admin-form-grid">
          <label class="field"><span>Durum</span><input id="mStatus" value="CANLI"></label>
          <label class="field"><span>Dakika / Saat</span><input id="mMinute" value="22:00"></label>
          <label class="field"><span>Bayrak</span><input id="mFlag" value="🇹🇷"></label>
          <label class="field"><span>Lig</span><input id="mLeague" value="Türkiye · Süper Lig"></label>

          <label class="field"><span>Ev Sahibi</span><input id="mHome" list="teamList" value="galatasaray"></label>
          <label class="field"><span>Deplasman</span><input id="mAway" list="teamList" value="besiktas"></label>
          <label class="field"><span>Ev Logo Emoji</span><input id="mHomeLogo" value="⚽"></label>
          <label class="field"><span>Dep Logo Emoji</span><input id="mAwayLogo" value="⚽"></label>

          <label class="field"><span>Skor</span><input id="mScore" value="-"></label>
          <label class="field"><span>Oran 1</span><input id="mOdd1" value="1.85"></label>
          <label class="field"><span>Oran X</span><input id="mOddX" value="3.40"></label>
          <label class="field"><span>Oran 2</span><input id="mOdd2" value="4.20"></label>
        </div>

        <button class="btn primary full-btn" onclick="addMatchFromAdmin()">Maçı Ekle</button>
        <button class="btn full-btn cancel-edit-btn" onclick="cancelMatchEdit()">Düzenlemeyi İptal Et</button>
      </div>

      <div class="card admin-list-card">
        <div class="card-head">
          <h3>Aktif Maç Listesi</h3>
          <span>${matches.length} maç</span>
        </div>

        <div class="admin-match-list">
          ${matches.map((m,i)=>`
            <div class="admin-match">
              <div class="admin-teams-preview">
                ${teamLogoHtml(m.home, m.homeLogo)}
                <div>
                  <b>${m.flag} ${m.home} - ${m.away}</b>
                  <span>${m.league} · ${m.status} · ${m.minute}</span>
                </div>
                ${teamLogoHtml(m.away, m.awayLogo)}
              </div>
              <div class="admin-odds">${m.odds[0]} / ${m.odds[1]} / ${m.odds[2]}</div>
              <div class="admin-actions">
                <button class="edit-btn" onclick="editMatch(${i})">Düzenle</button>
                <button onclick="deleteMatch(${i})">Sil</button>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    </section>
  `);
}

// MATCH EDIT SYSTEM
let editingMatchIndex = null;

function editMatch(i){
  editingMatchIndex = i;
  const m = matches[i];

  renderMatchAdmin();

  setTimeout(() => {
    document.getElementById("mStatus").value = m.status || "";
    document.getElementById("mMinute").value = m.minute || "";
    document.getElementById("mFlag").value = m.flag || "";
    document.getElementById("mLeague").value = m.league || "";
    document.getElementById("mHome").value = m.home || "";
    document.getElementById("mAway").value = m.away || "";
    document.getElementById("mHomeLogo").value = m.homeLogo || "⚽";
    document.getElementById("mAwayLogo").value = m.awayLogo || "⚽";
    document.getElementById("mScore").value = m.score || "-";
    document.getElementById("mOdd1").value = m.odds?.[0] || "1.90";
    document.getElementById("mOddX").value = m.odds?.[1] || "3.20";
    document.getElementById("mOdd2").value = m.odds?.[2] || "4.10";

    const btn = document.querySelector(".admin-form-card .full-btn");
    if(btn){
      btn.textContent = "Maçı Güncelle";
      btn.setAttribute("onclick", "updateMatchFromAdmin()");
      btn.classList.add("gold");
    }

    document.querySelector(".admin-form-card")?.scrollIntoView({behavior:"smooth", block:"center"});
  }, 80);
}

function updateMatchFromAdmin(){
  if(editingMatchIndex === null){
    addMatchFromAdmin();
    return;
  }

  matches[editingMatchIndex] = {
    status: document.getElementById("mStatus").value || "CANLI",
    minute: document.getElementById("mMinute").value || "Yakında",
    flag: document.getElementById("mFlag").value || "🏳️",
    league: document.getElementById("mLeague").value || "Lig",
    home: document.getElementById("mHome").value || "Ev Sahibi",
    away: document.getElementById("mAway").value || "Deplasman",
    homeLogo: document.getElementById("mHomeLogo").value || "⚽",
    awayLogo: document.getElementById("mAwayLogo").value || "⚽",
    score: document.getElementById("mScore").value || "-",
    odds:[
      document.getElementById("mOdd1").value || "1.90",
      document.getElementById("mOddX").value || "3.20",
      document.getElementById("mOdd2").value || "4.10"
    ],
    markets:"+100"
  };

  saveMatches();
  editingMatchIndex = null;
  renderMatchAdmin();
}

function cancelMatchEdit(){
  editingMatchIndex = null;
  renderMatchAdmin();
}


function togglePass(id, btn){
  const input = document.getElementById(id);
  if(!input) return;

  if(input.type === "password"){
    input.type = "text";
    btn.textContent = "Gizle";
  }else{
    input.type = "password";
    btn.textContent = "Göster";
  }
}

// ADMIN DASHBOARD + USER DATABASE OVERRIDE
function getUsers(){
  return JSON.parse(localStorage.getItem("bozobet_users") || "[]");
}

function setUsers(users){
  localStorage.setItem("bozobet_users", JSON.stringify(users));
}

function register(){
  const username = document.getElementById("regUser").value.trim();
  const password = document.getElementById("regPass").value || "";
  const name = document.getElementById("regName").value || "";
  const surname = document.getElementById("regSurname").value || "";
  const phone = document.getElementById("regPhone").value || "";
  const tc = document.getElementById("regTc").value || "";
  const email = document.getElementById("regEmail").value || "";
  const birth = document.getElementById("regBirth").value || "";

  if(!name || !surname || !phone || !tc || !email || !birth || !username || !password){
    alert("Tüm üyelik bilgilerini doldurmalısın.");
    return;
  }

  if(!/^\d{11}$/.test(tc)){
    alert("TC Kimlik No 11 haneli olmalı.");
    return;
  }

  const users = getUsers();

  if(users.some(u => u.username.toLowerCase() === username.toLowerCase())){
    alert("Bu kullanıcı adı zaten kayıtlı.");
    return;
  }

  const newUser = {
    id: Date.now(),
    username,
    password,
    name,
    surname,
    phone,
    tc,
    email,
    birth,
    balance:0,
    role:"user",
    createdAt:new Date().toLocaleString("tr-TR")
  };

  users.unshift(newUser);
  setUsers(users);

  user = {...newUser};
  delete user.password;

  user = saveSession(user, true);
  applyAuthenticatedUI(user);
  document.querySelector(".modal-back").remove();
  renderHome();
}

function login(){
  const name = document.getElementById("loginUser").value.trim();
  const pass = document.getElementById("loginPass").value || "";

  if(!name || !pass){
    alert("Kullanıcı adı ve şifre gir.");
    return;
  }

  if(name === "admin" && pass === "admin123"){
    user = {
      username:"admin",
      name:"Admin",
      surname:"Panel",
      email:"admin@galaxybet.local",
      phone:"",
      tc:"",
      birth:"",
      balance:999999,
      role:"admin"
    };

    user = saveSession(user, document.getElementById("loginRememberMe")?.checked === true);
    applyAuthenticatedUI(user);
    document.querySelector(".modal-back").remove();
    renderAdminDashboard();
    return;
  }

  const found = getUsers().find(u => 
    u.username.toLowerCase() === name.toLowerCase() && u.password === pass
  );

  if(!found){
    alert("Kullanıcı adı veya şifre hatalı.");
    return;
  }

  user = {...found};
  delete user.password;

  user = saveSession(user, document.getElementById("loginRememberMe")?.checked === true);
  applyAuthenticatedUI(user);
  document.querySelector(".modal-back").remove();
  renderHome();
}

function renderAdminDashboardLegacy(){
  if(user?.role !== "admin"){
    alert("Bu alana sadece admin hesabı erişebilir.");
    loginModal();
    return;
  }

  const users = getUsers();
  const totalBalance = users.reduce((sum,u)=>sum + Number(u.balance || 0), 0);

  document.getElementById("app").innerHTML = shell(`
    <section class="page-hero mini admin-mini">
      <div>
        <span>GALAXYBET ADMIN</span>
        <h1>Admin Kontrol Paneli</h1>
        <p>Üyeleri, maçları ve  site yönetimini buradan kontrol edebilirsin.</p>
      </div>
    </section>

    <section class="admin-home-grid">
      <div class="admin-stat-card">
        <small>Toplam Üye</small>
        <b>${users.length}</b>
      </div>

      <div class="admin-stat-card">
        <small>Toplam Kullanıcı Bakiyesi</small>
        <b>${money(totalBalance)}</b>
      </div>

      <div class="admin-stat-card">
        <small>Aktif Maç</small>
        <b>${matches.length}</b>
      </div>
    </section>

    <section class="admin-shortcuts">
      <button onclick="renderMatchAdmin()">
        <b>⚽ Maç Yönetimi</b>
        <span>Maç ekle, sil, düzenle, oran güncelle.</span>
      </button>

      <button onclick="renderUsersAdmin()">
        <b>👤 Üye Yönetimi</b>
        <span>Kayıtlı üyeleri ve bilgilerini görüntüle.</span>
      </button>

      <button onclick="renderTransactionsAdmin()">
        <b>📄 İşlem Geçmişi</b>
        <span>Bakiye ekleme/düşme kayıtlarını görüntüle.</span>
      </button>

      <button onclick="renderPaymentRequestsAdmin()">
        <b>💳 Finans Talepleri</b>
        <span>Yatırım ve çekim taleplerini onayla/reddet.</span>
      </button>

      <button onclick="renderBetsAdmin()">
        <b>🎫 Kupon Geçmişi</b>
        <span>Oynanan kuponları ve seçimleri görüntüle.</span>
      </button>

      <button onclick="renderHome()">
        <b>🏠 Siteye Dön</b>
        <span>Ana sayfayı kullanıcı gibi görüntüle.</span>
      </button>
    </section>
  `);
}

function renderUsersAdminLegacy1(){
  if(user?.role !== "admin"){
    alert("Bu alana sadece admin hesabı erişebilir.");
    loginModal();
    return;
  }

  const users = getUsers();

  document.getElementById("app").innerHTML = shell(`
    <section class="page-hero mini admin-mini">
      <div>
        <span>ÜYE YÖNETİMİ</span>
        <h1>Kayıtlı Üyeler</h1>
        <p> sistemde üye bilgileri sadece bu tarayıcıdaki localStorage içinde tutulur.</p>
      </div>
      <button class="btn gold" onclick="renderAdminDashboard()">Admin Panele Dön</button>
    </section>

    <section class="card users-admin-card">
      <div class="card-head">
        <h3>Üye Listesi</h3>
        <span>${users.length} kayıt</span>
      </div>

      ${users.length ? `
        <div class="users-table-wrap">
          <table class="users-table">
            <thead>
              <tr>
                <th>Kullanıcı</th>
                <th>Ad Soyad</th>
                <th>Telefon</th>
                <th>E-posta</th>
                <th>TC</th>
                <th>Doğum</th>
                <th>Bakiye</th>
                <th>Kayıt</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(u=>`
                <tr>
                  <td><b>${u.username}</b></td>
                  <td>${u.name} ${u.surname}</td>
                  <td>${u.phone}</td>
                  <td>${u.email}</td>
                  <td>${u.tc}</td>
                  <td>${u.birth}</td>
                  <td><strong>${money(u.balance || 0)}</strong></td>
                  <td>${u.createdAt || "-"}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : `
        <div class="empty-coupon">
          <b>Henüz kayıtlı üye yok</b>
          <span>Üye ol ekranından yeni kullanıcı oluşturunca burada görünecek.</span>
        </div>
      `}
    </section>
  `);
}

// ADMIN USER BALANCE MANAGEMENT
function updateUserBalanceLegacy(userId, type){
  if(user?.role !== "admin"){
    alert("Bu işlem sadece admin için.");
    return;
  }

  const input = document.getElementById("balance_" + userId);
  const amount = Number(input?.value || 0);

  if(!amount || amount <= 0){
    alert("Geçerli tutar gir.");
    return;
  }

  const users = getUsers();
  const target = users.find(u => String(u.id) === String(userId));

  if(!target){
    alert("Kullanıcı bulunamadı.");
    return;
  }

  if(type === "add"){
    target.balance = Number(target.balance || 0) + amount;
  }

  if(type === "remove"){
    target.balance = Math.max(0, Number(target.balance || 0) - amount);
  }

  setUsers(users);

  if(window.user && user.username === target.username){
    user.balance = target.balance;
    saveUser();
  }

  renderUsersAdmin();
}

// renderUsersAdmin override - bakiye işlemli
function renderUsersAdminLegacy2(){
  if(user?.role !== "admin"){
    alert("Bu alana sadece admin hesabı erişebilir.");
    loginModal();
    return;
  }

  const users = getUsers();

  document.getElementById("app").innerHTML = shell(`
    <section class="page-hero mini admin-mini">
      <div>
        <span>ÜYE YÖNETİMİ</span>
        <h1>Kayıtlı Üyeler</h1>
        <p>Üyeleri görüntüle,  bakiye ekle veya bakiye düş.</p>
      </div>
      <button class="btn gold" onclick="renderAdminDashboard()">Admin Panele Dön</button>
    </section>

    <section class="card users-admin-card">
      <div class="card-head">
        <h3>Üye Listesi</h3>
        <span>${users.length} kayıt</span>
      </div>

      ${users.length ? `
        <div class="users-table-wrap">
          <table class="users-table users-table-balance">
            <thead>
              <tr>
                <th>Kullanıcı</th>
                <th>Ad Soyad</th>
                <th>Telefon</th>
                <th>E-posta</th>
                <th>TC</th>
                <th>Bakiye</th>
                <th>Bakiye İşlemi</th>
                <th>Kayıt</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(u=>`
                <tr>
                  <td><b>${u.username}</b></td>
                  <td>${u.name} ${u.surname}</td>
                  <td>${u.phone}</td>
                  <td>${u.email}</td>
                  <td>${u.tc}</td>
                  <td><strong>${money(u.balance || 0)}</strong></td>
                  <td>
                    <div class="balance-admin-box">
                      <input id="balance_${u.id}" type="number" placeholder="Tutar">
                      <button class="add-balance-btn" onclick="updateUserBalance('${u.id}', 'add')">Ekle</button>
                      <button class="remove-balance-btn" onclick="updateUserBalance('${u.id}', 'remove')">Düş</button>
                    </div>
                  </td>
                  <td>${u.createdAt || "-"}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : `
        <div class="empty-coupon">
          <b>Henüz kayıtlı üye yok</b>
          <span>Üye ol ekranından yeni kullanıcı oluşturunca burada görünecek.</span>
        </div>
      `}
    </section>
  `);
}

// TRANSACTION HISTORY SYSTEM
function getTransactions(){
  return JSON.parse(localStorage.getItem("bozobet_transactions") || "[]");
}

function setTransactions(items){
  localStorage.setItem("bozobet_transactions", JSON.stringify(items));
}

function addTransaction(item){
  const txs = getTransactions();
  txs.unshift({
    id: Date.now(),
    date: new Date().toLocaleString("tr-TR"),
    ...item
  });
  setTransactions(txs);
}

// bakiye işlem override - hareket kayıtlı
function updateUserBalance(userId, type){
  if(user?.role !== "admin"){
    alert("Bu işlem sadece admin için.");
    return;
  }

  const input = document.getElementById("balance_" + userId);
  const amount = Number(input?.value || 0);

  if(!amount || amount <= 0){
    alert("Geçerli tutar gir.");
    return;
  }

  const users = getUsers();
  const target = users.find(u => String(u.id) === String(userId));

  if(!target){
    alert("Kullanıcı bulunamadı.");
    return;
  }

  if(type === "add"){
    target.balance = Number(target.balance || 0) + amount;

    addTransaction({
      username: target.username,
      userId: target.id,
      type: "Yatırım",
      direction: "plus",
      amount,
      status: "Onaylandı",
      note: "Admin bakiye ekledi"
    });
  }

  if(type === "remove"){
    target.balance = Math.max(0, Number(target.balance || 0) - amount);

    addTransaction({
      username: target.username,
      userId: target.id,
      type: "Bakiye Düşüm",
      direction: "minus",
      amount,
      status: "Onaylandı",
      note: "Admin bakiye düşürdü"
    });
  }

  setUsers(users);

  if(window.user && user.username === target.username){
    user.balance = target.balance;
    saveUser();
  }

  renderUsersAdmin();
}

function renderTransactionsAdmin(){
  if(user?.role !== "admin"){
    alert("Bu alana sadece admin hesabı erişebilir.");
    loginModal();
    return;
  }

  const txs = getTransactions();

  document.getElementById("app").innerHTML = shell(`
    <section class="page-hero mini admin-mini">
      <div>
        <span>İŞLEM GEÇMİŞİ</span>
        <h1>Bakiye Hareketleri</h1>
        <p>Admin bakiye ekleme/düşme işlemleri burada listelenir.</p>
      </div>
      <button class="btn gold" onclick="renderAdminDashboard()">Admin Panele Dön</button>
    </section>

    <section class="card users-admin-card">
      <div class="card-head">
        <h3>İşlem Kayıtları</h3>
        <span>${txs.length} işlem</span>
      </div>

      ${txs.length ? `
        <div class="users-table-wrap">
          <table class="users-table tx-table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Kullanıcı</th>
                <th>İşlem</th>
                <th>Tutar</th>
                <th>Durum</th>
                <th>Not</th>
              </tr>
            </thead>
            <tbody>
              ${txs.map(t=>`
                <tr>
                  <td>${t.date}</td>
                  <td><b>${t.username}</b></td>
                  <td>${t.type}</td>
                  <td class="${t.direction === "plus" ? "tx-plus" : "tx-minus"}">
                    ${t.direction === "plus" ? "+" : "-"}${money(t.amount)}
                  </td>
                  <td><span class="tx-status">${t.status}</span></td>
                  <td>${t.note || "-"}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : `
        <div class="empty-coupon">
          <b>Henüz işlem yok</b>
          <span>Admin üye bakiyesi ekleyip düşürdüğünde burada görünecek.</span>
        </div>
      `}
    </section>
  `);
}

// PAYMENT REQUESTS SYSTEM - DEMO
function getPaymentRequests(){
  return JSON.parse(localStorage.getItem("bozobet_payment_requests") || "[]");
}

function setPaymentRequests(items){
  localStorage.setItem("bozobet_payment_requests", JSON.stringify(items));
}

function addPaymentRequest(item){
  const items = getPaymentRequests();
  items.unshift({
    id: Date.now(),
    date: new Date().toLocaleString("tr-TR"),
    status:"Bekliyor",
    ...item
  });
  setPaymentRequests(items);
}

function submitWithdrawRequest(){
  if(!user){
    loginModal();
    return;
  }

  const amount = Number(document.getElementById("withdrawAmount")?.value || 0);
  const iban = document.getElementById("withdrawIban")?.value || "";

  if(!amount || amount <= 0){
    alert("Geçerli çekim tutarı gir.");
    return;
  }

  if(Number(user.balance || 0) < amount){
    alert("Yetersiz bakiye.");
    return;
  }

  if(!iban || iban.length < 10){
    alert("IBAN bilgisini gir.");
    return;
  }

  addPaymentRequest({
    username:user.username,
    userId:user.id || user.username,
    type:"Çekim",
    direction:"minus",
    amount,
    iban,
    method:"Banka",
    note:"Kullanıcı çekim talebi oluşturdu"
  });

  document.querySelector(".modal-back")?.remove();
  alert("Çekim talebin oluşturuldu. Admin onayından sonra işlenecek.");
  renderProfile();
}

// Canonical deposit entry point.
function depositModal(){
  renderDepositSitePage();
}
// withdraw modal override
function withdrawModal(){
  if(!user){
    loginModal();
    return;
  }

  modal(`
    <div class="auth-box payment-box">
      <div class="auth-side">
        <div class="auth-badge">ÇEKİM TALEBİ</div>
        <h2>Para Çek</h2>
        <p>Çekim talebin admin paneline düşer. Onaylanırsa  bakiyeden düşülür.</p>
      </div>

      <div class="auth-form">
        <h2>Çekim Talebi</h2>

        <label class="field">
          <span>Çekim Tutarı</span>
          <input id="withdrawAmount" type="number" placeholder="Örn: 500">
        </label>

        <label class="field">
          <span>IBAN</span>
          <input id="withdrawIban" placeholder="TR00 0000 0000 0000 0000 0000 00">
        </label>

        <div class="payment-info">
          <b>Mevcut Bakiye</b>
          <span>${money(user.balance || 0)}</span>
        </div>

        <button class="btn primary full-btn" onclick="submitWithdrawRequest()">Çekim Talebi Oluştur</button>
      </div>
    </div>
  `);
}

function approvePaymentRequest(id){
  if(user?.role !== "admin"){
    alert("Bu işlem sadece admin için.");
    return;
  }

  const reqs = getPaymentRequests();
  const req = reqs.find(r => String(r.id) === String(id));

  if(!req || req.status !== "Bekliyor"){
    alert("Talep bulunamadı veya zaten işlenmiş.");
    return;
  }

  const users = getUsers();
  const target = users.find(u => String(u.id) === String(req.userId) || u.username === req.username);

  if(!target){
    alert("Kullanıcı bulunamadı.");
    return;
  }

  if(req.type === "Yatırım"){
    target.balance = Number(target.balance || 0) + Number(req.amount || 0);
  }

  if(req.type === "Çekim"){
    if(Number(target.balance || 0) < Number(req.amount || 0)){
      alert("Kullanıcı bakiyesi çekim için yetersiz.");
      return;
    }

    target.balance = Number(target.balance || 0) - Number(req.amount || 0);
  }

  req.status = "Onaylandı";
  req.processedAt = new Date().toLocaleString("tr-TR");

  setUsers(users);
  setPaymentRequests(reqs);

  addTransaction({
    username: target.username,
    userId: target.id,
    type: req.type,
    direction: req.type === "Yatırım" ? "plus" : "minus",
    amount: req.amount,
    status:"Onaylandı",
    note:"Admin talebi onayladı"
  });

  renderPaymentRequestsAdmin();
}

function rejectPaymentRequest(id){
  if(user?.role !== "admin"){
    alert("Bu işlem sadece admin için.");
    return;
  }

  const reqs = getPaymentRequests();
  const req = reqs.find(r => String(r.id) === String(id));

  if(!req){
    alert("Talep bulunamadı.");
    return;
  }

  req.status = "Reddedildi";
  req.processedAt = new Date().toLocaleString("tr-TR");

  setPaymentRequests(reqs);
  renderPaymentRequestsAdmin();
}

function renderPaymentRequestsAdminLegacy1(){
  if(user?.role !== "admin"){
    alert("Bu alana sadece admin hesabı erişebilir.");
    loginModal();
    return;
  }

  const reqs = getPaymentRequests();
  const pending = reqs.filter(r => r.status === "Bekliyor").length;

  document.getElementById("app").innerHTML = shell(`
    <section class="page-hero mini admin-mini">
      <div>
        <span>FİNANS TALEPLERİ</span>
        <h1>Yatırım / Çekim Talepleri</h1>
        <p>Kullanıcıların oluşturduğu  finans taleplerini buradan onaylayabilir veya reddedebilirsin.</p>
      </div>
      <button class="btn gold" onclick="renderAdminDashboard()">Admin Panele Dön</button>
    </section>

    <section class="card users-admin-card">
      <div class="card-head">
        <h3>Bekleyen / Geçmiş Talepler</h3>
        <span>${pending} bekleyen</span>
      </div>

      ${reqs.length ? `
        <div class="users-table-wrap">
          <table class="users-table payment-requests-table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Kullanıcı</th>
                <th>Tür</th>
                <th>Tutar</th>
                <th>Yöntem</th>
                <th>IBAN</th>
                <th>Durum</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              ${reqs.map(r=>`
                <tr>
                  <td>${r.date}</td>
                  <td><b>${r.username}</b></td>
                  <td>${r.type}</td>
                  <td class="${r.direction === "plus" ? "tx-plus" : "tx-minus"}">
                    ${r.direction === "plus" ? "+" : "-"}${money(r.amount)}
                  </td>
                  <td>${r.method || "-"}</td>
                  <td>${r.iban || "-"}</td>
                  <td><span class="request-status status-${r.status.toLowerCase()}">${r.status}</span></td>
                  <td>
                    ${r.status === "Bekliyor" ? `
                      <div class="request-actions">
                        <button class="approve-btn" onclick="approvePaymentRequest('${r.id}')">Onayla</button>
                        <button class="reject-btn" onclick="rejectPaymentRequest('${r.id}')">Reddet</button>
                      </div>
                    ` : `<span class="processed-date">${r.processedAt || "-"}</span>`}
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : `
        <div class="empty-coupon">
          <b>Henüz finans talebi yok</b>
          <span>Kullanıcı para yatır/çek talebi oluşturunca burada görünür.</span>
        </div>
      `}
    </section>
  `);
}

// GLOBAL CLEANUP - GOOGLE / CHEAP WARNING CARDS
function removeGoogleCheapWarningCards(){
  const badWords = ["google", "ucuz", "uyarı", "warning", "cheap"];
  const selectors = [
    ".card",
    ".promo-card",
    ".trust-card",
    ".game-card",
    ".modal",
    ".banner",
    ".notice",
    ".alert",
    "section",
    "div"
  ];

  document.querySelectorAll(selectors.join(",")).forEach(el => {
    if(!el || el.closest("header") || el.id === "app") return;

    const text = (el.innerText || "").toLowerCase();

    const hasGoogle = text.includes("google");
    const hasCheapWarning = text.includes("ucuz") || text.includes("uyarı") || text.includes("warning") || text.includes("cheap");

    if(hasGoogle && hasCheapWarning){
      el.remove();
    }
  });
}

function cleanAfterRender(){
  setTimeout(removeGoogleCheapWarningCards, 50);
  setTimeout(removeGoogleCheapWarningCards, 300);
  setTimeout(removeGoogleCheapWarningCards, 900);
}

const cleanupObserver = new MutationObserver(() => {
  removeGoogleCheapWarningCards();
});

cleanupObserver.observe(document.documentElement, {
  childList:true,
  subtree:true
});

document.addEventListener("DOMContentLoaded", cleanAfterRender);
window.addEventListener("load", cleanAfterRender);

// render fonksiyonlarından sonra otomatik temizlik
["renderHome","renderSports","renderCasino","renderPromotions","renderVip","renderSupport","renderProfile","renderAdminDashboard","renderUsersAdmin","renderPaymentRequestsAdmin","renderTransactionsAdmin"].forEach(fnName => {
  const oldFn = window[fnName];
  if(typeof oldFn === "function"){
    window[fnName] = function(...args){
      const result = oldFn.apply(this,args);
      cleanAfterRender();
      return result;
    }
  }
});

// ADMIN BADGE HELPERS
function pendingFinanceCount(){
  try{
    return getPaymentRequests().filter(r => r.status === "Bekliyor").length;
  }catch(e){
    return 0;
  }
}

// Admin dashboard override badge polish
const oldRenderAdminDashboardForBadge = renderAdminDashboard;
renderAdminDashboard = function(){
  oldRenderAdminDashboardForBadge();

  setTimeout(() => {
    const buttons = document.querySelectorAll(".admin-shortcuts button");
    buttons.forEach(btn => {
      const text = btn.innerText || "";
      if(text.includes("Finans Talepleri")){
        const count = pendingFinanceCount();
        if(count > 0 && !btn.querySelector(".admin-pending-badge")){
          btn.insertAdjacentHTML("beforeend", `<em class="admin-pending-badge">${count}</em>`);
        }
      }
    });

    removeGoogleCheapWarningCards();
  }, 80);
};

// CUSTOM SITE ALERT - NATIVE WHITE ALERT REMOVER
function siteNotify(message, type = "success"){
  let box = document.getElementById("siteNotifyBox");

  if(!box){
    box = document.createElement("div");
    box.id = "siteNotifyBox";
    document.body.appendChild(box);
  }

  const item = document.createElement("div");
  item.className = `site-toast ${type}`;

  item.innerHTML = `
    <div class="toast-icon">${type === "error" ? "!" : "✓"}</div>
    <div class="toast-text">${message}</div>
    <button onclick="this.closest('.site-toast').remove()">×</button>
  `;

  box.appendChild(item);

  setTimeout(() => {
    item.classList.add("hide");
    setTimeout(() => item.remove(), 250);
  }, 3500);
}

// Tarayıcının beyaz alert kartını komple kapatıp site içi bildirime çevirir
window.alert = function(message){
  const text = String(message || "");
  const isError =
    text.toLowerCase().includes("hatalı") ||
    text.toLowerCase().includes("geçersiz") ||
    text.toLowerCase().includes("yetersiz") ||
    text.toLowerCase().includes("doldur") ||
    text.toLowerCase().includes("bulunamadı") ||
    text.toLowerCase().includes("izin");

  siteNotify(text, isError ? "error" : "success");
};

// USER PAYMENT REQUEST HISTORY
function userPaymentRequestsHtml(){
  if(!user) return "";

  const reqs = getPaymentRequests()
    .filter(r => r.username === user.username)
    .slice(0, 10);

  return `
    <div class="profile-request-box">
      <h3>Yatırım / Çekim Taleplerim</h3>

      ${reqs.length ? reqs.map(r => `
        <div class="profile-request-item">
          <div class="request-left">
            <b>${r.type}</b>
            <span>${r.date}</span>
            <small>${r.method || ""}</small>
          </div>

          <div class="request-mid ${r.direction === "plus" ? "tx-plus" : "tx-minus"}">
            ${r.direction === "plus" ? "+" : "-"}${money(r.amount)}
          </div>

          <div class="request-right">
            <span class="request-status status-${r.status.toLowerCase()}">${r.status}</span>
          </div>
        </div>
      `).join("") : `
        <div class="empty-profile-tx">
          Henüz yatırım veya çekim talebin yok.
        </div>
      `}
    </div>
  `;
}

// renderProfile override - talep geçmişli
const oldRenderProfileWithRequests = renderProfile;
renderProfile = function(){
  oldRenderProfileWithRequests();

  setTimeout(() => {
    const profileCard = document.querySelector(".profile-card") || document.querySelector(".card");
    if(profileCard && !document.querySelector(".profile-request-box")){
      profileCard.insertAdjacentHTML("beforeend", userPaymentRequestsHtml());
    }
  }, 80);
};

// PAYMENT REQUEST FILTERED ADMIN OVERRIDE
let paymentReqFilter = "all";
let paymentReqTypeFilter = "all";
let paymentReqSearch = "";

function setPaymentReqFilter(status){
  paymentReqFilter = status;
  renderPaymentRequestsAdmin();
}

function setPaymentReqTypeFilter(type){
  paymentReqTypeFilter = type;
  renderPaymentRequestsAdmin();
}

function searchPaymentRequests(){
  paymentReqSearch = (document.getElementById("paymentSearch")?.value || "").toLowerCase().trim();
  renderPaymentRequestsAdmin();
}

function clearPaymentSearch(){
  paymentReqSearch = "";
  renderPaymentRequestsAdmin();
}

function filteredPaymentRequests(){
  let reqs = getPaymentRequests();

  if(paymentReqFilter !== "all"){
    reqs = reqs.filter(r => r.status === paymentReqFilter);
  }

  if(paymentReqTypeFilter !== "all"){
    reqs = reqs.filter(r => r.type === paymentReqTypeFilter);
  }

  if(paymentReqSearch){
    reqs = reqs.filter(r =>
      String(r.username || "").toLowerCase().includes(paymentReqSearch) ||
      String(r.amount || "").includes(paymentReqSearch) ||
      String(r.iban || "").toLowerCase().includes(paymentReqSearch)
    );
  }

  return reqs;
}

function renderPaymentRequestsAdminLegacy2(){
  if(user?.role !== "admin"){
    alert("Bu alana sadece admin hesabı erişebilir.");
    loginModal();
    return;
  }

  const allReqs = getPaymentRequests();
  const reqs = filteredPaymentRequests();

  const pendingDeposit = allReqs.filter(r => r.status === "Bekliyor" && r.type === "Yatırım").length;
  const pendingWithdraw = allReqs.filter(r => r.status === "Bekliyor" && r.type === "Çekim").length;
  const pendingTotal = pendingDeposit + pendingWithdraw;

  document.getElementById("app").innerHTML = shell(`
    <section class="page-hero mini admin-mini">
      <div>
        <span>FİNANS TALEPLERİ</span>
        <h1>Yatırım / Çekim Talepleri</h1>
        <p>Bekleyen talepleri filtrele, kullanıcı ara, onayla veya reddet.</p>
      </div>
      <button class="btn gold" onclick="renderAdminDashboard()">Admin Panele Dön</button>
    </section>

    <section class="payment-summary-grid">
      <div class="admin-stat-card">
        <small>Bekleyen Toplam</small>
        <b>${pendingTotal}</b>
      </div>

      <div class="admin-stat-card">
        <small>Bekleyen Yatırım</small>
        <b>${pendingDeposit}</b>
      </div>

      <div class="admin-stat-card">
        <small>Bekleyen Çekim</small>
        <b>${pendingWithdraw}</b>
      </div>
    </section>

    <section class="card users-admin-card">
      <div class="card-head payment-head">
        <div>
          <h3>Finans Talep Listesi</h3>
          <span>${reqs.length} kayıt gösteriliyor</span>
        </div>

        <div class="payment-search">
          <input id="paymentSearch" value="${paymentReqSearch}" placeholder="Kullanıcı / tutar / IBAN ara">
          <button onclick="searchPaymentRequests()">Ara</button>
          <button onclick="clearPaymentSearch()">Temizle</button>
        </div>
      </div>

      <div class="payment-filters">
        <button class="${paymentReqFilter === "all" ? "active" : ""}" onclick="setPaymentReqFilter('all')">Tümü</button>
        <button class="${paymentReqFilter === "Bekliyor" ? "active" : ""}" onclick="setPaymentReqFilter('Bekliyor')">Bekleyen</button>
        <button class="${paymentReqFilter === "Onaylandı" ? "active" : ""}" onclick="setPaymentReqFilter('Onaylandı')">Onaylanan</button>
        <button class="${paymentReqFilter === "Reddedildi" ? "active" : ""}" onclick="setPaymentReqFilter('Reddedildi')">Reddedilen</button>

        <span></span>

        <button class="${paymentReqTypeFilter === "all" ? "active" : ""}" onclick="setPaymentReqTypeFilter('all')">Tüm Türler</button>
        <button class="${paymentReqTypeFilter === "Yatırım" ? "active" : ""}" onclick="setPaymentReqTypeFilter('Yatırım')">Yatırım</button>
        <button class="${paymentReqTypeFilter === "Çekim" ? "active" : ""}" onclick="setPaymentReqTypeFilter('Çekim')">Çekim</button>
      </div>

      ${reqs.length ? `
        <div class="users-table-wrap">
          <table class="users-table payment-requests-table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Kullanıcı</th>
                <th>Tür</th>
                <th>Tutar</th>
                <th>Yöntem</th>
                <th>IBAN</th>
                <th>Durum</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              ${reqs.map(r=>`
                <tr>
                  <td>${r.date}</td>
                  <td><b>${r.username}</b></td>
                  <td>${r.type}</td>
                  <td class="${r.direction === "plus" ? "tx-plus" : "tx-minus"}">
                    ${r.direction === "plus" ? "+" : "-"}${money(r.amount)}
                  </td>
                  <td>${r.method || "-"}</td>
                  <td>${r.iban || "-"}</td>
                  <td><span class="request-status status-${r.status.toLowerCase()}">${r.status}</span></td>
                  <td>
                    ${r.status === "Bekliyor" ? `
                      <div class="request-actions">
                        <button class="approve-btn" onclick="approvePaymentRequest('${r.id}')">Onayla</button>
                        <button class="reject-btn" onclick="rejectPaymentRequest('${r.id}')">Reddet</button>
                      </div>
                    ` : `<span class="processed-date">${r.processedAt || "-"}</span>`}
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : `
        <div class="empty-coupon">
          <b>Kayıt bulunamadı</b>
          <span>Filtreleri temizleyip tekrar deneyebilirsin.</span>
        </div>
      `}
    </section>
  `);
}

// USER ACTIVE / PASSIVE SYSTEM
function toggleUserStatus(userId){
  if(user?.role !== "admin"){
    alert("Bu işlem sadece admin için.");
    return;
  }

  const users = getUsers();
  const target = users.find(u => String(u.id) === String(userId));

  if(!target){
    alert("Kullanıcı bulunamadı.");
    return;
  }

  target.status = target.status === "passive" ? "active" : "passive";
  setUsers(users);

  addTransaction({
    username: target.username,
    userId: target.id,
    type: target.status === "passive" ? "Hesap Pasife Alındı" : "Hesap Aktifleştirildi",
    direction: "info",
    amount: 0,
    status: "Onaylandı",
    note: "Admin kullanıcı durumunu değiştirdi"
  });

  renderUsersAdmin();
}

// login override - pasif kullanıcı giremesin
const oldLoginBeforeStatus = login;
login = function(){
  const name = document.getElementById("loginUser").value.trim();
  const pass = document.getElementById("loginPass").value || "";

  if(!name || !pass){
    alert("Kullanıcı adı ve şifre gir.");
    return;
  }

  if(name === "admin" && pass === "admin123"){
    user = {
      username:"admin",
      name:"Admin",
      surname:"Panel",
      email:"admin@galaxybet.local",
      phone:"",
      tc:"",
      birth:"",
      balance:999999,
      role:"admin",
      status:"active"
    };

    user = saveSession(user, document.getElementById("loginRememberMe")?.checked === true);
    applyAuthenticatedUI(user);
    document.querySelector(".modal-back")?.remove();
    renderAdminDashboard();
    return;
  }

  const found = getUsers().find(u =>
    u.username.toLowerCase() === name.toLowerCase() && u.password === pass
  );

  if(!found){
    alert("Kullanıcı adı veya şifre hatalı.");
    return;
  }

  if(found.status === "passive"){
    alert("Hesabın geçici olarak pasife alınmış. Destek ile iletişime geç.");
    return;
  }

  user = {...found, status: found.status || "active"};
  delete user.password;

  user = saveSession(user, document.getElementById("loginRememberMe")?.checked === true);
  applyAuthenticatedUI(user);
  document.querySelector(".modal-back")?.remove();
  renderHome();
};

// renderUsersAdmin override - aktif/pasif kontrollü
function renderUsersAdminLegacy3(){
  if(user?.role !== "admin"){
    alert("Bu alana sadece admin hesabı erişebilir.");
    loginModal();
    return;
  }

  const users = getUsers();

  document.getElementById("app").innerHTML = shell(`
    <section class="page-hero mini admin-mini">
      <div>
        <span>ÜYE YÖNETİMİ</span>
        <h1>Kayıtlı Üyeler</h1>
        <p>Üyeleri görüntüle, bakiye yönet, aktif/pasif durumunu değiştir.</p>
      </div>
      <button class="btn gold" onclick="renderAdminDashboard()">Admin Panele Dön</button>
    </section>

    <section class="card users-admin-card">
      <div class="card-head">
        <h3>Üye Listesi</h3>
        <span>${users.length} kayıt</span>
      </div>

      ${users.length ? `
        <div class="users-table-wrap">
          <table class="users-table users-table-balance users-status-table">
            <thead>
              <tr>
                <th>Kullanıcı</th>
                <th>Ad Soyad</th>
                <th>Telefon</th>
                <th>E-posta</th>
                <th>TC</th>
                <th>Durum</th>
                <th>Bakiye</th>
                <th>Bakiye İşlemi</th>
                <th>Detay</th>
                <th>Hesap</th>
                <th>Kayıt</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(u=>{
                const status = u.status || "active";
                return `
                  <tr>
                    <td><b>${u.username}</b></td>
                    <td>${u.name} ${u.surname}</td>
                    <td>${u.phone}</td>
                    <td>${u.email}</td>
                    <td>${u.tc}</td>
                    <td>
                      <span class="user-status-pill ${status === "passive" ? "passive" : "active"}">
                        ${status === "passive" ? "Pasif" : "Aktif"}
                      </span>
                    </td>
                    <td><strong>${money(u.balance || 0)}</strong></td>
                    <td>
                      <div class="balance-admin-box">
                        <input id="balance_${u.id}" type="number" placeholder="Tutar">
                        <button class="add-balance-btn" onclick="updateUserBalance('${u.id}', 'add')">Ekle</button>
                        <button class="remove-balance-btn" onclick="updateUserBalance('${u.id}', 'remove')">Düş</button>
                      </div>
                    </td>
                    <td>
                      <button class="detail-user-btn" onclick="renderUserDetailAdmin('${u.id}')">Detay</button>
                    </td>
                    <td>
                      <button class="status-toggle-btn ${status === "passive" ? "make-active" : "make-passive"}" onclick="toggleUserStatus('${u.id}')">
                        ${status === "passive" ? "Aktifleştir" : "Pasife Al"}
                      </button>
                    </td>
                    <td>${u.createdAt || "-"}</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      ` : `
        <div class="empty-coupon">
          <b>Henüz kayıtlı üye yok</b>
          <span>Üye ol ekranından yeni kullanıcı oluşturunca burada görünecek.</span>
        </div>
      `}
    </section>
  `);
}

// BET / COUPON HISTORY SYSTEM
function getBets(){
  return JSON.parse(localStorage.getItem("bozobet_bets") || "[]");
}

function setBets(items){
  localStorage.setItem("bozobet_bets", JSON.stringify(items));
}

function addBet(item){
  const bets = getBets();
  bets.unshift({
    id: Date.now(),
    date: new Date().toLocaleString("tr-TR"),
    status:"Bekliyor",
    ...item
  });
  setBets(bets);
}

// playCoupon override - kupon geçmişli
function playCoupon(){
  if(!user){
    loginModal();
    return;
  }

  if(!coupon.length){
    alert("Önce oran seçmelisin.");
    return;
  }

  const stake = Number(localStorage.getItem("coupon_stake") || 100);

  if(stake <= 0){
    alert("Geçerli kupon tutarı gir.");
    return;
  }

  if(Number(user.balance || 0) < stake){
    alert("Yetersiz bakiye. Para yatırmalısın.");
    depositModal();
    return;
  }

  const totalOdd = coupon.reduce((acc, x) => acc * Number(x.odd), 1);
  const possibleWin = stake * totalOdd;

  user.balance = Number(user.balance || 0) - stake;
  saveUser();

  const users = getUsers();
  const target = users.find(u => u.username === user.username);
  if(target){
    target.balance = user.balance;
    setUsers(users);
  }

  addBet({
    username:user.username,
    userId:user.id || user.username,
    selections:[...coupon],
    stake,
    totalOdd:Number(totalOdd.toFixed(2)),
    possibleWin:Number(possibleWin.toFixed(2))
  });

  addTransaction({
    username:user.username,
    userId:user.id || user.username,
    type:"Kupon Oynandı",
    direction:"minus",
    amount:stake,
    status:"Onaylandı",
    note:`Toplam oran: ${totalOdd.toFixed(2)}`
  });

  alert("Kupon başarıyla oynandı.");
  coupon = [];
  renderSports();
}

function userBetHistoryHtml(){
  if(!user) return "";

  const bets = getBets()
    .filter(b => b.username === user.username)
    .slice(0, 8);

  return `
    <div class="profile-bet-box">
      <h3>Kupon Geçmişim</h3>

      ${bets.length ? bets.map(b => `
        <div class="profile-bet-item">
          <div class="bet-top">
            <div>
              <b>${b.selections.length} Maçlık Kupon</b>
              <span>${b.date}</span>
            </div>
            <span class="bet-status">${b.status}</span>
          </div>

          <div class="bet-selections">
            ${b.selections.map(s => `
              <div>
                <span>${s.match}</span>
                <b>${s.pick} · ${s.odd}</b>
              </div>
            `).join("")}
          </div>

          <div class="bet-bottom">
            <span>Tutar: <b>${money(b.stake)}</b></span>
            <span>Oran: <b>${b.totalOdd}</b></span>
            <span>Kazanç: <b>${money(b.possibleWin)}</b></span>
          </div>
        </div>
      `).join("") : `
        <div class="empty-profile-tx">
          Henüz kupon geçmişin yok.
        </div>
      `}
    </div>
  `;
}

// renderProfile override - kupon geçmişi ekle
const oldRenderProfileWithBets = renderProfile;
renderProfile = function(){
  oldRenderProfileWithBets();

  setTimeout(() => {
    const profileCard = document.querySelector(".profile-card") || document.querySelector(".card");
    if(profileCard && !document.querySelector(".profile-bet-box")){
      profileCard.insertAdjacentHTML("beforeend", userBetHistoryHtml());
    }
  }, 100);
};

function renderBetsAdminLegacy1(){
  if(user?.role !== "admin"){
    alert("Bu alana sadece admin hesabı erişebilir.");
    loginModal();
    return;
  }

  const bets = getBets();

  document.getElementById("app").innerHTML = shell(`
    <section class="page-hero mini admin-mini">
      <div>
        <span>KUPON GEÇMİŞİ</span>
        <h1>Oynanan Kuponlar</h1>
        <p>Kullanıcıların oynadığı  kuponları buradan görüntüleyebilirsin.</p>
      </div>
      <button class="btn gold" onclick="renderAdminDashboard()">Admin Panele Dön</button>
    </section>

    <section class="card users-admin-card">
      <div class="card-head">
        <h3>Kupon Listesi</h3>
        <span>${bets.length} kupon</span>
      </div>

      ${bets.length ? `
        <div class="admin-bet-list">
          ${bets.map(b => `
            <div class="admin-bet-card">
              <div class="admin-bet-head">
                <div>
                  <b>${b.username}</b>
                  <span>${b.date}</span>
                </div>
                <span class="bet-status">${b.status}</span>
              </div>

              <div class="bet-selections">
                ${b.selections.map(s => `
                  <div>
                    <span>${s.match}</span>
                    <b>${s.pick} · ${s.odd}</b>
                  </div>
                `).join("")}
              </div>

              <div class="bet-bottom">
                <span>Tutar: <b>${money(b.stake)}</b></span>
                <span>Toplam Oran: <b>${b.totalOdd}</b></span>
                <span>Muhtemel Kazanç: <b>${money(b.possibleWin)}</b></span>
              </div>
            </div>
          `).join("")}
        </div>
      ` : `
        <div class="empty-coupon">
          <b>Henüz oynanan kupon yok</b>
          <span>Kullanıcı kupon oynayınca burada görünecek.</span>
        </div>
      `}
    </section>
  `);
}

// BET SETTLEMENT SYSTEM
function settleBet(betId, result){
  if(user?.role !== "admin"){
    alert("Bu işlem sadece admin için.");
    return;
  }

  const bets = getBets();
  const bet = bets.find(b => String(b.id) === String(betId));

  if(!bet){
    alert("Kupon bulunamadı.");
    return;
  }

  if(bet.status !== "Bekliyor"){
    alert("Bu kupon zaten sonuçlandırılmış.");
    return;
  }

  const users = getUsers();
  const target = users.find(u => String(u.id) === String(bet.userId) || u.username === bet.username);

  if(!target){
    alert("Kullanıcı bulunamadı.");
    return;
  }

  let txAmount = 0;
  let txDirection = "info";
  let txType = "Kupon Sonuçlandı";

  if(result === "won"){
    bet.status = "Kazandı";
    txAmount = Number(bet.possibleWin || 0);
    txDirection = "plus";
    txType = "Kupon Kazancı";
    target.balance = Number(target.balance || 0) + txAmount;
  }

  if(result === "lost"){
    bet.status = "Kaybetti";
    txAmount = 0;
    txDirection = "info";
    txType = "Kupon Kaybetti";
  }

  if(result === "refund"){
    bet.status = "İade";
    txAmount = Number(bet.stake || 0);
    txDirection = "plus";
    txType = "Kupon İadesi";
    target.balance = Number(target.balance || 0) + txAmount;
  }

  bet.settledAt = new Date().toLocaleString("tr-TR");

  setUsers(users);
  setBets(bets);

  addTransaction({
    username: target.username,
    userId: target.id,
    type: txType,
    direction: txDirection,
    amount: txAmount,
    status:"Onaylandı",
    note:`Kupon durumu: ${bet.status}`
  });

  renderBetsAdmin();
}

// renderBetsAdmin override - sonuçlandırmalı
function renderBetsAdminLegacy2(){
  if(user?.role !== "admin"){
    alert("Bu alana sadece admin hesabı erişebilir.");
    loginModal();
    return;
  }

  const bets = getBets();
  const pending = bets.filter(b => b.status === "Bekliyor").length;
  const won = bets.filter(b => b.status === "Kazandı").length;
  const lost = bets.filter(b => b.status === "Kaybetti").length;

  document.getElementById("app").innerHTML = shell(`
    <section class="page-hero mini admin-mini">
      <div>
        <span>KUPON GEÇMİŞİ</span>
        <h1>Oynanan Kuponlar</h1>
        <p>Kuponları görüntüle, kazandı/kaybetti/iade olarak sonuçlandır.</p>
      </div>
      <button class="btn gold" onclick="renderAdminDashboard()">Admin Panele Dön</button>
    </section>

    <section class="payment-summary-grid">
      <div class="admin-stat-card">
        <small>Bekleyen Kupon</small>
        <b>${pending}</b>
      </div>

      <div class="admin-stat-card">
        <small>Kazanan Kupon</small>
        <b>${won}</b>
      </div>

      <div class="admin-stat-card">
        <small>Kaybeden Kupon</small>
        <b>${lost}</b>
      </div>
    </section>

    <section class="card users-admin-card">
      <div class="card-head">
        <h3>Kupon Listesi</h3>
        <span>${bets.length} kupon</span>
      </div>

      ${bets.length ? `
        <div class="admin-bet-list">
          ${bets.map(b => `
            <div class="admin-bet-card">
              <div class="admin-bet-head">
                <div>
                  <b>${b.username}</b>
                  <span>${b.date}</span>
                </div>
                <span class="bet-status bet-status-${String(b.status).toLowerCase().replaceAll("ı","i")}">${b.status}</span>
              </div>

              <div class="bet-selections">
                ${b.selections.map(s => `
                  <div>
                    <span>${s.match}</span>
                    <b>${s.pick} · ${s.odd}</b>
                  </div>
                `).join("")}
              </div>

              <div class="bet-bottom">
                <span>Tutar: <b>${money(b.stake)}</b></span>
                <span>Toplam Oran: <b>${b.totalOdd}</b></span>
                <span>Muhtemel Kazanç: <b>${money(b.possibleWin)}</b></span>
                ${b.settledAt ? `<span>Sonuç: <b>${b.settledAt}</b></span>` : ""}
              </div>

              ${b.status === "Bekliyor" ? `
                <div class="bet-admin-actions">
                  <button class="bet-win-btn" onclick="settleBet('${b.id}', 'won')">Kazandı</button>
                  <button class="bet-lose-btn" onclick="settleBet('${b.id}', 'lost')">Kaybetti</button>
                  <button class="bet-refund-btn" onclick="settleBet('${b.id}', 'refund')">İade</button>
                </div>
              ` : ""}
            </div>
          `).join("")}
        </div>
      ` : `
        <div class="empty-coupon">
          <b>Henüz oynanan kupon yok</b>
          <span>Kullanıcı kupon oynayınca burada görünecek.</span>
        </div>
      `}
    </section>
  `);
}

// BET ADMIN FILTERS
let betStatusFilter = "all";
let betSearchText = "";

function setBetStatusFilter(status){
  betStatusFilter = status;
  renderBetsAdmin();
}

function searchBetsAdmin(){
  betSearchText = (document.getElementById("betSearch")?.value || "").toLowerCase().trim();
  renderBetsAdmin();
}

function clearBetSearch(){
  betSearchText = "";
  renderBetsAdmin();
}

function filteredBetsAdmin(){
  let bets = getBets();

  if(betStatusFilter !== "all"){
    bets = bets.filter(b => b.status === betStatusFilter);
  }

  if(betSearchText){
    bets = bets.filter(b =>
      String(b.username || "").toLowerCase().includes(betSearchText) ||
      String(b.stake || "").includes(betSearchText) ||
      String(b.totalOdd || "").includes(betSearchText) ||
      String(b.possibleWin || "").includes(betSearchText)
    );
  }

  return bets;
}

// renderBetsAdmin override - filtreli
function renderBetsAdmin(){
  if(user?.role !== "admin"){
    alert("Bu alana sadece admin hesabı erişebilir.");
    loginModal();
    return;
  }

  const allBets = getBets();
  const bets = filteredBetsAdmin();

  const pending = allBets.filter(b => b.status === "Bekliyor").length;
  const won = allBets.filter(b => b.status === "Kazandı").length;
  const lost = allBets.filter(b => b.status === "Kaybetti").length;
  const refund = allBets.filter(b => b.status === "İade").length;

  const totalStake = bets.reduce((sum,b)=>sum + Number(b.stake || 0), 0);
  const totalPossibleWin = bets.reduce((sum,b)=>sum + Number(b.possibleWin || 0), 0);

  document.getElementById("app").innerHTML = shell(`
    <section class="page-hero mini admin-mini">
      <div>
        <span>KUPON GEÇMİŞİ</span>
        <h1>Oynanan Kuponlar</h1>
        <p>Kuponları filtrele, kullanıcı ara ve sonuçlandır.</p>
      </div>
      <button class="btn gold" onclick="renderAdminDashboard()">Admin Panele Dön</button>
    </section>

    <section class="bet-summary-grid">
      <div class="admin-stat-card">
        <small>Bekleyen</small>
        <b>${pending}</b>
      </div>

      <div class="admin-stat-card">
        <small>Kazanan</small>
        <b>${won}</b>
      </div>

      <div class="admin-stat-card">
        <small>Kaybeden</small>
        <b>${lost}</b>
      </div>

      <div class="admin-stat-card">
        <small>İade</small>
        <b>${refund}</b>
      </div>
    </section>

    <section class="bet-money-grid">
      <div class="admin-stat-card">
        <small>Gösterilen Kupon Sayısı</small>
        <b>${bets.length}</b>
      </div>

      <div class="admin-stat-card">
        <small>Toplam Oynanan Tutar</small>
        <b>${money(totalStake)}</b>
      </div>

      <div class="admin-stat-card">
        <small>Toplam Muhtemel Kazanç</small>
        <b>${money(totalPossibleWin)}</b>
      </div>
    </section>

    <section class="card users-admin-card">
      <div class="card-head bet-admin-head">
        <div>
          <h3>Kupon Listesi</h3>
          <span>${bets.length} kupon gösteriliyor</span>
        </div>

        <div class="payment-search">
          <input id="betSearch" value="${betSearchText}" placeholder="Kullanıcı / tutar / oran ara">
          <button onclick="searchBetsAdmin()">Ara</button>
          <button onclick="clearBetSearch()">Temizle</button>
        </div>
      </div>

      <div class="payment-filters bet-filters">
        <button class="${betStatusFilter === "all" ? "active" : ""}" onclick="setBetStatusFilter('all')">Tümü</button>
        <button class="${betStatusFilter === "Bekliyor" ? "active" : ""}" onclick="setBetStatusFilter('Bekliyor')">Bekleyen</button>
        <button class="${betStatusFilter === "Kazandı" ? "active" : ""}" onclick="setBetStatusFilter('Kazandı')">Kazandı</button>
        <button class="${betStatusFilter === "Kaybetti" ? "active" : ""}" onclick="setBetStatusFilter('Kaybetti')">Kaybetti</button>
        <button class="${betStatusFilter === "İade" ? "active" : ""}" onclick="setBetStatusFilter('İade')">İade</button>
      </div>

      ${bets.length ? `
        <div class="admin-bet-list">
          ${bets.map(b => `
            <div class="admin-bet-card">
              <div class="admin-bet-head">
                <div>
                  <b>${b.username}</b>
                  <span>${b.date}</span>
                </div>
                <span class="bet-status bet-status-${String(b.status).toLowerCase().replaceAll("ı","i")}">${b.status}</span>
              </div>

              <div class="bet-selections">
                ${b.selections.map(s => `
                  <div>
                    <span>${s.match}</span>
                    <b>${s.pick} · ${s.odd}</b>
                  </div>
                `).join("")}
              </div>

              <div class="bet-bottom">
                <span>Tutar: <b>${money(b.stake)}</b></span>
                <span>Toplam Oran: <b>${b.totalOdd}</b></span>
                <span>Muhtemel Kazanç: <b>${money(b.possibleWin)}</b></span>
                ${b.settledAt ? `<span>Sonuç: <b>${b.settledAt}</b></span>` : ""}
              </div>

              ${b.status === "Bekliyor" ? `
                <div class="bet-admin-actions">
                  <button class="bet-win-btn" onclick="settleBet('${b.id}', 'won')">Kazandı</button>
                  <button class="bet-lose-btn" onclick="settleBet('${b.id}', 'lost')">Kaybetti</button>
                  <button class="bet-refund-btn" onclick="settleBet('${b.id}', 'refund')">İade</button>
                </div>
              ` : ""}
            </div>
          `).join("")}
        </div>
      ` : `
        <div class="empty-coupon">
          <b>Kayıt bulunamadı</b>
          <span>Filtreleri temizleyip tekrar deneyebilirsin.</span>
        </div>
      `}
    </section>
  `);
}

// ADMIN HOME LIVE OVERVIEW
function renderAdminDashboard(){
  if(user?.role !== "admin"){
    alert("Bu alana sadece admin hesabı erişebilir.");
    loginModal();
    return;
  }

  const users = getUsers();
  const reqs = getPaymentRequests();
  const txs = getTransactions();
  const bets = getBets();

  const totalBalance = users.reduce((sum,u)=>sum + Number(u.balance || 0), 0);
  const pendingFinance = reqs.filter(r => r.status === "Bekliyor").length;
  const pendingBets = bets.filter(b => b.status === "Bekliyor").length;

  const lastReqs = reqs.slice(0,5);
  const lastTxs = txs.slice(0,6);
  const lastBets = bets.slice(0,5);

  document.getElementById("app").innerHTML = shell(`
    <section class="page-hero mini admin-mini">
      <div>
        <span>GALAXYBET ADMIN</span>
        <h1>Admin Kontrol Paneli</h1>
        <p>Üyeler, finans talepleri, kuponlar ve son hareketler tek ekranda.</p>
      </div>
    </section>

    <section class="admin-home-grid admin-live-grid">
      <div class="admin-stat-card">
        <small>Toplam Üye</small>
        <b>${users.length}</b>
      </div>

      <div class="admin-stat-card">
        <small>Toplam Kullanıcı Bakiyesi</small>
        <b>${money(totalBalance)}</b>
      </div>

      <div class="admin-stat-card">
        <small>Bekleyen Finans</small>
        <b>${pendingFinance}</b>
      </div>

      <div class="admin-stat-card">
        <small>Bekleyen Kupon</small>
        <b>${pendingBets}</b>
      </div>
    </section>

    <section class="admin-shortcuts admin-shortcuts-live">
      <button onclick="renderMatchAdmin()">
        <b>⚽ Maç Yönetimi</b>
        <span>Maç ekle, sil, düzenle, oran güncelle.</span>
      </button>

      <button onclick="renderUsersAdmin()">
        <b>👤 Üye Yönetimi</b>
        <span>Kayıtlı üyeleri, bakiye ve hesap durumunu yönet.</span>
      </button>

      <button onclick="renderPaymentRequestsAdmin()">
        <b>💳 Finans Talepleri</b>
        <span>Yatırım ve çekim taleplerini onayla/reddet.</span>
        ${pendingFinance ? `<em class="admin-pending-badge">${pendingFinance}</em>` : ""}
      </button>

      <button onclick="renderBetsAdmin()">
        <b>🎫 Kupon Geçmişi</b>
        <span>Oynanan kuponları ve sonuçları yönet.</span>
        ${pendingBets ? `<em class="admin-pending-badge">${pendingBets}</em>` : ""}
      </button>

      <button onclick="renderTransactionsAdmin()">
        <b>📄 İşlem Geçmişi</b>
        <span>Bakiye ve sistem hareketlerini görüntüle.</span>
      </button>

      <button onclick="renderHome()">
        <b>🏠 Siteye Dön</b>
        <span>Ana sayfayı kullanıcı gibi görüntüle.</span>
      </button>
    </section>

    <section class="admin-overview-grid">
      <div class="card admin-overview-card">
        <div class="card-head">
          <h3>Son Finans Talepleri</h3>
          <button class="mini-link-btn" onclick="renderPaymentRequestsAdmin()">Tümünü Gör</button>
        </div>

        ${lastReqs.length ? lastReqs.map(r => `
          <div class="overview-row">
            <div>
              <b>${r.username}</b>
              <span>${r.type} · ${r.date}</span>
            </div>
            <strong class="${r.direction === "plus" ? "tx-plus" : "tx-minus"}">
              ${r.direction === "plus" ? "+" : "-"}${money(r.amount)}
            </strong>
            <em class="request-status status-${r.status.toLowerCase()}">${r.status}</em>
          </div>
        `).join("") : `<div class="empty-profile-tx">Henüz finans talebi yok.</div>`}
      </div>

      <div class="card admin-overview-card">
        <div class="card-head">
          <h3>Son Kuponlar</h3>
          <button class="mini-link-btn" onclick="renderBetsAdmin()">Tümünü Gör</button>
        </div>

        ${lastBets.length ? lastBets.map(b => `
          <div class="overview-row">
            <div>
              <b>${b.username}</b>
              <span>${b.selections.length} maç · Oran ${b.totalOdd}</span>
            </div>
            <strong>${money(b.stake)}</strong>
            <em class="bet-status bet-status-${String(b.status).toLowerCase().replaceAll("ı","i")}">${b.status}</em>
          </div>
        `).join("") : `<div class="empty-profile-tx">Henüz kupon yok.</div>`}
      </div>

      <div class="card admin-overview-card wide-overview">
        <div class="card-head">
          <h3>Son İşlemler</h3>
          <button class="mini-link-btn" onclick="renderTransactionsAdmin()">Tümünü Gör</button>
        </div>

        ${lastTxs.length ? lastTxs.map(t => `
          <div class="overview-row">
            <div>
              <b>${t.username}</b>
              <span>${t.type} · ${t.date}</span>
            </div>
            <strong class="${t.direction === "plus" ? "tx-plus" : t.direction === "minus" ? "tx-minus" : ""}">
              ${t.direction === "plus" ? "+" : t.direction === "minus" ? "-" : ""}${Number(t.amount || 0) ? money(t.amount) : ""}
            </strong>
            <em class="tx-status">${t.status || "Kayıt"}</em>
          </div>
        `).join("") : `<div class="empty-profile-tx">Henüz işlem kaydı yok.</div>`}
      </div>
    </section>
  `);
}

// USER ADMIN SEARCH / FILTERS
let userStatusFilter = "all";
let userSearchText = "";

function setUserStatusFilter(status){
  userStatusFilter = status;
  renderUsersAdmin();
}

function searchUsersAdmin(){
  userSearchText = (document.getElementById("userSearch")?.value || "").toLowerCase().trim();
  renderUsersAdmin();
}

function clearUserSearch(){
  userSearchText = "";
  renderUsersAdmin();
}

function filteredUsersAdmin(){
  let users = getUsers();

  if(userStatusFilter !== "all"){
    users = users.filter(u => (u.status || "active") === userStatusFilter);
  }

  if(userSearchText){
    users = users.filter(u =>
      String(u.username || "").toLowerCase().includes(userSearchText) ||
      String(u.name || "").toLowerCase().includes(userSearchText) ||
      String(u.surname || "").toLowerCase().includes(userSearchText) ||
      String(u.phone || "").toLowerCase().includes(userSearchText) ||
      String(u.email || "").toLowerCase().includes(userSearchText) ||
      String(u.tc || "").toLowerCase().includes(userSearchText)
    );
  }

  return users;
}

// renderUsersAdmin override - arama ve filtreli
function renderUsersAdmin(){
  if(user?.role !== "admin"){
    alert("Bu alana sadece admin hesabı erişebilir.");
    loginModal();
    return;
  }

  const allUsers = getUsers();
  const users = filteredUsersAdmin();

  const activeCount = allUsers.filter(u => (u.status || "active") === "active").length;
  const passiveCount = allUsers.filter(u => (u.status || "active") === "passive").length;
  const totalBalance = users.reduce((sum,u)=>sum + Number(u.balance || 0), 0);

  document.getElementById("app").innerHTML = shell(`
    <section class="page-hero mini admin-mini">
      <div>
        <span>ÜYE YÖNETİMİ</span>
        <h1>Kayıtlı Üyeler</h1>
        <p>Üyeleri ara, filtrele, bakiye yönet ve aktif/pasif durumunu değiştir.</p>
      </div>
      <button class="btn gold" onclick="renderAdminDashboard()">Admin Panele Dön</button>
    </section>

    <section class="user-summary-grid">
      <div class="admin-stat-card">
        <small>Toplam Üye</small>
        <b>${allUsers.length}</b>
      </div>

      <div class="admin-stat-card">
        <small>Aktif Üye</small>
        <b>${activeCount}</b>
      </div>

      <div class="admin-stat-card">
        <small>Pasif Üye</small>
        <b>${passiveCount}</b>
      </div>

      <div class="admin-stat-card">
        <small>Gösterilen Bakiye</small>
        <b>${money(totalBalance)}</b>
      </div>
    </section>

    <section class="card users-admin-card">
      <div class="card-head user-admin-head">
        <div>
          <h3>Üye Listesi</h3>
          <span>${users.length} kayıt gösteriliyor</span>
        </div>

        <div class="payment-search">
          <input id="userSearch" value="${userSearchText}" placeholder="Kullanıcı / ad / TC / telefon ara">
          <button onclick="searchUsersAdmin()">Ara</button>
          <button onclick="clearUserSearch()">Temizle</button>
        </div>
      </div>

      <div class="payment-filters user-filters">
        <button class="${userStatusFilter === "all" ? "active" : ""}" onclick="setUserStatusFilter('all')">Tümü</button>
        <button class="${userStatusFilter === "active" ? "active" : ""}" onclick="setUserStatusFilter('active')">Aktif</button>
        <button class="${userStatusFilter === "passive" ? "active" : ""}" onclick="setUserStatusFilter('passive')">Pasif</button>
      </div>

      ${users.length ? `
        <div class="users-table-wrap">
          <table class="users-table users-table-balance users-status-table">
            <thead>
              <tr>
                <th>Kullanıcı</th>
                <th>Ad Soyad</th>
                <th>Telefon</th>
                <th>E-posta</th>
                <th>TC</th>
                <th>Durum</th>
                <th>Bakiye</th>
                <th>Bakiye İşlemi</th>
                <th>Detay</th>
                <th>Hesap</th>
                <th>Kayıt</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(u=>{
                const status = u.status || "active";
                return `
                  <tr>
                    <td><b>${u.username}</b></td>
                    <td>${u.name} ${u.surname}</td>
                    <td>${u.phone}</td>
                    <td>${u.email}</td>
                    <td>${u.tc}</td>
                    <td>
                      <span class="user-status-pill ${status === "passive" ? "passive" : "active"}">
                        ${status === "passive" ? "Pasif" : "Aktif"}
                      </span>
                    </td>
                    <td><strong>${money(u.balance || 0)}</strong></td>
                    <td>
                      <div class="balance-admin-box">
                        <input id="balance_${u.id}" type="number" placeholder="Tutar">
                        <button class="add-balance-btn" onclick="updateUserBalance('${u.id}', 'add')">Ekle</button>
                        <button class="remove-balance-btn" onclick="updateUserBalance('${u.id}', 'remove')">Düş</button>
                      </div>
                    </td>
                    <td>
                      <button class="detail-user-btn" onclick="renderUserDetailAdmin('${u.id}')">Detay</button>
                    </td>
                    <td>
                      <button class="status-toggle-btn ${status === "passive" ? "make-active" : "make-passive"}" onclick="toggleUserStatus('${u.id}')">
                        ${status === "passive" ? "Aktifleştir" : "Pasife Al"}
                      </button>
                    </td>
                    <td>${u.createdAt || "-"}</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      ` : `
        <div class="empty-coupon">
          <b>Kayıt bulunamadı</b>
          <span>Arama veya filtreyi temizleyip tekrar deneyebilirsin.</span>
        </div>
      `}
    </section>
  `);
}

// ADMIN USER DETAIL PAGE
function renderUserDetailAdminLegacy(userId){
  if(user?.role !== "admin"){
    alert("Bu alana sadece admin hesabı erişebilir.");
    loginModal();
    return;
  }

  const users = getUsers();
  const u = users.find(x => String(x.id) === String(userId));

  if(!u){
    alert("Kullanıcı bulunamadı.");
    return;
  }

  const reqs = getPaymentRequests().filter(r => String(r.userId) === String(u.id) || r.username === u.username).slice(0,6);
  const bets = getBets().filter(b => String(b.userId) === String(u.id) || b.username === u.username).slice(0,5);
  const txs = getTransactions().filter(t => String(t.userId) === String(u.id) || t.username === u.username).slice(0,8);
  const status = u.status || "active";

  document.getElementById("app").innerHTML = shell(`
    <section class="page-hero mini admin-mini">
      <div>
        <span>ÜYE DETAYI</span>
        <h1>${u.name} ${u.surname}</h1>
        <p>${u.username} kullanıcısının hesap, finans, kupon ve işlem detayları.</p>
      </div>
      <button class="btn gold" onclick="renderUsersAdmin()">Üye Listesine Dön</button>
    </section>

    <section class="user-detail-grid">
      <div class="card user-detail-main">
        <div class="user-detail-avatar">
          ${String(u.name || u.username || "?").charAt(0).toUpperCase()}
        </div>

        <h2>${u.name} ${u.surname}</h2>
        <span class="user-status-pill ${status === "passive" ? "passive" : "active"}">
          ${status === "passive" ? "Pasif" : "Aktif"}
        </span>

        <div class="user-detail-balance">
          <small>Mevcut Bakiye</small>
          <b>${money(u.balance || 0)}</b>
        </div>

        <div class="user-detail-actions">
          <button class="status-toggle-btn ${status === "passive" ? "make-active" : "make-passive"}" onclick="toggleUserStatus('${u.id}')">
            ${status === "passive" ? "Aktifleştir" : "Pasife Al"}
          </button>
          <button class="btn primary" onclick="renderUsersAdmin()">Listeye Dön</button>
        </div>
      </div>

      <div class="card user-detail-info">
        <h3>Hesap Bilgileri</h3>

        <div class="detail-info-grid">
          <div><small>Kullanıcı Adı</small><b>${u.username}</b></div>
          <div><small>Ad Soyad</small><b>${u.name} ${u.surname}</b></div>
          <div><small>Telefon</small><b>${u.phone || "-"}</b></div>
          <div><small>E-posta</small><b>${u.email || "-"}</b></div>
          <div><small>TC Kimlik No</small><b>${u.tc || "-"}</b></div>
          <div><small>Doğum Tarihi</small><b>${u.birth || "-"}</b></div>
          <div><small>Kayıt Tarihi</small><b>${u.createdAt || "-"}</b></div>
          <div><small>Rol</small><b>${u.role || "user"}</b></div>
        </div>
      </div>
    </section>

    <section class="user-detail-panels">
      <div class="card user-detail-panel">
        <div class="card-head">
          <h3>Son Finans Talepleri</h3>
          <span>${reqs.length} kayıt</span>
        </div>

        ${reqs.length ? reqs.map(r => `
          <div class="detail-row">
            <div>
              <b>${r.type}</b>
              <span>${r.date}</span>
            </div>
            <strong class="${r.direction === "plus" ? "tx-plus" : "tx-minus"}">
              ${r.direction === "plus" ? "+" : "-"}${money(r.amount)}
            </strong>
            <em class="request-status status-${r.status.toLowerCase()}">${r.status}</em>
          </div>
        `).join("") : `<div class="empty-profile-tx">Finans talebi yok.</div>`}
      </div>

      <div class="card user-detail-panel">
        <div class="card-head">
          <h3>Son Kuponlar</h3>
          <span>${bets.length} kupon</span>
        </div>

        ${bets.length ? bets.map(b => `
          <div class="detail-row">
            <div>
              <b>${b.selections?.length || 0} Maçlık Kupon</b>
              <span>${b.date}</span>
            </div>
            <strong>${money(b.stake)}</strong>
            <em class="bet-status bet-status-${String(b.status).toLowerCase().replaceAll("ı","i")}">${b.status}</em>
          </div>
        `).join("") : `<div class="empty-profile-tx">Kupon geçmişi yok.</div>`}
      </div>

      <div class="card user-detail-panel wide-detail-panel">
        <div class="card-head">
          <h3>Son İşlem Hareketleri</h3>
          <span>${txs.length} işlem</span>
        </div>

        ${txs.length ? txs.map(t => `
          <div class="detail-row">
            <div>
              <b>${t.type}</b>
              <span>${t.date}</span>
            </div>
            <strong class="${t.direction === "plus" ? "tx-plus" : t.direction === "minus" ? "tx-minus" : ""}">
              ${t.direction === "plus" ? "+" : t.direction === "minus" ? "-" : ""}${Number(t.amount || 0) ? money(t.amount) : ""}
            </strong>
            <em class="tx-status">${t.status || "Kayıt"}</em>
          </div>
        `).join("") : `<div class="empty-profile-tx">İşlem hareketi yok.</div>`}
      </div>
    </section>
  `);
}

// USER DETAIL BALANCE ACTIONS
function updateUserBalanceFromDetail(userId, type){
  if(user?.role !== "admin"){
    alert("Bu işlem sadece admin için.");
    return;
  }

  const input = document.getElementById("detailBalanceAmount");
  const amount = Number(input?.value || 0);

  if(!amount || amount <= 0){
    alert("Geçerli tutar gir.");
    return;
  }

  const users = getUsers();
  const target = users.find(u => String(u.id) === String(userId));

  if(!target){
    alert("Kullanıcı bulunamadı.");
    return;
  }

  if(type === "add"){
    target.balance = Number(target.balance || 0) + amount;

    addTransaction({
      username: target.username,
      userId: target.id,
      type: "Yatırım",
      direction: "plus",
      amount,
      status: "Onaylandı",
      note: "Admin detay ekranından bakiye ekledi"
    });
  }

  if(type === "remove"){
    target.balance = Math.max(0, Number(target.balance || 0) - amount);

    addTransaction({
      username: target.username,
      userId: target.id,
      type: "Bakiye Düşüm",
      direction: "minus",
      amount,
      status: "Onaylandı",
      note: "Admin detay ekranından bakiye düşürdü"
    });
  }

  setUsers(users);

  input.value = "";
  alert("Bakiye güncellendi.");
  renderUserDetailAdmin(userId);
}

// renderUserDetailAdmin override - detaydan bakiye işlemli
function renderUserDetailAdmin(userId){
  if(user?.role !== "admin"){
    alert("Bu alana sadece admin hesabı erişebilir.");
    loginModal();
    return;
  }

  const users = getUsers();
  const u = users.find(x => String(x.id) === String(userId));

  if(!u){
    alert("Kullanıcı bulunamadı.");
    return;
  }

  const reqs = getPaymentRequests().filter(r => String(r.userId) === String(u.id) || r.username === u.username).slice(0,6);
  const bets = getBets().filter(b => String(b.userId) === String(u.id) || b.username === u.username).slice(0,5);
  const txs = getTransactions().filter(t => String(t.userId) === String(u.id) || t.username === u.username).slice(0,8);
  const status = u.status || "active";

  document.getElementById("app").innerHTML = shell(`
    <section class="page-hero mini admin-mini">
      <div>
        <span>ÜYE DETAYI</span>
        <h1>${u.name} ${u.surname}</h1>
        <p>${u.username} kullanıcısının hesap, finans, kupon ve işlem detayları.</p>
      </div>
      <button class="btn gold" onclick="renderUsersAdmin()">Üye Listesine Dön</button>
    </section>

    <section class="user-detail-grid">
      <div class="card user-detail-main">
        <div class="user-detail-avatar">
          ${String(u.name || u.username || "?").charAt(0).toUpperCase()}
        </div>

        <h2>${u.name} ${u.surname}</h2>

        <span class="user-status-pill ${status === "passive" ? "passive" : "active"}">
          ${status === "passive" ? "Pasif" : "Aktif"}
        </span>

        <div class="user-detail-balance">
          <small>Mevcut Bakiye</small>
          <b>${money(u.balance || 0)}</b>
        </div>

        <div class="detail-balance-box">
          <input id="detailBalanceAmount" type="number" placeholder="Tutar gir">
          <div>
            <button class="add-balance-btn" onclick="updateUserBalanceFromDetail('${u.id}', 'add')">Bakiye Ekle</button>
            <button class="remove-balance-btn" onclick="updateUserBalanceFromDetail('${u.id}', 'remove')">Bakiye Düş</button>
          </div>
        </div>

        <div class="user-detail-actions">
          <button class="status-toggle-btn ${status === "passive" ? "make-active" : "make-passive"}" onclick="toggleUserStatus('${u.id}')">
            ${status === "passive" ? "Aktifleştir" : "Pasife Al"}
          </button>
          <button class="btn primary" onclick="renderUsersAdmin()">Listeye Dön</button>
        </div>
      </div>

      <div class="card user-detail-info">
        <h3>Hesap Bilgileri</h3>

        <div class="detail-info-grid">
          <div><small>Kullanıcı Adı</small><b>${u.username}</b></div>
          <div><small>Ad Soyad</small><b>${u.name} ${u.surname}</b></div>
          <div><small>Telefon</small><b>${u.phone || "-"}</b></div>
          <div><small>E-posta</small><b>${u.email || "-"}</b></div>
          <div><small>TC Kimlik No</small><b>${u.tc || "-"}</b></div>
          <div><small>Doğum Tarihi</small><b>${u.birth || "-"}</b></div>
          <div><small>Kayıt Tarihi</small><b>${u.createdAt || "-"}</b></div>
          <div><small>Rol</small><b>${u.role || "user"}</b></div>
        </div>
      </div>
    </section>

    <section class="user-detail-panels">
      <div class="card user-detail-panel">
        <div class="card-head">
          <h3>Son Finans Talepleri</h3>
          <span>${reqs.length} kayıt</span>
        </div>

        ${reqs.length ? reqs.map(r => `
          <div class="detail-row">
            <div>
              <b>${r.type}</b>
              <span>${r.date}</span>
            </div>
            <strong class="${r.direction === "plus" ? "tx-plus" : "tx-minus"}">
              ${r.direction === "plus" ? "+" : "-"}${money(r.amount)}
            </strong>
            <em class="request-status status-${r.status.toLowerCase()}">${r.status}</em>
          </div>
        `).join("") : `<div class="empty-profile-tx">Finans talebi yok.</div>`}
      </div>

      <div class="card user-detail-panel">
        <div class="card-head">
          <h3>Son Kuponlar</h3>
          <span>${bets.length} kupon</span>
        </div>

        ${bets.length ? bets.map(b => `
          <div class="detail-row">
            <div>
              <b>${b.selections?.length || 0} Maçlık Kupon</b>
              <span>${b.date}</span>
            </div>
            <strong>${money(b.stake)}</strong>
            <em class="bet-status bet-status-${String(b.status).toLowerCase().replaceAll("ı","i")}">${b.status}</em>
          </div>
        `).join("") : `<div class="empty-profile-tx">Kupon geçmişi yok.</div>`}
      </div>

      <div class="card user-detail-panel wide-detail-panel">
        <div class="card-head">
          <h3>Son İşlem Hareketleri</h3>
          <span>${txs.length} işlem</span>
        </div>

        ${txs.length ? txs.map(t => `
          <div class="detail-row">
            <div>
              <b>${t.type}</b>
              <span>${t.date}</span>
            </div>
            <strong class="${t.direction === "plus" ? "tx-plus" : t.direction === "minus" ? "tx-minus" : ""}">
              ${t.direction === "plus" ? "+" : t.direction === "minus" ? "-" : ""}${Number(t.amount || 0) ? money(t.amount) : ""}
            </strong>
            <em class="tx-status">${t.status || "Kayıt"}</em>
          </div>
        `).join("") : `<div class="empty-profile-tx">İşlem hareketi yok.</div>`}
      </div>
    </section>
  `);
}

// SITE ANNOUNCEMENT SYSTEM
function getSiteAnnouncement(){
  return JSON.parse(localStorage.getItem("bozobet_announcement") || "null") || {
    active:true,
    title:"Hoş geldin bonusu aktif!",
    text:"Yeni üyelere özel  bonus fırsatları aktif edildi.",
    button:"Promosyonları Gör"
  };
}

function setSiteAnnouncement(data){
  localStorage.setItem("bozobet_announcement", JSON.stringify(data));
}

function announcementHtml(){
  const a = getSiteAnnouncement();

  if(!a.active) return "";

  return `
    <section class="site-announcement">
      <div class="ann-left">
        <span>📢 DUYURU</span>
        <b>${a.title}</b>
        <small>${a.text}</small>
      </div>
      <button onclick="renderPromotions()">${a.button || "Detayları Gör"}</button>
    </section>
  `;
}

function renderAnnouncementAdmin(){
  if(user?.role !== "admin"){
    alert("Bu alana sadece admin hesabı erişebilir.");
    loginModal();
    return;
  }

  const a = getSiteAnnouncement();

  document.getElementById("app").innerHTML = shell(`
    <section class="page-hero mini admin-mini">
      <div>
        <span>SİTE AYARLARI</span>
        <h1>Duyuru Yönetimi</h1>
        <p>Ana sayfada görünecek duyuru bandını buradan düzenleyebilirsin.</p>
      </div>
      <button class="btn gold" onclick="renderAdminDashboard()">Admin Panele Dön</button>
    </section>

    <section class="announcement-admin-grid">
      <div class="card announcement-form-card">
        <h3>Duyuru Bilgileri</h3>

        <label class="field">
          <span>Duyuru Başlığı</span>
          <input id="annTitle" value="${a.title || ""}">
        </label>

        <label class="field">
          <span>Duyuru Metni</span>
          <input id="annText" value="${a.text || ""}">
        </label>

        <label class="field">
          <span>Buton Yazısı</span>
          <input id="annButton" value="${a.button || ""}">
        </label>

        <label class="ann-check">
          <input id="annActive" type="checkbox" ${a.active ? "checked" : ""}>
          <span>Duyuru aktif olsun</span>
        </label>

        <button class="btn primary full-btn" onclick="saveAnnouncementFromAdmin()">Duyuruyu Kaydet</button>
      </div>

      <div class="card announcement-preview-card">
        <h3>Önizleme</h3>
        ${announcementHtml() || `<div class="empty-profile-tx">Duyuru şu an pasif.</div>`}
      </div>
    </section>
  `);
}

function saveAnnouncementFromAdmin(){
  const data = {
    active:document.getElementById("annActive").checked,
    title:document.getElementById("annTitle").value || "",
    text:document.getElementById("annText").value || "",
    button:document.getElementById("annButton").value || "Detayları Gör"
  };

  setSiteAnnouncement(data);
  alert("Duyuru kaydedildi.");
  renderAnnouncementAdmin();
}

// Admin ana panele duyuru yönetimi kısa yolu ekle
const oldRenderAdminDashboardAnnouncement = renderAdminDashboard;
renderAdminDashboard = function(){
  oldRenderAdminDashboardAnnouncement();

  setTimeout(() => {
    const shortcuts = document.querySelector(".admin-shortcuts");
    if(shortcuts && !document.querySelector(".announcement-shortcut")){
      shortcuts.insertAdjacentHTML("beforeend", `
        <button class="announcement-shortcut" onclick="renderAnnouncementAdmin()">
          <b>📢 Duyuru Yönetimi</b>
          <span>Ana sayfa duyuru bandını düzenle.</span>
        </button>
      `);
    }
  }, 80);
};

// MAINTENANCE MODE SYSTEM
function getMaintenanceMode(){
  return JSON.parse(localStorage.getItem("bozobet_maintenance") || "null") || {
    active:false,
    title:"Kısa süreli bakımdayız",
    text:"Sistemde iyileştirme çalışması yapılıyor. Lütfen daha sonra tekrar dene."
  };
}

function setMaintenanceMode(data){
  localStorage.setItem("bozobet_maintenance", JSON.stringify(data));
}

function maintenanceScreen(){
  const m = getMaintenanceMode();

  document.getElementById("app").innerHTML = `
    <main class="maintenance-screen">
      <div class="maintenance-card">
        <div class="maintenance-logo">GALAXYBET</div>
        <span>BAKIM MODU</span>
        <h1>${m.title}</h1>
        <p>${m.text}</p>

        <button onclick="loginModal()">Admin Girişi</button>
      </div>
    </main>
  `;
}

function shouldShowMaintenance(){
  const m = getMaintenanceMode();
  return m.active && user?.role !== "admin";
}

function checkMaintenanceAfterRender(){
  setTimeout(() => {
    if(shouldShowMaintenance()){
      maintenanceScreen();
    }
  }, 40);
}

window.addEventListener("load", checkMaintenanceAfterRender);

// Ana render fonksiyonlarını bakım kontrolüne bağla
["renderHome","renderSports","renderCasino","renderPromotions","renderVip","renderSupport","renderProfile"].forEach(fnName => {
  const oldFn = window[fnName];
  if(typeof oldFn === "function"){
    window[fnName] = function(...args){
      if(shouldShowMaintenance()){
        maintenanceScreen();
        return;
      }

      const result = oldFn.apply(this,args);
      checkMaintenanceAfterRender();
      return result;
    };
  }
});

function renderMaintenanceAdmin(){
  if(user?.role !== "admin"){
    alert("Bu alana sadece admin hesabı erişebilir.");
    loginModal();
    return;
  }

  const m = getMaintenanceMode();

  document.getElementById("app").innerHTML = shell(`
    <section class="page-hero mini admin-mini">
      <div>
        <span>SİTE AYARLARI</span>
        <h1>Bakım Modu</h1>
        <p>Siteyi kullanıcılar için geçici olarak kapatıp sadece admin erişimine bırakabilirsin.</p>
      </div>
      <button class="btn gold" onclick="renderAdminDashboard()">Admin Panele Dön</button>
    </section>

    <section class="maintenance-admin-grid">
      <div class="card maintenance-form-card">
        <h3>Bakım Ayarları</h3>

        <label class="ann-check maintenance-check">
          <input id="maintenanceActive" type="checkbox" ${m.active ? "checked" : ""}>
          <span>Bakım modu aktif olsun</span>
        </label>

        <label class="field">
          <span>Başlık</span>
          <input id="maintenanceTitle" value="${m.title || ""}">
        </label>

        <label class="field">
          <span>Açıklama</span>
          <input id="maintenanceText" value="${m.text || ""}">
        </label>

        <button class="btn primary full-btn" onclick="saveMaintenanceFromAdmin()">Bakım Ayarını Kaydet</button>
      </div>

      <div class="card maintenance-preview-card">
        <h3>Önizleme</h3>

        <div class="maintenance-preview-mini">
          <span>BAKIM MODU</span>
          <b>${m.title}</b>
          <small>${m.text}</small>
        </div>
      </div>
    </section>
  `);
}

function saveMaintenanceFromAdmin(){
  const data = {
    active:document.getElementById("maintenanceActive").checked,
    title:document.getElementById("maintenanceTitle").value || "Kısa süreli bakımdayız",
    text:document.getElementById("maintenanceText").value || "Sistemde iyileştirme çalışması yapılıyor."
  };

  setMaintenanceMode(data);
  alert("Bakım modu ayarları kaydedildi.");
  renderMaintenanceAdmin();
}

// Admin ana panele bakım modu kısa yolu ekle
const oldRenderAdminDashboardMaintenance = renderAdminDashboard;
renderAdminDashboard = function(){
  oldRenderAdminDashboardMaintenance();

  setTimeout(() => {
    const shortcuts = document.querySelector(".admin-shortcuts");

    if(shortcuts && !document.querySelector(".maintenance-shortcut")){
      shortcuts.insertAdjacentHTML("beforeend", `
        <button class="maintenance-shortcut" onclick="renderMaintenanceAdmin()">
          <b>🛠️ Bakım Modu</b>
          <span>Siteyi kullanıcılar için geçici olarak kapat.</span>
        </button>
      `);
    }
  }, 80);
};

// SUPPORT TICKET SYSTEM
function getSupportTickets(){
  return JSON.parse(localStorage.getItem("bozobet_support_tickets") || "[]");
}

function setSupportTickets(items){
  localStorage.setItem("bozobet_support_tickets", JSON.stringify(items));
}

function createSupportTicket(){
  if(!user){
    loginModal();
    return;
  }

  const subject = document.getElementById("supportSubject")?.value || "";
  const message = document.getElementById("supportMessage")?.value || "";

  if(!subject || !message){
    alert("Konu ve mesaj alanlarını doldur.");
    return;
  }

  const tickets = getSupportTickets();

  tickets.unshift({
    id:Date.now(),
    username:user.username,
    userId:user.id || user.username,
    subject,
    message,
    reply:"",
    status:"Açık",
    createdAt:new Date().toLocaleString("tr-TR"),
    repliedAt:""
  });

  setSupportTickets(tickets);
  alert("Destek talebin oluşturuldu.");
  renderSupport();
}

function userTicketsHtml(){
  if(!user) return "";

  const tickets = getSupportTickets()
    .filter(t => t.username === user.username)
    .slice(0,10);

  return `
    <div class="support-ticket-list">
      <h3>Destek Taleplerim</h3>

      ${tickets.length ? tickets.map(t => `
        <div class="support-ticket-card">
          <div class="support-ticket-head">
            <div>
              <b>${t.subject}</b>
              <span>${t.createdAt}</span>
            </div>
            <em class="ticket-status ${t.status === "Kapalı" ? "closed" : "open"}">${t.status}</em>
          </div>

          <p>${t.message}</p>

          ${t.reply ? `
            <div class="ticket-reply">
              <b>Admin Cevabı</b>
              <span>${t.reply}</span>
              <small>${t.repliedAt}</small>
            </div>
          ` : `<small class="ticket-wait">Henüz cevap verilmedi.</small>`}
        </div>
      `).join("") : `
        <div class="empty-profile-tx">Henüz destek talebin yok.</div>
      `}
    </div>
  `;
}

// renderSupport override
function renderSupport(){
  document.getElementById("app").innerHTML = shell(`
    <section class="page-hero mini">
      <div>
        <span>7/24 DESTEK</span>
        <h1>Destek Merkezi</h1>
        <p>Hesap, yatırım, çekim veya kupon konularında destek talebi oluşturabilirsin.</p>
      </div>
    </section>

    <section class="support-layout">
      <div class="card support-form-card">
        <h3>Yeni Destek Talebi</h3>

        ${user ? `
          <label class="field">
            <span>Konu</span>
            <input id="supportSubject" placeholder="Örn: Yatırım talebim">
          </label>

          <label class="field">
            <span>Mesaj</span>
            <textarea id="supportMessage" placeholder="Sorununu detaylı yaz"></textarea>
          </label>

          <button class="btn primary full-btn" onclick="createSupportTicket()">Talep Oluştur</button>
        ` : `
          <div class="empty-profile-tx">Destek talebi oluşturmak için giriş yapmalısın.</div>
          <button class="btn primary full-btn" onclick="loginModal()">Giriş Yap</button>
        `}
      </div>

      <div class="card support-info-card">
        <h3>Destek Bilgileri</h3>
        <div class="support-info-grid">
          <div><b>⚡ Ortalama Yanıt</b><span> panelde admin cevabı beklenir.</span></div>
          <div><b>💳 Finans</b><span>Yatırım ve çekim talepleri admin panelinden kontrol edilir.</span></div>
          <div><b>🎫 Kupon</b><span>Kupon sonuçları admin tarafından sonuçlandırılır.</span></div>
        </div>
      </div>
    </section>

    ${user ? userTicketsHtml() : ""}
  `);
}

function replySupportTicket(ticketId){
  if(user?.role !== "admin"){
    alert("Bu işlem sadece admin için.");
    return;
  }

  const input = document.getElementById("ticketReply_" + ticketId);
  const reply = input?.value || "";

  if(!reply){
    alert("Cevap yazmalısın.");
    return;
  }

  const tickets = getSupportTickets();
  const t = tickets.find(x => String(x.id) === String(ticketId));

  if(!t){
    alert("Talep bulunamadı.");
    return;
  }

  t.reply = reply;
  t.status = "Kapalı";
  t.repliedAt = new Date().toLocaleString("tr-TR");

  setSupportTickets(tickets);
  alert("Destek talebi cevaplandı.");
  renderSupportTicketsAdmin();
}

function renderSupportTicketsAdminLegacy1(){
  if(user?.role !== "admin"){
    alert("Bu alana sadece admin hesabı erişebilir.");
    loginModal();
    return;
  }

  const tickets = getSupportTickets();
  const open = tickets.filter(t => t.status === "Açık").length;
  const closed = tickets.filter(t => t.status === "Kapalı").length;

  document.getElementById("app").innerHTML = shell(`
    <section class="page-hero mini admin-mini">
      <div>
        <span>DESTEK YÖNETİMİ</span>
        <h1>Destek Talepleri</h1>
        <p>Kullanıcıların açtığı destek taleplerini görüntüle ve cevapla.</p>
      </div>
      <button class="btn gold" onclick="renderAdminDashboard()">Admin Panele Dön</button>
    </section>

    <section class="payment-summary-grid">
      <div class="admin-stat-card">
        <small>Toplam Talep</small>
        <b>${tickets.length}</b>
      </div>
      <div class="admin-stat-card">
        <small>Açık Talep</small>
        <b>${open}</b>
      </div>
      <div class="admin-stat-card">
        <small>Kapalı Talep</small>
        <b>${closed}</b>
      </div>
    </section>

    <section class="admin-ticket-list">
      ${tickets.length ? tickets.map(t => `
        <div class="card admin-ticket-card">
          <div class="support-ticket-head">
            <div>
              <b>${t.subject}</b>
              <span>${t.username} · ${t.createdAt}</span>
            </div>
            <em class="ticket-status ${t.status === "Kapalı" ? "closed" : "open"}">${t.status}</em>
          </div>

          <p>${t.message}</p>

          ${t.reply ? `
            <div class="ticket-reply">
              <b>Verilen Cevap</b>
              <span>${t.reply}</span>
              <small>${t.repliedAt}</small>
            </div>
          ` : `
            <label class="field">
              <span>Admin Cevabı</span>
              <textarea id="ticketReply_${t.id}" placeholder="Cevabını yaz"></textarea>
            </label>
            <button class="btn primary" onclick="replySupportTicket('${t.id}')">Cevapla ve Kapat</button>
          `}
        </div>
      `).join("") : `
        <div class="card empty-coupon">
          <b>Henüz destek talebi yok</b>
          <span>Kullanıcı destek talebi oluşturunca burada görünür.</span>
        </div>
      `}
    </section>
  `);
}

// Admin ana panele destek kısa yolu ekle
const oldRenderAdminDashboardSupportTickets = renderAdminDashboard;
renderAdminDashboard = function(){
  oldRenderAdminDashboardSupportTickets();

  setTimeout(() => {
    const shortcuts = document.querySelector(".admin-shortcuts");
    const openCount = getSupportTickets().filter(t => t.status === "Açık").length;

    if(shortcuts && !document.querySelector(".support-ticket-shortcut")){
      shortcuts.insertAdjacentHTML("beforeend", `
        <button class="support-ticket-shortcut" onclick="renderSupportTicketsAdmin()">
          <b>🎧 Destek Talepleri</b>
          <span>Kullanıcı destek mesajlarını cevapla.</span>
          ${openCount ? `<em class="admin-pending-badge">${openCount}</em>` : ""}
        </button>
      `);
    }
  }, 80);
};

// SUPPORT ADMIN FILTERS
let supportStatusFilter = "all";
let supportSearchText = "";

function setSupportStatusFilter(status){
  supportStatusFilter = status;
  renderSupportTicketsAdmin();
}

function searchSupportTicketsAdmin(){
  supportSearchText = (document.getElementById("supportSearch")?.value || "").toLowerCase().trim();
  renderSupportTicketsAdmin();
}

function clearSupportSearch(){
  supportSearchText = "";
  renderSupportTicketsAdmin();
}

function filteredSupportTickets(){
  let tickets = getSupportTickets();

  if(supportStatusFilter !== "all"){
    tickets = tickets.filter(t => t.status === supportStatusFilter);
  }

  if(supportSearchText){
    tickets = tickets.filter(t =>
      String(t.username || "").toLowerCase().includes(supportSearchText) ||
      String(t.subject || "").toLowerCase().includes(supportSearchText) ||
      String(t.message || "").toLowerCase().includes(supportSearchText) ||
      String(t.reply || "").toLowerCase().includes(supportSearchText)
    );
  }

  return tickets;
}

// renderSupportTicketsAdmin override - filtreli
function renderSupportTicketsAdminLegacy2(){
  if(user?.role !== "admin"){
    alert("Bu alana sadece admin hesabı erişebilir.");
    loginModal();
    return;
  }

  const allTickets = getSupportTickets();
  const tickets = filteredSupportTickets();

  const open = allTickets.filter(t => t.status === "Açık").length;
  const closed = allTickets.filter(t => t.status === "Kapalı").length;

  document.getElementById("app").innerHTML = shell(`
    <section class="page-hero mini admin-mini">
      <div>
        <span>DESTEK YÖNETİMİ</span>
        <h1>Destek Talepleri</h1>
        <p>Destek taleplerini ara, filtrele ve cevapla.</p>
      </div>
      <button class="btn gold" onclick="renderAdminDashboard()">Admin Panele Dön</button>
    </section>

    <section class="payment-summary-grid">
      <div class="admin-stat-card">
        <small>Toplam Talep</small>
        <b>${allTickets.length}</b>
      </div>

      <div class="admin-stat-card">
        <small>Açık Talep</small>
        <b>${open}</b>
      </div>

      <div class="admin-stat-card">
        <small>Kapalı Talep</small>
        <b>${closed}</b>
      </div>
    </section>

    <section class="card support-admin-filter-card">
      <div class="card-head support-admin-head">
        <div>
          <h3>Destek Talep Listesi</h3>
          <span>${tickets.length} kayıt gösteriliyor</span>
        </div>

        <div class="payment-search">
          <input id="supportSearch" value="${supportSearchText}" placeholder="Kullanıcı / konu / mesaj ara">
          <button onclick="searchSupportTicketsAdmin()">Ara</button>
          <button onclick="clearSupportSearch()">Temizle</button>
        </div>
      </div>

      <div class="payment-filters support-filters">
        <button class="${supportStatusFilter === "all" ? "active" : ""}" onclick="setSupportStatusFilter('all')">Tümü</button>
        <button class="${supportStatusFilter === "Açık" ? "active" : ""}" onclick="setSupportStatusFilter('Açık')">Açık</button>
        <button class="${supportStatusFilter === "Kapalı" ? "active" : ""}" onclick="setSupportStatusFilter('Kapalı')">Kapalı</button>
      </div>
    </section>

    <section class="admin-ticket-list">
      ${tickets.length ? tickets.map(t => `
        <div class="card admin-ticket-card ${t.status === "Açık" ? "ticket-open-card" : "ticket-closed-card"}">
          <div class="support-ticket-head">
            <div>
              <b>${t.subject}</b>
              <span>${t.username} · ${t.createdAt}</span>
            </div>
            <em class="ticket-status ${t.status === "Kapalı" ? "closed" : "open"}">${t.status}</em>
          </div>

          <p>${t.message}</p>

          ${t.reply ? `
            <div class="ticket-reply">
              <b>Verilen Cevap</b>
              <span>${t.reply}</span>
              <small>${t.repliedAt}</small>
            </div>
          ` : `
            <label class="field">
              <span>Admin Cevabı</span>
              <textarea id="ticketReply_${t.id}" placeholder="Cevabını yaz"></textarea>
            </label>
            <button class="btn primary" onclick="replySupportTicket('${t.id}')">Cevapla ve Kapat</button>
          `}
        </div>
      `).join("") : `
        <div class="card empty-coupon">
          <b>Kayıt bulunamadı</b>
          <span>Arama veya filtreyi temizleyip tekrar deneyebilirsin.</span>
        </div>
      `}
    </section>
  `);
}

// SUPPORT TICKET EXTRA ACTIONS
function reopenSupportTicket(ticketId){
  if(user?.role !== "admin"){
    alert("Bu işlem sadece admin için.");
    return;
  }

  const tickets = getSupportTickets();
  const t = tickets.find(x => String(x.id) === String(ticketId));

  if(!t){
    alert("Talep bulunamadı.");
    return;
  }

  t.status = "Açık";
  t.repliedAt = "";
  setSupportTickets(tickets);

  alert("Destek talebi tekrar açıldı.");
  renderSupportTicketsAdmin();
}

function deleteSupportTicket(ticketId){
  if(user?.role !== "admin"){
    alert("Bu işlem sadece admin için.");
    return;
  }

  const tickets = getSupportTickets();
  const next = tickets.filter(x => String(x.id) !== String(ticketId));

  setSupportTickets(next);

  alert("Destek talebi silindi.");
  renderSupportTicketsAdmin();
}

// renderSupportTicketsAdmin override - tekrar aç / sil butonlu
function renderSupportTicketsAdmin(){
  if(user?.role !== "admin"){
    alert("Bu alana sadece admin hesabı erişebilir.");
    loginModal();
    return;
  }

  const allTickets = getSupportTickets();
  const tickets = typeof filteredSupportTickets === "function" ? filteredSupportTickets() : allTickets;

  const open = allTickets.filter(t => t.status === "Açık").length;
  const closed = allTickets.filter(t => t.status === "Kapalı").length;

  document.getElementById("app").innerHTML = shell(`
    <section class="page-hero mini admin-mini">
      <div>
        <span>DESTEK YÖNETİMİ</span>
        <h1>Destek Talepleri</h1>
        <p>Destek taleplerini ara, filtrele, cevapla, tekrar aç veya sil.</p>
      </div>
      <button class="btn gold" onclick="renderAdminDashboard()">Admin Panele Dön</button>
    </section>

    <section class="payment-summary-grid">
      <div class="admin-stat-card">
        <small>Toplam Talep</small>
        <b>${allTickets.length}</b>
      </div>

      <div class="admin-stat-card">
        <small>Açık Talep</small>
        <b>${open}</b>
      </div>

      <div class="admin-stat-card">
        <small>Kapalı Talep</small>
        <b>${closed}</b>
      </div>
    </section>

    <section class="card support-admin-filter-card">
      <div class="card-head support-admin-head">
        <div>
          <h3>Destek Talep Listesi</h3>
          <span>${tickets.length} kayıt gösteriliyor</span>
        </div>

        <div class="payment-search">
          <input id="supportSearch" value="${typeof supportSearchText !== "undefined" ? supportSearchText : ""}" placeholder="Kullanıcı / konu / mesaj ara">
          <button onclick="searchSupportTicketsAdmin()">Ara</button>
          <button onclick="clearSupportSearch()">Temizle</button>
        </div>
      </div>

      <div class="payment-filters support-filters">
        <button class="${supportStatusFilter === "all" ? "active" : ""}" onclick="setSupportStatusFilter('all')">Tümü</button>
        <button class="${supportStatusFilter === "Açık" ? "active" : ""}" onclick="setSupportStatusFilter('Açık')">Açık</button>
        <button class="${supportStatusFilter === "Kapalı" ? "active" : ""}" onclick="setSupportStatusFilter('Kapalı')">Kapalı</button>
      </div>
    </section>

    <section class="admin-ticket-list">
      ${tickets.length ? tickets.map(t => `
        <div class="card admin-ticket-card ${t.status === "Açık" ? "ticket-open-card" : "ticket-closed-card"}">
          <div class="support-ticket-head">
            <div>
              <b>${t.subject}</b>
              <span>${t.username} · ${t.createdAt}</span>
            </div>
            <em class="ticket-status ${t.status === "Kapalı" ? "closed" : "open"}">${t.status}</em>
          </div>

          <p>${t.message}</p>

          ${t.reply ? `
            <div class="ticket-reply">
              <b>Verilen Cevap</b>
              <span>${t.reply}</span>
              <small>${t.repliedAt}</small>
            </div>
          ` : `
            <label class="field">
              <span>Admin Cevabı</span>
              <textarea id="ticketReply_${t.id}" placeholder="Cevabını yaz"></textarea>
            </label>
          `}

          <div class="ticket-admin-actions">
            ${t.status === "Açık" ? `
              <button class="ticket-answer-btn" onclick="replySupportTicket('${t.id}')">Cevapla ve Kapat</button>
            ` : `
              <button class="ticket-reopen-btn" onclick="reopenSupportTicket('${t.id}')">Tekrar Aç</button>
            `}
            <button class="ticket-delete-btn" onclick="deleteSupportTicket('${t.id}')">Sil</button>
          </div>
        </div>
      `).join("") : `
        <div class="card empty-coupon">
          <b>Kayıt bulunamadı</b>
          <span>Arama veya filtreyi temizleyip tekrar deneyebilirsin.</span>
        </div>
      `}
    </section>
  `);
}

// USER NOTIFICATION SYSTEM
function getNotifications(){
  return JSON.parse(localStorage.getItem("bozobet_notifications") || "[]");
}

function setNotifications(items){
  localStorage.setItem("bozobet_notifications", JSON.stringify(items));
}

function addNotification(item){
  const list = getNotifications();

  list.unshift({
    id:Date.now() + Math.floor(Math.random() * 999),
    date:new Date().toLocaleString("tr-TR"),
    read:false,
    ...item
  });

  setNotifications(list);
}

function userNotificationsHtml(){
  if(!user) return "";

  const list = getNotifications()
    .filter(n => n.username === user.username)
    .slice(0,10);

  return `
    <div class="profile-notification-box">
      <div class="profile-box-head">
        <h3>Bildirimlerim</h3>
        ${list.some(n => !n.read) ? `<button onclick="markMyNotificationsRead()">Okundu Yap</button>` : ""}
      </div>

      ${list.length ? list.map(n => `
        <div class="notification-item ${n.read ? "read" : "unread"}">
          <div class="notification-icon">${n.icon || "🔔"}</div>
          <div>
            <b>${n.title}</b>
            <span>${n.text}</span>
            <small>${n.date}</small>
          </div>
        </div>
      `).join("") : `
        <div class="empty-profile-tx">Henüz bildirimin yok.</div>
      `}
    </div>
  `;
}

function markMyNotificationsRead(){
  if(!user) return;

  const list = getNotifications().map(n => {
    if(n.username === user.username){
      return {...n, read:true};
    }
    return n;
  });

  setNotifications(list);
  renderProfile();
}

// Profil içine bildirim alanı ekle
const oldRenderProfileNotifications = renderProfile;
renderProfile = function(){
  oldRenderProfileNotifications();

  setTimeout(() => {
    const profileCard = document.querySelector(".profile-card") || document.querySelector(".card");

    if(profileCard && !document.querySelector(".profile-notification-box")){
      profileCard.insertAdjacentHTML("beforeend", userNotificationsHtml());
    }
  }, 130);
};

// Finans onay/red bildirimleri
const oldApprovePaymentRequestNotify = approvePaymentRequest;
approvePaymentRequest = function(id){
  const req = getPaymentRequests().find(r => String(r.id) === String(id));

  oldApprovePaymentRequestNotify(id);

  if(req){
    addNotification({
      username:req.username,
      icon:req.type === "Yatırım" ? "💳" : "🏦",
      title:`${req.type} talebin onaylandı`,
      text:`${money(req.amount)} tutarındaki ${req.type.toLowerCase()} talebin onaylandı.`
    });
  }
};

const oldRejectPaymentRequestNotify = rejectPaymentRequest;
rejectPaymentRequest = function(id){
  const req = getPaymentRequests().find(r => String(r.id) === String(id));

  oldRejectPaymentRequestNotify(id);

  if(req){
    addNotification({
      username:req.username,
      icon:"❌",
      title:`${req.type} talebin reddedildi`,
      text:`${money(req.amount)} tutarındaki ${req.type.toLowerCase()} talebin reddedildi.`
    });
  }
};

// Kupon sonuç bildirimleri
const oldSettleBetNotify = settleBet;
settleBet = function(betId, result){
  const bet = getBets().find(b => String(b.id) === String(betId));

  oldSettleBetNotify(betId, result);

  if(bet){
    let title = "Kuponun sonuçlandı";
    let text = "Kuponun sonuçlandırıldı.";
    let icon = "🎫";

    if(result === "won"){
      title = "Kuponun kazandı";
      text = `${money(bet.possibleWin)} kazanç bakiyene eklendi.`;
      icon = "🏆";
    }

    if(result === "lost"){
      title = "Kuponun kaybetti";
      text = `${money(bet.stake)} tutarındaki kuponun kaybetti.`;
      icon = "📉";
    }

    if(result === "refund"){
      title = "Kuponun iade edildi";
      text = `${money(bet.stake)} kupon tutarı bakiyene iade edildi.`;
      icon = "↩️";
    }

    addNotification({
      username:bet.username,
      icon,
      title,
      text
    });
  }
};

// Destek cevap bildirimi
const oldReplySupportTicketNotify = replySupportTicket;
replySupportTicket = function(ticketId){
  const ticket = getSupportTickets().find(t => String(t.id) === String(ticketId));

  oldReplySupportTicketNotify(ticketId);

  if(ticket){
    addNotification({
      username:ticket.username,
      icon:"🎧",
      title:"Destek talebine cevap geldi",
      text:`${ticket.subject} konulu talebine admin cevap verdi.`
    });
  }
};

// HEADER NOTIFICATION BELL
function myNotifications(){
  if(!user) return [];
  return getNotifications().filter(n => n.username === user.username);
}

function unreadNotificationCount(){
  return myNotifications().filter(n => !n.read).length;
}

function notificationBellHtml(){
  if(!user || user.role === "admin") return "";

  const count = unreadNotificationCount();

  return `
    <button class="notification-bell" onclick="toggleNotificationPanel(event)">
      🔔
      ${count ? `<em>${count}</em>` : ""}
    </button>
  `;
}

function toggleNotificationPanel(e){
  e?.stopPropagation();

  const old = document.querySelector(".notification-dropdown");
  if(old){
    old.remove();
    return;
  }

  const list = myNotifications().slice(0,6);

  const box = document.createElement("div");
  box.className = "notification-dropdown";

  box.innerHTML = `
    <div class="notification-drop-head">
      <b>Bildirimler</b>
      ${list.some(n => !n.read) ? `<button onclick="markMyNotificationsRead()">Okundu Yap</button>` : ""}
    </div>

    <div class="notification-drop-list">
      ${list.length ? list.map(n => `
        <div class="notification-drop-item ${n.read ? "read" : "unread"}">
          <span>${n.icon || "🔔"}</span>
          <div>
            <b>${n.title}</b>
            <small>${n.text}</small>
            <em>${n.date}</em>
          </div>
        </div>
      `).join("") : `
        <div class="notification-drop-empty">Henüz bildirimin yok.</div>
      `}
    </div>

    <button class="notification-profile-btn" onclick="document.querySelector('.notification-dropdown')?.remove(); typeof renderNotificationCenter === 'function' ? renderNotificationCenter() : renderProfile();">
      Tüm Bildirimleri Gör
    </button>
  `;

  document.body.appendChild(box);

  const bell = document.querySelector(".notification-bell");
  const rect = bell?.getBoundingClientRect();

  if(rect){
    box.style.top = `${rect.bottom + 12}px`;
    box.style.right = `${Math.max(16, window.innerWidth - rect.right)}px`;
  }
}

document.addEventListener("click", (e) => {
  if(!e.target.closest(".notification-dropdown") && !e.target.closest(".notification-bell")){
    document.querySelector(".notification-dropdown")?.remove();
  }
});

// INTEGRATED WITHDRAW PAGE
var siteWithdrawMethod = "Banka Havalesi";

function setSiteWithdrawMethod(method){
  siteWithdrawMethod = method;

  document.querySelectorAll(".withdraw-method-card").forEach(card => {
    card.classList.toggle("active", card.dataset.method === method);
  });

  const text = document.getElementById("selectedWithdrawMethodText");
  if(text) text.textContent = method;
}

function renderWithdrawSitePage(){
  if(!user){
    loginModal();
    return;
  }

  const l = typeof getPaymentLimits === "function" ? getPaymentLimits() : {
    minWithdraw:100,
    maxWithdraw:25000
  };

  document.getElementById("app").innerHTML = shell(`
    <section class="page-hero mini">
      <div>
        <span>FİNANS İŞLEMLERİ</span>
        <h1>Para Çek</h1>
        <p>Çekim yöntemini seç, IBAN bilgini gir ve admin onaylı çekim talebini oluştur.</p>
      </div>
    </section>

    <section class="deposit-page-grid">
      <div class="card deposit-methods-card">
        <div class="card-head">
          <h3>Çekim Yöntemi Seç</h3>
          <span>Limit dışı talepler oluşturulamaz</span>
        </div>

        <div class="deposit-method-grid">
          <button class="deposit-method-card withdraw-method-card active" data-method="Banka Havalesi" onclick="setSiteWithdrawMethod('Banka Havalesi')">
            <div class="method-icon">🏦</div>
            <b>Banka Havalesi</b>
            <span>IBAN ile çekim</span>
          </button>

          <button class="deposit-method-card withdraw-method-card" data-method="Papara" onclick="setSiteWithdrawMethod('Papara')">
            <div class="method-icon">🟣</div>
            <b>Papara</b>
            <span>Çekim</span>
          </button>
        </div>
      </div>

      <div class="card deposit-form-card">
        <h3>Çekim Talebi</h3>

        <div class="deposit-selected-method">
          <small>Seçili Yöntem</small>
          <b id="selectedWithdrawMethodText">${siteWithdrawMethod}</b>
        </div>

        <label class="field">
          <span>Çekim Tutarı</span>
          <input id="siteWithdrawAmount" type="number" placeholder="${l.minWithdraw} - ${l.maxWithdraw}">
        </label>

        <label class="field">
          <span>IBAN / Hesap Bilgisi</span>
          <input id="siteWithdrawIban" placeholder="TR00 0000 0000 0000 0000 0000 00">
        </label>

        <div class="deposit-limit-box">
          <div>
            <small>Minimum Çekim</small>
            <b>${money(l.minWithdraw)}</b>
          </div>

          <div>
            <small>Maksimum Çekim</small>
            <b>${money(l.maxWithdraw)}</b>
          </div>
        </div>

        <div class="deposit--warning">
          <b>Mevcut Bakiye</b>
          <span>${money(user.balance || 0)} bakiyen var. Bakiye ve limit dışı çekim talebi oluşturulamaz.</span>
        </div>

        <button class="btn primary full-btn" onclick="submitSiteWithdrawRequest()">Çekim Talebi Oluştur</button>
      </div>
    </section>
  `);
}

function submitSiteWithdrawRequest(){
  if(!user){
    loginModal();
    return;
  }

  const amount = Number(document.getElementById("siteWithdrawAmount")?.value || 0);
  const iban = document.getElementById("siteWithdrawIban")?.value.trim() || "";
  const l = typeof getPaymentLimits === "function" ? getPaymentLimits() : {
    minWithdraw:100,
    maxWithdraw:25000
  };

  if(!amount || amount <= 0){
    alert("Geçerli çekim tutarı gir.");
    return;
  }

  if(amount < l.minWithdraw || amount > l.maxWithdraw){
    alert(`Çekim tutarı ${money(l.minWithdraw)} ile ${money(l.maxWithdraw)} arasında olmalı.`);
    return;
  }

  if(Number(user.balance || 0) < amount){
    alert("Yetersiz bakiye.");
    return;
  }

  if(!iban || iban.length < 10){
    alert("IBAN veya hesap bilgisini gir.");
    return;
  }

  addPaymentRequest({
    username:user.username,
    userId:user.id || user.username,
    type:"Çekim",
    direction:"minus",
    amount,
    iban,
    method:siteWithdrawMethod,
    note:`Kullanıcı ${siteWithdrawMethod} yöntemiyle çekim talebi oluşturdu`
  });

  alert("Çekim talebin oluşturuldu. Admin onayından sonra işlenecek.");
  renderProfile();
}

withdrawModal = renderWithdrawSitePage;

function forceWithdrawButtonFix(){
  document.querySelectorAll("button, a").forEach(el => {
    const text = (el.innerText || "").trim().toLowerCase();

    if(text.includes("para çek")){
      el.onclick = function(e){
        if(e){
          e.preventDefault();
          e.stopPropagation();
        }
        renderWithdrawSitePage();
        return false;
      };
    }
  });
}

window.addEventListener("load", forceWithdrawButtonFix);
document.addEventListener("DOMContentLoaded", forceWithdrawButtonFix);
setInterval(forceWithdrawButtonFix, 700);

// IBAN AUTO FORMAT - TR PREFIX
function formatTurkishIban(value){
  let raw = String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  // Başında TR yoksa ekle
  if(raw.startsWith("TR")){
    raw = raw.slice(2);
  }

  // Sadece TR sonrası 24 karakter kalsın
  raw = raw.replace(/[^0-9]/g, "").slice(0, 24);

  const full = "TR" + raw;

  // TR00 0000 0000 0000 0000 0000 00
  return full.replace(/(.{4})/g, "$1 ").trim();
}

function cleanTurkishIban(value){
  return formatTurkishIban(value).replace(/\s+/g, "");
}

function bindIbanFormatter(){
  setTimeout(() => {
    const input = document.getElementById("siteWithdrawIban");
    if(!input || input.dataset.ibanBound === "1") return;

    input.dataset.ibanBound = "1";
    input.placeholder = "TR00 0000 0000 0000 0000 0000 00";
    input.value = input.value || "TR";

    input.addEventListener("focus", () => {
      if(!input.value.trim()) input.value = "TR";
    });

    input.addEventListener("input", () => {
      const oldLength = input.value.length;
      input.value = formatTurkishIban(input.value);

      // İmleci sona al, formatlı IBAN için daha stabil
      try{
        input.setSelectionRange(input.value.length, input.value.length);
      }catch(e){}
    });

    input.addEventListener("blur", () => {
      if(input.value.trim() === "TR") input.value = "TR";
    });
  }, 80);
}

const oldRenderWithdrawSitePageIbanFormat = renderWithdrawSitePage;
renderWithdrawSitePage = function(){
  oldRenderWithdrawSitePageIbanFormat();
  bindIbanFormatter();
};

const oldSubmitSiteWithdrawRequestIbanFormat = submitSiteWithdrawRequest;
submitSiteWithdrawRequest = function(){
  const input = document.getElementById("siteWithdrawIban");

  if(input){
    input.value = formatTurkishIban(input.value);

    const clean = cleanTurkishIban(input.value);

    if(!/^TR\d{24}$/.test(clean)){
      alert("IBAN TR ile başlamalı ve toplam 26 karakter olmalı.");
      return;
    }
  }

  oldSubmitSiteWithdrawRequestIbanFormat();
};

// WITHDRAW REQUEST - INSTANT BALANCE DEDUCT + REFUND ON REJECT
function syncCurrentUserBalance(newBalance){
  if(!user) return;

  user.balance = Number(newBalance || 0);
  saveUser();

  const users = getUsers();
  const target = users.find(u => String(u.id) === String(user.id) || u.username === user.username);

  if(target){
    target.balance = user.balance;
    setUsers(users);
  }
}

// Çekim talebi oluşunca bakiye anında düşsün
submitSiteWithdrawRequest = function(){
  if(!user){
    loginModal();
    return;
  }

  const amount = Number(document.getElementById("siteWithdrawAmount")?.value || 0);
  const iban = document.getElementById("siteWithdrawIban")?.value.trim() || "";
  const l = typeof getPaymentLimits === "function" ? getPaymentLimits() : {
    minWithdraw:100,
    maxWithdraw:25000
  };

  if(!amount || amount <= 0){
    alert("Geçerli çekim tutarı gir.");
    return;
  }

  if(amount < l.minWithdraw || amount > l.maxWithdraw){
    alert(`Çekim tutarı ${money(l.minWithdraw)} ile ${money(l.maxWithdraw)} arasında olmalı.`);
    return;
  }

  if(Number(user.balance || 0) < amount){
    alert("Yetersiz bakiye.");
    return;
  }

  if(!iban || iban.length < 10){
    alert("IBAN veya hesap bilgisini gir.");
    return;
  }

  // Talep oluşturulduğu anda bakiye düş
  syncCurrentUserBalance(Number(user.balance || 0) - amount);

  addPaymentRequest({
    username:user.username,
    userId:user.id || user.username,
    type:"Çekim",
    direction:"minus",
    amount,
    iban,
    method:siteWithdrawMethod || "Banka Havalesi",
    status:"Bekliyor",
    balanceDeducted:true,
    note:`Kullanıcı ${siteWithdrawMethod || "Banka Havalesi"} yöntemiyle çekim talebi oluşturdu. Bakiye talep anında düşüldü.`
  });

  addTransaction({
    username:user.username,
    userId:user.id || user.username,
    type:"Çekim Talebi",
    direction:"minus",
    amount,
    status:"Bekliyor",
    note:"Çekim talebi oluşturulduğu için bakiye anında düşüldü"
  });

  alert("Çekim talebin oluşturuldu. Tutar bakiyenden düşüldü, admin onayı bekleniyor.");
  renderProfile();
};

// Admin çekimi onaylarsa tekrar bakiye düşmesin
approvePaymentRequest = function(id){
  if(user?.role !== "admin"){
    alert("Bu işlem sadece admin için.");
    return;
  }

  const reqs = getPaymentRequests();
  const req = reqs.find(r => String(r.id) === String(id));

  if(!req || req.status !== "Bekliyor"){
    alert("Talep bulunamadı veya zaten işlenmiş.");
    return;
  }

  const users = getUsers();
  const target = users.find(u => String(u.id) === String(req.userId) || u.username === req.username);

  if(!target){
    alert("Kullanıcı bulunamadı.");
    return;
  }

  if(req.type === "Yatırım"){
    target.balance = Number(target.balance || 0) + Number(req.amount || 0);
  }

  if(req.type === "Çekim"){
    // Yeni sistemde çekim talep anında düşer.
    // Eski taleplerde balanceDeducted yoksa geriye uyum için onayda düş.
    if(!req.balanceDeducted){
      if(Number(target.balance || 0) < Number(req.amount || 0)){
        alert("Kullanıcı bakiyesi çekim için yetersiz.");
        return;
      }

      target.balance = Number(target.balance || 0) - Number(req.amount || 0);
    }
  }

  req.status = "Onaylandı";
  req.processedAt = new Date().toLocaleString("tr-TR");

  setUsers(users);
  setPaymentRequests(reqs);

  addTransaction({
    username: target.username,
    userId: target.id,
    type: req.type,
    direction: req.type === "Yatırım" ? "plus" : "minus",
    amount: req.amount,
    status:"Onaylandı",
    note:req.type === "Çekim"
      ? "Admin çekim talebini onayladı. Bakiye talep anında düşülmüştü."
      : "Admin yatırım talebini onayladı"
  });

  addNotification({
    username:req.username,
    icon:req.type === "Yatırım" ? "💳" : "🏦",
    title:`${req.type} talebin onaylandı`,
    text:`${money(req.amount)} tutarındaki ${req.type.toLowerCase()} talebin onaylandı.`
  });

  renderPaymentRequestsAdmin();
};

// Admin çekimi reddederse düşülen bakiye geri iade edilsin
rejectPaymentRequest = function(id){
  if(user?.role !== "admin"){
    alert("Bu işlem sadece admin için.");
    return;
  }

  const reqs = getPaymentRequests();
  const req = reqs.find(r => String(r.id) === String(id));

  if(!req || req.status !== "Bekliyor"){
    alert("Talep bulunamadı veya zaten işlenmiş.");
    return;
  }

  const users = getUsers();
  const target = users.find(u => String(u.id) === String(req.userId) || u.username === req.username);

  if(req.type === "Çekim" && req.balanceDeducted && target){
    target.balance = Number(target.balance || 0) + Number(req.amount || 0);

    addTransaction({
      username: target.username,
      userId: target.id,
      type:"Çekim İadesi",
      direction:"plus",
      amount:req.amount,
      status:"Onaylandı",
      note:"Çekim talebi reddedildiği için bakiye iade edildi"
    });
  }

  req.status = "Reddedildi";
  req.processedAt = new Date().toLocaleString("tr-TR");

  setUsers(users);
  setPaymentRequests(reqs);

  addNotification({
    username:req.username,
    icon:"❌",
    title:`${req.type} talebin reddedildi`,
    text:req.type === "Çekim"
      ? `${money(req.amount)} tutarındaki çekim talebin reddedildi ve tutar bakiyene iade edildi.`
      : `${money(req.amount)} tutarındaki yatırım talebin reddedildi.`
  });

  renderPaymentRequestsAdmin();
};

// DEPOSIT METHOD ADMIN SETTINGS
function getDepositMethods(){
  return JSON.parse(localStorage.getItem("bozobet_deposit_methods") || "null") || [
    {id:"bank", name:"Havale / EFT", icon:"🏦", desc:"Banka transferi", active:true},
    {id:"papara", name:"Papara", icon:"🟣", desc:"Hızlı yatırım", active:true},
    {id:"usdt", name:"USDT TRC20", icon:"₮", desc:"Kripto ", active:true},
    {id:"qr", name:"QR Ödeme", icon:"▦", desc:"Kolay ödeme", active:true}
  ];
}

function setDepositMethods(items){
  localStorage.setItem("bozobet_deposit_methods", JSON.stringify(items));
}

function toggleDepositMethod(id){
  if(user?.role !== "admin"){
    alert("Bu işlem sadece admin için.");
    return;
  }

  const items = getDepositMethods();
  const item = items.find(x => x.id === id);

  if(!item){
    alert("Yöntem bulunamadı.");
    return;
  }

  item.active = !item.active;
  setDepositMethods(items);

  alert("Yöntem durumu güncellendi.");
  renderDepositMethodsAdmin();
}

function renderDepositMethodsAdmin(){
  if(user?.role !== "admin"){
    alert("Bu alana sadece admin hesabı erişebilir.");
    loginModal();
    return;
  }

  const methods = getDepositMethods();

  document.getElementById("app").innerHTML = shell(`
    <section class="page-hero mini admin-mini">
      <div>
        <span>FİNANS AYARLARI</span>
        <h1>Yatırım Yöntemleri</h1>
        <p>Kullanıcı para yatır sayfasında görünecek yöntemleri buradan aktif/pasif yapabilirsin.</p>
      </div>
      <button class="btn gold" onclick="renderAdminDashboard()">Admin Panele Dön</button>
    </section>

    <section class="card deposit-method-admin-card">
      <div class="card-head">
        <h3>Yöntem Listesi</h3>
        <span>${methods.filter(x=>x.active).length} aktif yöntem</span>
      </div>

      <div class="deposit-method-admin-list">
        ${methods.map(m => `
          <div class="deposit-method-admin-row ${m.active ? "active" : "passive"}">
            <div class="method-icon">${m.icon}</div>

            <div>
              <b>${m.name}</b>
              <span>${m.desc}</span>
            </div>

            <em>${m.active ? "Aktif" : "Pasif"}</em>

            <button onclick="toggleDepositMethod('${m.id}')">
              ${m.active ? "Pasife Al" : "Aktifleştir"}
            </button>
          </div>
        `).join("")}
      </div>
    </section>
  `);
}

// Admin ana panele yöntem yönetimi kısa yolu ekle
const oldRenderAdminDashboardDepositMethods = renderAdminDashboard;
renderAdminDashboard = function(){
  oldRenderAdminDashboardDepositMethods();

  setTimeout(() => {
    const shortcuts = document.querySelector(".admin-shortcuts");

    if(shortcuts && !document.querySelector(".deposit-methods-shortcut")){
      shortcuts.insertAdjacentHTML("beforeend", `
        <button class="deposit-methods-shortcut" onclick="renderDepositMethodsAdmin()">
          <b>🏦 Yatırım Yöntemleri</b>
          <span>Para yatır sayfasındaki yöntemleri yönet.</span>
        </button>
      `);
    }
  }, 80);
};

var siteDepositMethod = "Havale / EFT";

function setSiteDepositMethod(method){
  siteDepositMethod = method;
  window.siteDepositMethod = method;
  document.querySelectorAll(".deposit-method-card").forEach(card => {
    card.classList.toggle("active", card.dataset.method === method);
  });
  const selected = document.getElementById("selectedDepositMethodText");
  if(selected) selected.textContent = method;
}

// Canonical deposit renderer; premium module yüklüyse premium ekranı kullanır.
function renderDepositSitePage(){
  if(typeof window.renderPremiumDepositSitePage === "function"){
    window.renderPremiumDepositSitePage();
    return;
  }

  if(!user){
    loginModal();
    return;
  }

  const l = typeof getPaymentLimits === "function" ? getPaymentLimits() : {
    minDeposit:100,
    maxDeposit:50000
  };

  const methods = getDepositMethods().filter(x => x.active);

  if(!methods.length){
    alert("Şu anda aktif yatırım yöntemi yok.");
    return;
  }

  if(!methods.some(m => m.name === window.siteDepositMethod)){
    window.siteDepositMethod = methods[0].name;
  }

  document.getElementById("app").innerHTML = shell(`
    <section class="page-hero mini">
      <div>
        <span>FİNANS İŞLEMLERİ</span>
        <h1>Para Yatır</h1>
        <p>Yatırım yöntemini seç, tutarı gir ve admin onaylı yatırım talebini oluştur.</p>
      </div>
    </section>

    <section class="deposit-page-grid">
      <div class="card deposit-methods-card">
        <div class="card-head">
          <h3>Yatırım Yöntemi Seç</h3>
          <span>Limit dışı talepler oluşturulamaz</span>
        </div>

        <div class="deposit-method-grid">
          ${methods.map((m,i)=>`
            <button class="deposit-method-card ${m.name === window.siteDepositMethod ? "active" : ""}" data-method="${m.name}" onclick="setSiteDepositMethod('${m.name}')">
              <div class="method-icon">${m.icon}</div>
              <b>${m.name}</b>
              <span>${m.desc}</span>
            </button>
          `).join("")}
        </div>
      </div>

      <div class="card deposit-form-card">
        <h3>Yatırım Talebi</h3>

        <div class="deposit-selected-method">
          <small>Seçili Yöntem</small>
          <b id="selectedDepositMethodText">${window.siteDepositMethod}</b>
        </div>

        <label class="field">
          <span>Yatırım Tutarı</span>
          <input id="siteDepositAmount" type="text" inputmode="decimal" autocomplete="off" placeholder="${l.minDeposit} - ${l.maxDeposit}">
        </label>

        <div class="deposit-limit-box">
          <div>
            <small>Minimum Yatırım</small>
            <b>${money(l.minDeposit)}</b>
          </div>

          <div>
            <small>Maksimum Yatırım</small>
            <b>${money(l.maxDeposit)}</b>
          </div>
        </div>

        <div class="deposit--warning">
          <b>Limit dışı talep oluşturulamaz</b>
          <span>Yatırım tutarı ${money(l.minDeposit)} ile ${money(l.maxDeposit)} arasında olmalı.</span>
        </div>

        <button class="btn primary full-btn" onclick="submitDepositShowAccountStep()">Yatırım Talebi Oluştur</button>
      </div>
    </section>
  `);

}

// WITHDRAW METHOD ADMIN SETTINGS
function getWithdrawMethods(){
  return JSON.parse(localStorage.getItem("bozobet_withdraw_methods") || "null") || [
    {id:"bank", name:"Banka Havalesi", icon:"🏦", desc:"IBAN ile çekim", active:true},
    {id:"papara", name:"Papara", icon:"🟣", desc:"Papara hesap bilgisiyle çekim", active:true}
  ];
}

function setWithdrawMethods(items){
  localStorage.setItem("bozobet_withdraw_methods", JSON.stringify(items));
}

function toggleWithdrawMethod(id){
  if(user?.role !== "admin"){
    alert("Bu işlem sadece admin için.");
    return;
  }

  const items = getWithdrawMethods();
  const item = items.find(x => x.id === id);

  if(!item){
    alert("Yöntem bulunamadı.");
    return;
  }

  item.active = !item.active;
  setWithdrawMethods(items);

  alert("Çekim yöntemi güncellendi.");
  renderWithdrawMethodsAdmin();
}

function renderWithdrawMethodsAdmin(){
  if(user?.role !== "admin"){
    alert("Bu alana sadece admin hesabı erişebilir.");
    loginModal();
    return;
  }

  const methods = getWithdrawMethods();

  document.getElementById("app").innerHTML = shell(`
    <section class="page-hero mini admin-mini">
      <div>
        <span>FİNANS AYARLARI</span>
        <h1>Çekim Yöntemleri</h1>
        <p>Kullanıcı para çek sayfasında görünecek yöntemleri buradan aktif/pasif yapabilirsin.</p>
      </div>
      <button class="btn gold" onclick="renderAdminDashboard()">Admin Panele Dön</button>
    </section>

    <section class="card deposit-method-admin-card">
      <div class="card-head">
        <h3>Çekim Yöntemleri</h3>
        <span>${methods.filter(x=>x.active).length} aktif yöntem</span>
      </div>

      <div class="deposit-method-admin-list">
        ${methods.map(m => `
          <div class="deposit-method-admin-row ${m.active ? "active" : "passive"}">
            <div class="method-icon">${m.icon}</div>

            <div>
              <b>${m.name}</b>
              <span>${m.desc}</span>
            </div>

            <em>${m.active ? "Aktif" : "Pasif"}</em>

            <button onclick="toggleWithdrawMethod('${m.id}')">
              ${m.active ? "Pasife Al" : "Aktifleştir"}
            </button>
          </div>
        `).join("")}
      </div>
    </section>
  `);
}

// Admin ana panele çekim yöntemleri kısa yolu ekle
const oldRenderAdminDashboardWithdrawMethods = renderAdminDashboard;
renderAdminDashboard = function(){
  oldRenderAdminDashboardWithdrawMethods();

  setTimeout(() => {
    const shortcuts = document.querySelector(".admin-shortcuts");

    if(shortcuts && !document.querySelector(".withdraw-methods-shortcut")){
      shortcuts.insertAdjacentHTML("beforeend", `
        <button class="withdraw-methods-shortcut" onclick="renderWithdrawMethodsAdmin()">
          <b>🏧 Çekim Yöntemleri</b>
          <span>Para çek sayfasındaki yöntemleri yönet.</span>
        </button>
      `);
    }
  }, 80);
};

// Para çek sayfasını aktif yöntemlere göre yeniden çiz
renderWithdrawSitePage = function(){
  if(!user){
    loginModal();
    return;
  }

  const l = typeof getPaymentLimits === "function" ? getPaymentLimits() : {
    minWithdraw:100,
    maxWithdraw:25000
  };

  const methods = getWithdrawMethods().filter(x => x.active);

  if(!methods.length){
    alert("Şu anda aktif çekim yöntemi yok.");
    return;
  }

  if(!methods.some(m => m.name === window.siteWithdrawMethod)){
    window.siteWithdrawMethod = methods[0].name;
  }

  document.getElementById("app").innerHTML = shell(`
    <section class="page-hero mini">
      <div>
        <span>FİNANS İŞLEMLERİ</span>
        <h1>Para Çek</h1>
        <p>Çekim yöntemini seç, tutarı gir ve admin onaylı çekim talebini oluştur.</p>
      </div>
    </section>

    <section class="deposit-page-grid">
      <div class="card deposit-methods-card">
        <div class="card-head">
          <h3>Çekim Yöntemi Seç</h3>
          <span>Limit dışı talepler oluşturulamaz</span>
        </div>

        <div class="deposit-method-grid">
          ${methods.map((m,i)=>`
            <button class="deposit-method-card withdraw-method-card ${i === 0 ? "active" : ""}" data-method="${m.name}" onclick="setSiteWithdrawMethod('${m.name}')">
              <div class="method-icon">${m.icon}</div>
              <b>${m.name}</b>
              <span>${m.desc}</span>
            </button>
          `).join("")}
        </div>
      </div>

      <div class="card deposit-form-card">
        <h3>Çekim Talebi</h3>

        <div class="deposit-selected-method">
          <small>Seçili Yöntem</small>
          <b id="selectedWithdrawMethodText">${methods[0].name}</b>
        </div>

        <label class="field">
          <span>Çekim Tutarı</span>
          <input id="siteWithdrawAmount" type="number" placeholder="${l.minWithdraw} - ${l.maxWithdraw}">
        </label>

        <label class="field">
          <span>IBAN / Hesap Bilgisi</span>
          <input id="siteWithdrawIban" placeholder="TR00 0000 0000 0000 0000 0000 00" value="TR">
        </label>

        <div class="deposit-limit-box">
          <div>
            <small>Minimum Çekim</small>
            <b>${money(l.minWithdraw)}</b>
          </div>

          <div>
            <small>Maksimum Çekim</small>
            <b>${money(l.maxWithdraw)}</b>
          </div>
        </div>

        <div class="deposit--warning">
          <b>Mevcut Bakiye</b>
          <span>${money(user.balance || 0)} bakiyen var. Bakiye ve limit dışı çekim talebi oluşturulamaz.</span>
        </div>

        <button class="btn primary full-btn" onclick="submitSiteWithdrawRequest()">Çekim Talebi Oluştur</button>
      </div>
    </section>
  `);

  window.siteWithdrawMethod = methods[0].name;

  if(typeof bindIbanFormatter === "function"){
    bindIbanFormatter();
  }
};

withdrawModal = renderWithdrawSitePage;

// FINANCE REQUESTS POLISH + IBAN COPY
function copyText(value){
  const text = String(value || "").trim();

  if(!text || text === "-"){
    alert("Kopyalanacak bilgi yok.");
    return;
  }

  if(navigator.clipboard){
    navigator.clipboard.writeText(text).then(() => {
      alert("Kopyalandı.");
    }).catch(() => {
      fallbackCopyText(text);
    });
  }else{
    fallbackCopyText(text);
  }
}

function fallbackCopyText(text){
  const input = document.createElement("textarea");
  input.value = text;
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  input.remove();
  alert("Kopyalandı.");
}

function financeStatusRank(status){
  if(status === "Bekliyor") return 0;
  if(status === "Onaylandı") return 1;
  if(status === "Reddedildi") return 2;
  return 3;
}

// Finans talepleri ekranı override - kopyala ve sıralama
function renderPaymentRequestsAdmin(){
  if(user?.role !== "admin"){
    alert("Bu alana sadece admin hesabı erişebilir.");
    loginModal();
    return;
  }

  const allReqs = getPaymentRequests();

  let reqs = typeof filteredPaymentRequests === "function"
    ? filteredPaymentRequests()
    : allReqs;

  reqs = [...reqs].sort((a,b) => {
    const sr = financeStatusRank(a.status) - financeStatusRank(b.status);
    if(sr !== 0) return sr;
    return Number(b.id || 0) - Number(a.id || 0);
  });

  const pendingDeposit = allReqs.filter(r => r.status === "Bekliyor" && r.type === "Yatırım").length;
  const pendingWithdraw = allReqs.filter(r => r.status === "Bekliyor" && r.type === "Çekim").length;
  const pendingTotal = pendingDeposit + pendingWithdraw;

  document.getElementById("app").innerHTML = shell(`
    <section class="page-hero mini admin-mini">
      <div>
        <span>FİNANS TALEPLERİ</span>
        <h1>Yatırım / Çekim Talepleri</h1>
        <p>Bekleyen talepler en üstte görünür. IBAN ve hesap bilgilerini tek tıkla kopyalayabilirsin.</p>
      </div>
      <button class="btn gold" onclick="renderAdminDashboard()">Admin Panele Dön</button>
    </section>

    <section class="payment-summary-grid">
      <div class="admin-stat-card">
        <small>Bekleyen Toplam</small>
        <b>${pendingTotal}</b>
      </div>

      <div class="admin-stat-card">
        <small>Bekleyen Yatırım</small>
        <b>${pendingDeposit}</b>
      </div>

      <div class="admin-stat-card">
        <small>Bekleyen Çekim</small>
        <b>${pendingWithdraw}</b>
      </div>
    </section>

    <section class="card users-admin-card">
      <div class="card-head payment-head">
        <div>
          <h3>Finans Talep Listesi</h3>
          <span>${reqs.length} kayıt gösteriliyor</span>
        </div>

        <div class="payment-search">
          <input id="paymentSearch" value="${typeof paymentReqSearch !== "undefined" ? paymentReqSearch : ""}" placeholder="Kullanıcı / tutar / IBAN ara">
          <button onclick="searchPaymentRequests()">Ara</button>
          <button onclick="clearPaymentSearch()">Temizle</button>
        </div>
      </div>

      <div class="payment-filters">
        <button class="${paymentReqFilter === "all" ? "active" : ""}" onclick="setPaymentReqFilter('all')">Tümü</button>
        <button class="${paymentReqFilter === "Bekliyor" ? "active" : ""}" onclick="setPaymentReqFilter('Bekliyor')">Bekleyen</button>
        <button class="${paymentReqFilter === "Onaylandı" ? "active" : ""}" onclick="setPaymentReqFilter('Onaylandı')">Onaylanan</button>
        <button class="${paymentReqFilter === "Reddedildi" ? "active" : ""}" onclick="setPaymentReqFilter('Reddedildi')">Reddedilen</button>

        <span></span>

        <button class="${paymentReqTypeFilter === "all" ? "active" : ""}" onclick="setPaymentReqTypeFilter('all')">Tüm Türler</button>
        <button class="${paymentReqTypeFilter === "Yatırım" ? "active" : ""}" onclick="setPaymentReqTypeFilter('Yatırım')">Yatırım</button>
        <button class="${paymentReqTypeFilter === "Çekim" ? "active" : ""}" onclick="setPaymentReqTypeFilter('Çekim')">Çekim</button>
      </div>

      ${reqs.length ? `
        <div class="finance-request-card-list">
          ${reqs.map(r=>`
            <div class="finance-request-card ${r.status === "Bekliyor" ? "pending" : ""}">
              <div class="finance-request-top">
                <div>
                  <b>${r.username}</b>
                  <span>${r.date}</span>
                </div>

                <span class="request-status status-${r.status.toLowerCase()}">${r.status}</span>
              </div>

              <div class="finance-request-body">
                <div>
                  <small>İşlem Türü</small>
                  <b>${r.type}</b>
                </div>

                <div>
                  <small>Tutar</small>
                  <b class="${r.direction === "plus" ? "tx-plus" : "tx-minus"}">
                    ${r.direction === "plus" ? "+" : "-"}${money(r.amount)}
                  </b>
                </div>

                <div>
                  <small>Yöntem</small>
                  <b>${r.method || "-"}</b>
                </div>

                <div>
                  <small>IBAN / Hesap</small>
                  <b class="iban-cell">${r.iban || "-"}</b>
                  ${r.iban ? `<button class="copy-mini-btn" onclick="copyText('${r.iban}')">Kopyala</button>` : ""}
                </div>
              </div>

              ${r.note ? `
                <div class="finance-note">
                  <small>Not</small>
                  <span>${r.note}</span>
                </div>
              ` : ""}

              <div class="finance-request-actions">
                ${r.status === "Bekliyor" ? `
                  <button class="approve-btn" onclick="approvePaymentRequest('${r.id}')">Onayla</button>
                  <button class="reject-btn" onclick="rejectPaymentRequest('${r.id}')">Reddet</button>
                ` : `
                  <span class="processed-date">İşlenme: ${r.processedAt || "-"}</span>
                `}
              </div>
            </div>
          `).join("")}
        </div>
      ` : `
        <div class="empty-coupon">
          <b>Kayıt bulunamadı</b>
          <span>Filtreleri temizleyip tekrar deneyebilirsin.</span>
        </div>
      `}
    </section>
  `);
}

// FINANCE CARD USER DETAIL BUTTON FIX
function findUserByRequest(req){
  const users = getUsers();
  return users.find(u => String(u.id) === String(req.userId) || u.username === req.username);
}

// Finans taleplerindeki kullanıcı adlarına detay butonu ekle
const oldRenderPaymentRequestsAdminUserDetail = renderPaymentRequestsAdmin;

renderPaymentRequestsAdmin = function(){
  oldRenderPaymentRequestsAdminUserDetail();

  setTimeout(() => {
    const reqs = getPaymentRequests();

    document.querySelectorAll(".finance-request-card").forEach(card => {
      const usernameEl = card.querySelector(".finance-request-top b");
      if(!usernameEl || card.querySelector(".finance-user-detail-btn")) return;

      const username = usernameEl.textContent.trim();
      const req = reqs.find(r => r.username === username);
      const target = req ? findUserByRequest(req) : null;

      if(target){
        usernameEl.insertAdjacentHTML("afterend", `
          <button class="finance-user-detail-btn" onclick="renderUserDetailAdmin('${target.id}')">
            Üye Detayı
          </button>
        `);
      }
    });
  }, 120);
};

// FINANCE REJECT REASON SYSTEM
function rejectPaymentRequestWithReason(id){
  if(user?.role !== "admin"){
    alert("Bu işlem sadece admin için.");
    return;
  }

  const reasonInput = document.getElementById("rejectReason_" + id);
  const reason = reasonInput?.value?.trim() || "";

  if(!reason){
    alert("Reddetme sebebi yazmalısın.");
    return;
  }

  const reqs = getPaymentRequests();
  const req = reqs.find(r => String(r.id) === String(id));

  if(!req || req.status !== "Bekliyor"){
    alert("Talep bulunamadı veya zaten işlenmiş.");
    return;
  }

  const users = getUsers();
  const target = users.find(u => String(u.id) === String(req.userId) || u.username === req.username);

  // Çekim talebi daha önce bakiyeden düşüldüyse, redde iade et
  if(req.type === "Çekim" && req.balanceDeducted && target){
    target.balance = Number(target.balance || 0) + Number(req.amount || 0);

    addTransaction({
      username: target.username,
      userId: target.id,
      type:"Çekim İadesi",
      direction:"plus",
      amount:req.amount,
      status:"Onaylandı",
      note:"Çekim talebi reddedildiği için bakiye iade edildi"
    });
  }

  req.status = "Reddedildi";
  req.rejectReason = reason;
  req.processedAt = new Date().toLocaleString("tr-TR");

  setUsers(users);
  setPaymentRequests(reqs);

  addNotification({
    username:req.username,
    icon:"❌",
    title:`${req.type} talebin reddedildi`,
    text:req.type === "Çekim"
      ? `${money(req.amount)} tutarındaki çekim talebin reddedildi. Sebep: ${reason}. Tutar bakiyene iade edildi.`
      : `${money(req.amount)} tutarındaki yatırım talebin reddedildi. Sebep: ${reason}.`
  });

  alert("Talep reddedildi.");
  renderPaymentRequestsAdmin();
}

// Finans talep kartlarına red sebebi alanı enjekte et
const oldRenderPaymentRequestsAdminRejectReason = renderPaymentRequestsAdmin;

renderPaymentRequestsAdmin = function(){
  oldRenderPaymentRequestsAdminRejectReason();

  setTimeout(() => {
    const reqs = getPaymentRequests();

    document.querySelectorAll(".finance-request-card").forEach(card => {
      const username = card.querySelector(".finance-request-top b")?.textContent?.trim();
      const status = card.querySelector(".request-status")?.textContent?.trim();

      if(!username || status !== "Bekliyor") return;
      if(card.querySelector(".reject-reason-box")) return;

      const req = reqs.find(r => r.username === username && r.status === "Bekliyor");
      if(!req) return;

      const actions = card.querySelector(".finance-request-actions");
      if(!actions) return;

      actions.insertAdjacentHTML("beforebegin", `
        <div class="reject-reason-box">
          <label>
            <span>Red Sebebi</span>
            <input id="rejectReason_${req.id}" placeholder="Örn: Eksik açıklama / hatalı IBAN">
          </label>
        </div>
      `);

      const rejectBtn = actions.querySelector(".reject-btn");
      if(rejectBtn){
        rejectBtn.setAttribute("onclick", `rejectPaymentRequestWithReason('${req.id}')`);
      }
    });

    // Reddedilmiş taleplerde sebebi göster
    document.querySelectorAll(".finance-request-card").forEach(card => {
      const username = card.querySelector(".finance-request-top b")?.textContent?.trim();
      const status = card.querySelector(".request-status")?.textContent?.trim();

      if(!username || status !== "Reddedildi") return;
      if(card.querySelector(".reject-reason-view")) return;

      const req = reqs.find(r => r.username === username && r.status === "Reddedildi" && r.rejectReason);
      if(!req) return;

      const note = card.querySelector(".finance-note") || card.querySelector(".finance-request-actions");

      if(note){
        note.insertAdjacentHTML("beforebegin", `
          <div class="reject-reason-view">
            <small>Red Sebebi</small>
            <span>${req.rejectReason}</span>
          </div>
        `);
      }
    });
  }, 160);
};

// Kullanıcı talep geçmişinde red sebebini göster
const oldUserPaymentRequestsHtmlRejectReason = userPaymentRequestsHtml;

userPaymentRequestsHtml = function(){
  const html = oldUserPaymentRequestsHtmlRejectReason();

  setTimeout(() => {
    const reqs = getPaymentRequests().filter(r => user && r.username === user.username);

    document.querySelectorAll(".profile-request-item").forEach(item => {
      const status = item.querySelector(".request-status")?.textContent?.trim();
      if(status !== "Reddedildi") return;
      if(item.querySelector(".user-reject-reason")) return;

      const amountText = item.querySelector(".request-mid")?.textContent || "";
      const req = reqs.find(r => r.status === "Reddedildi" && r.rejectReason && amountText.includes(String(Number(r.amount || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ".")));

      const reason = req?.rejectReason || reqs.find(r => r.status === "Reddedildi" && r.rejectReason)?.rejectReason;

      if(reason){
        item.insertAdjacentHTML("beforeend", `
          <div class="user-reject-reason">
            <b>Red Sebebi</b>
            <span>${reason}</span>
          </div>
        `);
      }
    });
  }, 180);

  return html;
};

// FINANCE REQUEST TIMELINE
function financeTimelineHtml(r){
  const isWithdraw = r.type === "Çekim";
  const isRejected = r.status === "Reddedildi";
  const isApproved = r.status === "Onaylandı";

  return `
    <div class="finance-timeline">
      <div class="timeline-item done">
        <i></i>
        <div>
          <b>Talep oluşturuldu</b>
          <span>${r.date || "-"}</span>
        </div>
      </div>

      ${isWithdraw ? `
        <div class="timeline-item done">
          <i></i>
          <div>
            <b>Bakiye talep anında düşüldü</b>
            <span>${r.balanceDeducted ? "Çekim tutarı kullanıcı bakiyesinden ayrıldı." : "Eski talep: onayda düşüm uygulanır."}</span>
          </div>
        </div>
      ` : `
        <div class="timeline-item ${isApproved ? "done" : "wait"}">
          <i></i>
          <div>
            <b>Admin onayı bekleniyor</b>
            <span>Onaylanınca yatırım bakiyeye eklenir.</span>
          </div>
        </div>
      `}

      ${r.status === "Bekliyor" ? `
        <div class="timeline-item wait">
          <i></i>
          <div>
            <b>Beklemede</b>
            <span>Admin işlemi bekleniyor.</span>
          </div>
        </div>
      ` : ""}

      ${isApproved ? `
        <div class="timeline-item done">
          <i></i>
          <div>
            <b>Admin onayladı</b>
            <span>${r.processedAt || "-"}</span>
          </div>
        </div>
      ` : ""}

      ${isRejected ? `
        <div class="timeline-item reject">
          <i></i>
          <div>
            <b>Admin reddetti</b>
            <span>${r.processedAt || "-"}</span>
            ${r.rejectReason ? `<em>${r.rejectReason}</em>` : ""}
          </div>
        </div>
      ` : ""}
    </div>
  `;
}

// Finans talep kartlarına timeline ekle
const oldRenderPaymentRequestsAdminTimeline = renderPaymentRequestsAdmin;

renderPaymentRequestsAdmin = function(){
  oldRenderPaymentRequestsAdminTimeline();

  setTimeout(() => {
    const reqs = getPaymentRequests();

    document.querySelectorAll(".finance-request-card").forEach(card => {
      if(card.querySelector(".finance-timeline")) return;

      const username = card.querySelector(".finance-request-top b")?.textContent?.trim();
      const amountText = card.querySelector(".finance-request-body .tx-plus, .finance-request-body .tx-minus")?.textContent || "";
      const status = card.querySelector(".request-status")?.textContent?.trim();

      const req = reqs.find(r => {
        const amountOk = amountText.includes(String(Number(r.amount || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, "."));
        return r.username === username && r.status === status && amountOk;
      }) || reqs.find(r => r.username === username && r.status === status);

      if(!req) return;

      const actions = card.querySelector(".finance-request-actions");
      if(actions){
        actions.insertAdjacentHTML("beforebegin", financeTimelineHtml(req));
      }
    });
  }, 180);
};

// FINANCE REQUEST DELETE / CLEAN
function deletePaymentRequest(id){
  if(user?.role !== "admin"){
    alert("Bu işlem sadece admin için.");
    return;
  }

  const reqs = getPaymentRequests();
  const req = reqs.find(r => String(r.id) === String(id));

  if(!req){
    alert("Talep bulunamadı.");
    return;
  }

  if(req.status === "Bekliyor"){
    alert("Bekleyen talep silinemez. Önce onayla veya reddet.");
    return;
  }

  const next = reqs.filter(r => String(r.id) !== String(id));
  setPaymentRequests(next);

  alert("Talep kaydı silindi.");
  renderPaymentRequestsAdmin();
}

function clearProcessedPaymentRequests(){
  if(user?.role !== "admin"){
    alert("Bu işlem sadece admin için.");
    return;
  }

  const reqs = getPaymentRequests();
  const pending = reqs.filter(r => r.status === "Bekliyor");
  const processedCount = reqs.length - pending.length;

  if(!processedCount){
    alert("Temizlenecek işlenmiş talep yok.");
    return;
  }

  setPaymentRequests(pending);

  alert("Onaylanmış ve reddedilmiş talepler temizlendi. Bekleyen talepler korundu.");
  renderPaymentRequestsAdmin();
}

// Finans sayfasına silme butonları ekle
const oldRenderPaymentRequestsAdminDeleteClean = renderPaymentRequestsAdmin;

renderPaymentRequestsAdmin = function(){
  oldRenderPaymentRequestsAdminDeleteClean();

  setTimeout(() => {
    const head = document.querySelector(".users-admin-card .card-head");

    if(head && !document.querySelector(".finance-clean-btn")){
      head.insertAdjacentHTML("beforeend", `
        <button class="finance-clean-btn" onclick="clearProcessedPaymentRequests()">
          İşlenmişleri Temizle
        </button>
      `);
    }

    const reqs = getPaymentRequests();

    document.querySelectorAll(".finance-request-card").forEach(card => {
      if(card.querySelector(".finance-delete-btn")) return;

      const username = card.querySelector(".finance-request-top b")?.textContent?.trim();
      const status = card.querySelector(".request-status")?.textContent?.trim();

      const req = reqs.find(r => r.username === username && r.status === status);
      if(!req) return;

      const actions = card.querySelector(".finance-request-actions");
      if(!actions) return;

      if(req.status !== "Bekliyor"){
        actions.insertAdjacentHTML("beforeend", `
          <button class="finance-delete-btn" onclick="deletePaymentRequest('${req.id}')">
            Kaydı Sil
          </button>
        `);
      }
    });
  }, 220);
};

// ADMIN BACKUP / RESTORE SYSTEM
const BOZOBET_BACKUP_KEYS = [
  "bozobet_user",
  "bozobet_users",
  "bozobet_matches",
  "bozobet_payment_requests",
  "bozobet_transactions",
  "bozobet_bets",
  "bozobet_support_tickets",
  "bozobet_notifications",
  "bozobet_payment_limits",
  "bozobet_deposit_methods",
  "bozobet_withdraw_methods",
  "bozobet_announcement",
  "bozobet_maintenance"
];

function createBozobetBackup(){
  if(user?.role !== "admin"){
    alert("Bu işlem sadece admin için.");
    return;
  }

  const data = {
    app:"BozoBet V2",
    createdAt:new Date().toLocaleString("tr-TR"),
    version:"local",
    storage:{}
  };

  BOZOBET_BACKUP_KEYS.forEach(key => {
    data.storage[key] = localStorage.getItem(key);
  });

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type:"application/json"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeDate = new Date().toISOString().slice(0,19).replaceAll(":","-");

  a.href = url;
  a.download = `galaxybet-yedek-${safeDate}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);

  alert("Yedek dosyası indirildi.");
}

function triggerBackupImport(){
  const input = document.getElementById("backupImportInput");
  if(input) input.click();
}

function restoreBozobetBackup(file){
  if(user?.role !== "admin"){
    alert("Bu işlem sadece admin için.");
    return;
  }

  if(!file){
    alert("Yedek dosyası seçilmedi.");
    return;
  }

  const reader = new FileReader();

  reader.onload = function(){
    try{
      const data = JSON.parse(reader.result);

      if(!data || data.app !== "BozoBet V2" || !data.storage){
        alert("Geçersiz yedek dosyası.");
        return;
      }

      Object.entries(data.storage).forEach(([key,value]) => {
        if(BOZOBET_BACKUP_KEYS.includes(key)){
          if(value === null || typeof value === "undefined"){
            localStorage.removeItem(key);
          }else{
            localStorage.setItem(key, value);
          }
        }
      });

      alert("Yedek başarıyla geri yüklendi. Sayfa yenileniyor.");
      setTimeout(() => location.reload(), 900);
    }catch(e){
      alert("Yedek dosyası okunamadı.");
    }
  };

  reader.readAsText(file);
}

function clearData(){
  if(user?.role !== "admin"){
    alert("Bu işlem sadece admin için.");
    return;
  }

  const ok = confirm("Tüm verileri temizlemek istediğine emin misin? Bu işlem geri alınamaz.");
  if(!ok) return;

  BOZOBET_BACKUP_KEYS.forEach(key => {
    if(key !== "bozobet_user"){
      localStorage.removeItem(key);
    }
  });

  alert("Veriler temizlendi. Sayfa yenileniyor.");
  setTimeout(() => location.reload(), 900);
}

function renderBackupAdmin(){
  if(user?.role !== "admin"){
    alert("Bu alana sadece admin hesabı erişebilir.");
    loginModal();
    return;
  }

  const users = getUsers();
  const reqs = getPaymentRequests();
  const bets = getBets();
  const tickets = getSupportTickets();
  const txs = getTransactions();

  document.getElementById("app").innerHTML = shell(`
    <section class="page-hero mini admin-mini">
      <div>
        <span>SİSTEM ARAÇLARI</span>
        <h1>Yedekleme / Geri Yükleme</h1>
        <p>Tüm verileri JSON dosyası olarak indir veya daha önce aldığın yedeği geri yükle.</p>
      </div>
      <button class="btn gold" onclick="renderAdminDashboard()">Admin Panele Dön</button>
    </section>

    <section class="backup-grid">
      <div class="card backup-card">
        <h3>Veri Özeti</h3>

        <div class="backup-stats">
          <div><small>Üye</small><b>${users.length}</b></div>
          <div><small>Finans Talebi</small><b>${reqs.length}</b></div>
          <div><small>Kupon</small><b>${bets.length}</b></div>
          <div><small>Destek Talebi</small><b>${tickets.length}</b></div>
          <div><small>İşlem Kaydı</small><b>${txs.length}</b></div>
        </div>
      </div>

      <div class="card backup-card">
        <h3>Yedek Al</h3>
        <p>Mevcut tüm verileri bilgisayarına JSON dosyası olarak indirir.</p>
        <button class="btn primary full-btn" onclick="createBozobetBackup()">Yedek Dosyası İndir</button>
      </div>

      <div class="card backup-card">
        <h3>Yedek Geri Yükle</h3>
        <p>Daha önce indirdiğin GalaxyBet yedek dosyasını seçip geri yükleyebilirsin.</p>

        <input id="backupImportInput" type="file" accept="application/json" hidden onchange="restoreBozobetBackup(this.files[0])">
        <button class="btn gold full-btn" onclick="triggerBackupImport()">Yedek Dosyası Seç</button>
      </div>

      <div class="card backup-card danger-backup-card">
        <h3>Verileri Temizle</h3>
        <p>Üyeleri, talepleri, kuponları, destek kayıtlarını ve ayarları temizler. Admin oturumu hariç tutulur.</p>
        <button class="btn full-btn danger-btn" onclick="clearData()">Verileri Temizle</button>
      </div>
    </section>
  `);
}

// Admin ana panele yedekleme kısa yolu ekle
const oldRenderAdminDashboardBackup = renderAdminDashboard;
renderAdminDashboard = function(){
  oldRenderAdminDashboardBackup();

  setTimeout(() => {
    const shortcuts = document.querySelector(".admin-shortcuts");

    if(shortcuts && !document.querySelector(".backup-shortcut")){
      shortcuts.insertAdjacentHTML("beforeend", `
        <button class="backup-shortcut" onclick="renderBackupAdmin()">
          <b>💾 Yedekleme</b>
          <span>Verileri indir, geri yükle veya temizle.</span>
        </button>
      `);
    }
  }, 80);
};

// ADMIN SYSTEM LOGS
function getAdminLogs(){
  return JSON.parse(localStorage.getItem("bozobet_admin_logs") || "[]");
}

function setAdminLogs(items){
  localStorage.setItem("bozobet_admin_logs", JSON.stringify(items));
}

function addAdminLog(action, detail){
  const logs = getAdminLogs();

  logs.unshift({
    id:Date.now() + Math.floor(Math.random() * 999),
    date:new Date().toLocaleString("tr-TR"),
    admin:user?.username || "admin",
    action,
    detail
  });

  setAdminLogs(logs.slice(0, 500));
}

function clearAdminLogs(){
  if(user?.role !== "admin"){
    alert("Bu işlem sadece admin için.");
    return;
  }

  setAdminLogs([]);
  alert("Sistem logları temizlendi.");
  renderAdminLogs();
}

function renderAdminLogs(){
  if(user?.role !== "admin"){
    alert("Bu alana sadece admin hesabı erişebilir.");
    loginModal();
    return;
  }

  const logs = getAdminLogs();

  document.getElementById("app").innerHTML = shell(`
    <section class="page-hero mini admin-mini">
      <div>
        <span>SİSTEM KAYITLARI</span>
        <h1>Admin İşlem Logları</h1>
        <p>Admin panelinde yapılan önemli işlemler burada kayıt altında tutulur.</p>
      </div>
      <button class="btn gold" onclick="renderAdminDashboard()">Admin Panele Dön</button>
    </section>

    <section class="card admin-log-card">
      <div class="card-head">
        <div>
          <h3>Sistem Logları</h3>
          <span>${logs.length} kayıt</span>
        </div>

        <button class="finance-clean-btn" onclick="clearAdminLogs()">Logları Temizle</button>
      </div>

      ${logs.length ? `
        <div class="admin-log-list">
          ${logs.map(l => `
            <div class="admin-log-row">
              <div class="admin-log-icon">🛡️</div>

              <div>
                <b>${l.action}</b>
                <span>${l.detail}</span>
                <small>${l.admin} · ${l.date}</small>
              </div>
            </div>
          `).join("")}
        </div>
      ` : `
        <div class="empty-coupon">
          <b>Henüz log kaydı yok</b>
          <span>Admin işlem yaptıkça kayıtlar burada görünecek.</span>
        </div>
      `}
    </section>
  `);
}

// Önemli admin işlemlerini logla
if(typeof approvePaymentRequest === "function"){
  const oldApprovePaymentRequestLog = approvePaymentRequest;
  approvePaymentRequest = function(id){
    const req = getPaymentRequests().find(r => String(r.id) === String(id));
    oldApprovePaymentRequestLog(id);
    if(req) addAdminLog("Finans Talebi Onaylandı", `${req.username} · ${req.type} · ${money(req.amount)}`);
  };
}

if(typeof rejectPaymentRequestWithReason === "function"){
  const oldRejectPaymentRequestWithReasonLog = rejectPaymentRequestWithReason;
  rejectPaymentRequestWithReason = function(id){
    const req = getPaymentRequests().find(r => String(r.id) === String(id));
    const reason = document.getElementById("rejectReason_" + id)?.value || "";
    oldRejectPaymentRequestWithReasonLog(id);
    if(req) addAdminLog("Finans Talebi Reddedildi", `${req.username} · ${req.type} · ${money(req.amount)} · ${reason}`);
  };
}

if(typeof settleBet === "function"){
  const oldSettleBetLog = settleBet;
  settleBet = function(betId, result){
    const bet = getBets().find(b => String(b.id) === String(betId));
    oldSettleBetLog(betId, result);

    const label = result === "won" ? "Kazandı" : result === "lost" ? "Kaybetti" : "İade";
    if(bet) addAdminLog("Kupon Sonuçlandırıldı", `${bet.username} · ${label} · ${money(bet.stake)}`);
  };
}

if(typeof toggleUserStatus === "function"){
  const oldToggleUserStatusLog = toggleUserStatus;
  toggleUserStatus = function(userId){
    const target = getUsers().find(u => String(u.id) === String(userId));
    oldToggleUserStatusLog(userId);
    if(target) addAdminLog("Üye Durumu Değiştirildi", `${target.username} hesabı aktif/pasif değiştirildi`);
  };
}

if(typeof updateUserBalance === "function"){
  const oldUpdateUserBalanceLog = updateUserBalance;
  updateUserBalance = function(userId, type){
    const target = getUsers().find(u => String(u.id) === String(userId));
    const amount = document.getElementById("balance_" + userId)?.value || "";
    oldUpdateUserBalanceLog(userId, type);

    if(target){
      addAdminLog(
        type === "add" ? "Üye Bakiyesi Eklendi" : "Üye Bakiyesi Düşüldü",
        `${target.username} · ${money(amount)}`
      );
    }
  };
}

if(typeof updateUserBalanceFromDetail === "function"){
  const oldUpdateUserBalanceFromDetailLog = updateUserBalanceFromDetail;
  updateUserBalanceFromDetail = function(userId, type){
    const target = getUsers().find(u => String(u.id) === String(userId));
    const amount = document.getElementById("detailBalanceAmount")?.value || "";
    oldUpdateUserBalanceFromDetailLog(userId, type);

    if(target){
      addAdminLog(
        type === "add" ? "Detaydan Bakiye Eklendi" : "Detaydan Bakiye Düşüldü",
        `${target.username} · ${money(amount)}`
      );
    }
  };
}

if(typeof toggleDepositMethod === "function"){
  const oldToggleDepositMethodLog = toggleDepositMethod;
  toggleDepositMethod = function(id){
    const method = getDepositMethods().find(m => m.id === id);
    oldToggleDepositMethodLog(id);
    if(method) addAdminLog("Yatırım Yöntemi Değiştirildi", `${method.name} aktif/pasif değiştirildi`);
  };
}

if(typeof toggleWithdrawMethod === "function"){
  const oldToggleWithdrawMethodLog = toggleWithdrawMethod;
  toggleWithdrawMethod = function(id){
    const method = getWithdrawMethods().find(m => m.id === id);
    oldToggleWithdrawMethodLog(id);
    if(method) addAdminLog("Çekim Yöntemi Değiştirildi", `${method.name} aktif/pasif değiştirildi`);
  };
}

// Admin ana panele sistem logları kısa yolu ekle
const oldRenderAdminDashboardLogs = renderAdminDashboard;
renderAdminDashboard = function(){
  oldRenderAdminDashboardLogs();

  setTimeout(() => {
    const shortcuts = document.querySelector(".admin-shortcuts");

    if(shortcuts && !document.querySelector(".admin-logs-shortcut")){
      shortcuts.insertAdjacentHTML("beforeend", `
        <button class="admin-logs-shortcut" onclick="renderAdminLogs()">
          <b>🛡️ Sistem Logları</b>
          <span>Admin panelinde yapılan işlemleri görüntüle.</span>
        </button>
      `);
    }
  }, 80);
};

// ADMIN LOG SEARCH / FILTER / EXPORT
var adminLogSearchText = "";
var adminLogActionFilter = "all";

function bbSafeText(value){
  return String(value || "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function setAdminLogActionFilter(action){
  adminLogActionFilter = action;
  renderAdminLogs();
}

function searchAdminLogs(){
  adminLogSearchText = document.getElementById("adminLogSearch")?.value?.trim() || "";
  renderAdminLogs();
}

function clearAdminLogSearch(){
  adminLogSearchText = "";
  adminLogActionFilter = "all";
  renderAdminLogs();
}

function filteredAdminLogs(){
  const q = adminLogSearchText.toLowerCase();

  return getAdminLogs().filter(l => {
    const actionOk = adminLogActionFilter === "all" || l.action === adminLogActionFilter;

    const searchOk = !q || [
      l.action,
      l.detail,
      l.admin,
      l.date
    ].join(" ").toLowerCase().includes(q);

    return actionOk && searchOk;
  });
}

function exportAdminLogsCsv(){
  if(user?.role !== "admin"){
    alert("Bu işlem sadece admin için.");
    return;
  }

  const logs = filteredAdminLogs();

  if(!logs.length){
    alert("İndirilecek log kaydı yok.");
    return;
  }

  const rows = [
    ["Tarih","Admin","İşlem","Detay"],
    ...logs.map(l => [
      l.date || "",
      l.admin || "",
      l.action || "",
      l.detail || ""
    ])
  ];

  const csv = rows.map(row => row.map(cell => {
    const value = String(cell).replaceAll('"','""');
    return `"${value}"`;
  }).join(";")).join("\n");

  const blob = new Blob(["\ufeff" + csv], {
    type:"text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeDate = new Date().toISOString().slice(0,19).replaceAll(":","-");

  a.href = url;
  a.download = `galaxybet-sistem-loglari-${safeDate}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

renderAdminLogs = function(){
  if(user?.role !== "admin"){
    alert("Bu alana sadece admin hesabı erişebilir.");
    loginModal();
    return;
  }

  const allLogs = getAdminLogs();
  const logs = filteredAdminLogs();
  const actions = [...new Set(allLogs.map(l => l.action).filter(Boolean))];

  document.getElementById("app").innerHTML = shell(`
    <section class="page-hero mini admin-mini">
      <div>
        <span>SİSTEM KAYITLARI</span>
        <h1>Admin İşlem Logları</h1>
        <p>Admin panelindeki önemli işlemleri ara, filtrele ve CSV olarak indir.</p>
      </div>
      <button class="btn gold" onclick="renderAdminDashboard()">Admin Panele Dön</button>
    </section>

    <section class="card admin-log-card">
      <div class="card-head admin-log-head">
        <div>
          <h3>Sistem Logları</h3>
          <span>${logs.length} / ${allLogs.length} kayıt gösteriliyor</span>
        </div>

        <div class="admin-log-actions">
          <button onclick="exportAdminLogsCsv()">CSV İndir</button>
          <button class="finance-clean-btn" onclick="clearAdminLogs()">Logları Temizle</button>
        </div>
      </div>

      <div class="admin-log-toolbar">
        <input id="adminLogSearch" value="${bbSafeText(adminLogSearchText)}" placeholder="İşlem, admin, detay veya tarih ara">
        <button onclick="searchAdminLogs()">Ara</button>
        <button onclick="clearAdminLogSearch()">Temizle</button>
      </div>

      <div class="admin-log-filter-row">
        <button class="${adminLogActionFilter === "all" ? "active" : ""}" onclick="setAdminLogActionFilter('all')">
          Tümü
        </button>

        ${actions.map(a => `
          <button class="${adminLogActionFilter === a ? "active" : ""}" onclick="setAdminLogActionFilter('${bbSafeText(a)}')">
            ${bbSafeText(a)}
          </button>
        `).join("")}
      </div>

      ${logs.length ? `
        <div class="admin-log-list">
          ${logs.map(l => `
            <div class="admin-log-row">
              <div class="admin-log-icon">🛡️</div>

              <div>
                <b>${bbSafeText(l.action)}</b>
                <span>${bbSafeText(l.detail)}</span>
                <small>${bbSafeText(l.admin)} · ${bbSafeText(l.date)}</small>
              </div>
            </div>
          `).join("")}
        </div>
      ` : `
        <div class="empty-coupon">
          <b>Log kaydı bulunamadı</b>
          <span>Arama veya filtreyi temizleyip tekrar deneyebilirsin.</span>
        </div>
      `}
    </section>
  `);
};

// PREMIUM TOAST NOTIFICATION SYSTEM
function getToastType(message){
  const text = String(message || "").toLowerCase();

  if(
    text.includes("hata") ||
    text.includes("geçersiz") ||
    text.includes("bulunamadı") ||
    text.includes("yetersiz") ||
    text.includes("reddedildi") ||
    text.includes("silinemez") ||
    text.includes("zorunlu") ||
    text.includes("olmalı") ||
    text.includes("erişebilir")
  ){
    return "error";
  }

  if(
    text.includes("başarı") ||
    text.includes("oluşturuldu") ||
    text.includes("onaylandı") ||
    text.includes("eklendi") ||
    text.includes("güncellendi") ||
    text.includes("indirildi") ||
    text.includes("kopyalandı") ||
    text.includes("temizlendi") ||
    text.includes("yüklendi")
  ){
    return "success";
  }

  return "info";
}

function showToast(message, type){
  const toastType = type || getToastType(message);

  let holder = document.getElementById("toastHolder");

  if(!holder){
    holder = document.createElement("div");
    holder.id = "toastHolder";
    document.body.appendChild(holder);
  }

  const icon = toastType === "success" ? "✓" : toastType === "error" ? "!" : "i";

  const toast = document.createElement("div");
  toast.className = `bb-toast ${toastType}`;
  toast.innerHTML = `
    <div class="bb-toast-icon">${icon}</div>
    <div class="bb-toast-content">
      <b>${toastType === "success" ? "Başarılı" : toastType === "error" ? "Uyarı" : "Bilgi"}</b>
      <span>${String(message || "")}</span>
    </div>
    <button onclick="this.closest('.bb-toast').remove()">×</button>
  `;

  holder.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("show");
  }, 20);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3300);
}

// Tarayıcı alertlerini site içi premium bildirime çevir
window.nativeAlert = window.nativeAlert || window.alert;

window.alert = function(message){
  showToast(message);
};

// STORED TEXT CLEANUP - SAFE ONE TIME
(function(){
  const keys = [
    "bozobet_deposit_methods",
    "bozobet_withdraw_methods",
    "bozobet_payment_requests",
    "bozobet_transactions",
    "bozobet_notifications",
    "bozobet_admin_logs",
    "bozobet_support_tickets"
  ];

  keys.forEach(key => {
    try{
      const raw = localStorage.getItem(key);
      if(!raw || !raw.toLowerCase().includes("demo")) return;

      const cleaned = raw
        .replaceAll("local-demo", "local")
        .replaceAll("Local Demo", "Local")
        .replaceAll("local demo", "local")
        .replaceAll("Demo", "")
        .replaceAll("demo", "");

      localStorage.setItem(key, cleaned);
    }catch(e){}
  });
})();

// PREMIUM CONFIRM MODAL
var bbConfirmCallback = null;

function bbConfirm(title, text, okText, cancelText, callback){
  bbConfirmCallback = callback;

  let modal = document.getElementById("bbConfirmModal");

  if(!modal){
    modal = document.createElement("div");
    modal.id = "bbConfirmModal";
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="bb-confirm-backdrop" onclick="bbCloseConfirm()"></div>

    <div class="bb-confirm-box">
      <div class="bb-confirm-icon">!</div>

      <h3>${title || "Onay Gerekli"}</h3>
      <p>${text || "Bu işlemi yapmak istediğine emin misin?"}</p>

      <div class="bb-confirm-actions">
        <button class="bb-confirm-cancel" onclick="bbCloseConfirm()">
          ${cancelText || "Vazgeç"}
        </button>

        <button class="bb-confirm-ok" onclick="bbRunConfirm()">
          ${okText || "Onayla"}
        </button>
      </div>
    </div>
  `;

  modal.classList.add("show");
}

function bbCloseConfirm(){
  const modal = document.getElementById("bbConfirmModal");
  if(modal) modal.classList.remove("show");
  bbConfirmCallback = null;
}

function bbRunConfirm(){
  const cb = bbConfirmCallback;
  bbCloseConfirm();

  if(typeof cb === "function"){
    cb();
  }
}

// Finans talebi silme onaylı
if(typeof deletePaymentRequest === "function"){
  const oldDeletePaymentRequestPremium = deletePaymentRequest;

  deletePaymentRequest = function(id){
    bbConfirm(
      "Talep Kaydı Silinsin mi?",
      "Bu finans talep kaydı listeden kaldırılacak. Bekleyen talepler zaten silinemez.",
      "Kaydı Sil",
      "Vazgeç",
      function(){
        oldDeletePaymentRequestPremium(id);
      }
    );
  };
}

// İşlenmiş finans taleplerini temizleme onaylı
if(typeof clearProcessedPaymentRequests === "function"){
  const oldClearProcessedPaymentRequestsPremium = clearProcessedPaymentRequests;

  clearProcessedPaymentRequests = function(){
    bbConfirm(
      "İşlenmiş Talepler Temizlensin mi?",
      "Onaylanmış ve reddedilmiş finans talepleri temizlenir. Bekleyen talepler korunur.",
      "Temizle",
      "Vazgeç",
      function(){
        oldClearProcessedPaymentRequestsPremium();
      }
    );
  };
}

// Sistem loglarını temizleme onaylı
if(typeof clearAdminLogs === "function"){
  const oldClearAdminLogsPremium = clearAdminLogs;

  clearAdminLogs = function(){
    bbConfirm(
      "Sistem Logları Temizlensin mi?",
      "Admin işlem kayıtları temizlenecek. Bu işlem geri alınamaz.",
      "Logları Temizle",
      "Vazgeç",
      function(){
        oldClearAdminLogsPremium();
      }
    );
  };
}

// Veri temizleme için güvenli yeni sürüm
function clearAllSiteDataWithConfirm(){
  if(user?.role !== "admin"){
    alert("Bu işlem sadece admin için.");
    return;
  }

  bbConfirm(
    "Tüm Veriler Temizlensin mi?",
    "Üyeler, finans talepleri, kuponlar, destek kayıtları, bildirimler ve ayarlar temizlenecek. Önce yedek alman önerilir.",
    "Verileri Temizle",
    "Vazgeç",
    function(){
      const keys = [
        "bozobet_users",
        "bozobet_matches",
        "bozobet_payment_requests",
        "bozobet_transactions",
        "bozobet_bets",
        "bozobet_support_tickets",
        "bozobet_notifications",
        "bozobet_payment_limits",
        "bozobet_deposit_methods",
        "bozobet_withdraw_methods",
        "bozobet_announcement",
        "bozobet_maintenance",
        "bozobet_admin_logs"
      ];

      keys.forEach(key => localStorage.removeItem(key));

      alert("Veriler temizlendi. Sayfa yenileniyor.");
      setTimeout(() => location.reload(), 900);
    }
  );
}

// Eski temizleme butonları yeni premium onaya yönlensin
if(typeof clearDemoData === "function"){
  clearDemoData = clearAllSiteDataWithConfirm;
}

if(typeof clearData === "function"){
  clearData = clearAllSiteDataWithConfirm;
}

// LOADING SCREEN GUARD
function hideLoadingScreen(){
  if(typeof window.removeLoadingScreen === "function"){
    window.removeLoadingScreen("app.hideLoadingScreen");
    return;
  }

  const loader = document.querySelector(".loading-screen, #loading, .site-loader, .loader-screen");

  if(loader){
    loader.style.opacity = "0";
    loader.style.pointerEvents = "none";

    setTimeout(() => {
      loader.remove();
    }, 350);
  }

  document.body.classList.add("site-ready");
}

function forceRenderHomeIfEmpty(){
  const app = document.getElementById("app");

  if(app && !app.innerHTML.trim()){
    try{
      if(typeof renderHome === "function"){
        renderHome();
      }else if(typeof homePage === "function"){
        homePage();
      }
    }catch(e){
      app.innerHTML = `
        <div class="safe-error-screen">
          <h1>Sayfa yüklenemedi</h1>
          <p>Bir JavaScript hatası oluştu. Terminal açık kalsın, tarayıcı konsolundaki kırmızı hatayı kontrol et.</p>
          <button onclick="location.reload()">Tekrar Dene</button>
        </div>
      `;
    }
  }

  hideLoadingScreen();
}

window.addEventListener("load", () => {
  setTimeout(forceRenderHomeIfEmpty, 400);
  setTimeout(hideLoadingScreen, 900);
});

// Her ihtimale karşı sonsuz yüklenmeyi engelle
setTimeout(() => {
  forceRenderHomeIfEmpty();
}, 2200);

window.addEventListener("error", function(e){
  const app = document.getElementById("app");

  if(app && !app.innerHTML.trim()){
    app.innerHTML = `
      <div class="safe-error-screen">
        <h1>Site açılırken hata oluştu</h1>
        <p>${String(e.message || "Bilinmeyen hata")}</p>
        <button onclick="location.reload()">Tekrar Dene</button>
      </div>
    `;
  }

  hideLoadingScreen();
});

// REAL USER TRANSACTION HISTORY - PROFILE FIX
function bbCurrentUserTransactions(){
  if(!user) return [];

  const txs = typeof getTransactions === "function" ? getTransactions() : [];

  return txs
    .filter(t => {
      return String(t.userId || "") === String(user.id || "") ||
             String(t.username || "") === String(user.username || "");
    })
    .sort((a,b) => Number(b.id || 0) - Number(a.id || 0));
}

function bbRealTransactionIcon(t){
  const text = `${t.type || ""} ${t.note || ""}`.toLowerCase();

  if(text.includes("yatırım")) return "💳";
  if(text.includes("çekim")) return "🏦";
  if(text.includes("kupon")) return "🎟️";
  if(text.includes("iade")) return "↩️";
  if(text.includes("bakiye")) return "💰";

  return "📌";
}

function bbRealTransactionClass(t){
  if(t.direction === "plus") return "plus";
  if(t.direction === "minus") return "minus";
  return "neutral";
}

function bbRealUserTransactionsHtml(){
  const txs = bbCurrentUserTransactions();

  return `
    <div class="real-user-transactions">
      <div class="real-user-transactions-head">
        <div>
          <h3>İşlem Geçmişi</h3>
          <span>Sadece hesabına ait gerçek işlemler listelenir.</span>
        </div>
        <b>${txs.length} kayıt</b>
      </div>

      ${txs.length ? `
        <div class="real-user-transaction-list">
          ${txs.map(t => `
            <div class="real-user-transaction-row ${bbRealTransactionClass(t)}">
              <div class="real-tx-icon">${bbRealTransactionIcon(t)}</div>

              <div class="real-tx-main">
                <b>${t.type || "İşlem"}</b>
                <span>${t.note || t.status || "-"}</span>
                <small>${t.date || t.createdAt || "-"}</small>
              </div>

              <div class="real-tx-amount">
                <b>
                  ${t.direction === "plus" ? "+" : t.direction === "minus" ? "-" : ""}
                  ${money(t.amount || 0)}
                </b>
                <span>${t.status || "-"}</span>
              </div>
            </div>
          `).join("")}
        </div>
      ` : `
        <div class="real-empty-transactions">
          <b>Henüz işlem yok</b>
          <span>Yatırım, çekim, kupon veya bakiye işlemlerin oluştuğunda burada görünecek.</span>
        </div>
      `}
    </div>
  `;
}

// Eğer profil eski userTransactionsHtml fonksiyonunu kullanıyorsa direkt gerçek veriye çevir
if(typeof userTransactionsHtml === "function"){
  userTransactionsHtml = bbRealUserTransactionsHtml;
}

// Profil içindeki eski örnek işlem geçmişi kartını gerçek işlem geçmişiyle değiştir
function bbReplaceProfileTransactionHistory(){
  if(!user) return;

  const app = document.getElementById("app");
  if(!app) return;

  const headings = [...app.querySelectorAll("h2,h3,h4,b,strong")];
  const heading = headings.find(el => (el.textContent || "").trim().toLowerCase().includes("işlem geçmişi"));

  if(!heading) return;

  const card = heading.closest(".card") || heading.closest("section") || heading.parentElement;
  if(!card) return;

  if(card.querySelector(".real-user-transactions")) return;

  card.innerHTML = bbRealUserTransactionsHtml();
}

if(typeof renderProfile === "function"){
  const oldRenderProfileRealTransactions = renderProfile;

  renderProfile = function(){
    oldRenderProfileRealTransactions();

    setTimeout(bbReplaceProfileTransactionHistory, 80);
    setTimeout(bbReplaceProfileTransactionHistory, 250);
  };
}

// Finans talebi oluşturulunca kullanıcının gerçek işlem geçmişine de yaz
if(typeof addPaymentRequest === "function"){
  const oldAddPaymentRequestRealTx = addPaymentRequest;

  addPaymentRequest = function(req){
    oldAddPaymentRequestRealTx(req);

    try{
      if(!user || user.role === "admin") return;
      if(!req || req.username !== user.username) return;

      const txType = req.type === "Çekim" ? "Çekim Talebi" : "Yatırım Talebi";

      addTransaction({
        username:user.username,
        userId:user.id || user.username,
        type:txType,
        direction:req.type === "Çekim" ? "minus" : "plus",
        amount:req.amount,
        status:"Bekliyor",
        note:`${req.method || "-"} yöntemiyle ${req.type.toLowerCase()} talebi oluşturuldu`
      });
    }catch(e){}
  };
}

// PROFILE FAKE TRANSACTION TABLE KILL + REAL HISTORY
function bbUserRealTransactions(){
  if(!user) return [];

  const txs = typeof getTransactions === "function" ? getTransactions() : [];

  return txs
    .filter(t =>
      String(t.userId || "") === String(user.id || "") ||
      String(t.username || "") === String(user.username || "")
    )
    .sort((a,b) => Number(b.id || 0) - Number(a.id || 0));
}

function bbTxIcon(t){
  const text = `${t.type || ""} ${t.note || ""}`.toLowerCase();

  if(text.includes("yatırım")) return "💳";
  if(text.includes("çekim")) return "🏦";
  if(text.includes("kupon")) return "🎟️";
  if(text.includes("iade")) return "↩️";
  if(text.includes("bakiye")) return "💰";

  return "📌";
}

function bbTxClass(t){
  if(t.direction === "plus") return "plus";
  if(t.direction === "minus") return "minus";
  return "neutral";
}

function bbRealProfileTransactionsHtml(){
  const txs = bbUserRealTransactions();

  return `
    <div class="bb-real-profile-tx">
      <div class="bb-real-profile-tx-head">
        <div>
          <h3>İşlem Geçmişi</h3>
          <span>Hesabına ait gerçek yatırım, çekim, kupon ve bakiye kayıtları.</span>
        </div>
        <b>${txs.length} kayıt</b>
      </div>

      ${txs.length ? `
        <div class="bb-real-profile-tx-list">
          ${txs.map(t => `
            <div class="bb-real-profile-tx-row ${bbTxClass(t)}">
              <div class="bb-real-profile-tx-icon">${bbTxIcon(t)}</div>

              <div class="bb-real-profile-tx-main">
                <b>${t.type || "İşlem"}</b>
                <span>${t.note || t.status || "-"}</span>
                <small>${t.date || t.createdAt || "-"}</small>
              </div>

              <div class="bb-real-profile-tx-amount">
                <b>
                  ${t.direction === "plus" ? "+" : t.direction === "minus" ? "-" : ""}
                  ${money(t.amount || 0)}
                </b>
                <span>${t.status || "-"}</span>
              </div>
            </div>
          `).join("")}
        </div>
      ` : `
        <div class="bb-real-profile-tx-empty">
          <b>Henüz gerçek işlem yok</b>
          <span>Yatırım, çekim, kupon veya bakiye işlemi oluştuğunda burada görünecek.</span>
        </div>
      `}
    </div>
  `;
}

function bbForceReplaceFakeTransactionHistory(){
  const app = document.getElementById("app");
  if(!app || !user) return;

  const all = [...app.querySelectorAll("*")];

  const title = all.find(el => {
    const text = (el.textContent || "").trim();
    return text === "İşlem Geçmişi";
  });

  if(!title) return;

  let box =
    title.closest(".card") ||
    title.closest(".profile-card") ||
    title.closest(".dashboard-card") ||
    title.closest("section") ||
    title.parentElement;

  if(!box) return;

  // Eski örnek tabloda Casino Oyun / Bonus varsa komple sök
  const boxText = box.textContent || "";
  if(
    boxText.includes("Casino Oyun") ||
    boxText.includes("Bonus") ||
    !box.querySelector(".bb-real-profile-tx")
  ){
    box.innerHTML = bbRealProfileTransactionsHtml();
  }
}

if(typeof userTransactionsHtml === "function"){
  userTransactionsHtml = bbRealProfileTransactionsHtml;
}

if(typeof renderProfile === "function"){
  const oldRenderProfileRealTxHardFix = renderProfile;

  renderProfile = function(){
    oldRenderProfileRealTxHardFix();

    setTimeout(bbForceReplaceFakeTransactionHistory, 50);
    setTimeout(bbForceReplaceFakeTransactionHistory, 200);
    setTimeout(bbForceReplaceFakeTransactionHistory, 600);
  };
}

document.addEventListener("click", () => {
  setTimeout(bbForceReplaceFakeTransactionHistory, 250);
});


// DEPOSIT IBAN STEP BEFORE REQUEST
var pendingDepositRequestData = null;

function getSelectedDepositMethodName(){
  return window.siteDepositMethod || "Havale / EFT";
}

function getDepositAccountInfo(methodName){
  const name = String(methodName || "").toLowerCase();

  if(name.includes("papara")){
    return {
      title:"Papara Hesap Bilgisi",
      value:"1234567890",
      receiver:"Bozo Finans",
      desc:"Açıklama kısmına kullanıcı adını yazman yeterli."
    };
  }

  if(name.includes("usdt") || name.includes("trc")){
    return {
      title:"USDT TRC20 Adresi",
      value:"TQ9x8mHn7Kp4sR2vB6cL1zA5yE3uD0wF12",
      receiver:"GalaxyBet Cüzdan",
      desc:"Sadece TRC20 ağı üzerinden gönderim yapılmalıdır."
    };
  }

  if(name.includes("qr")){
    return {
      title:"QR Ödeme Bilgisi",
      value:"QR-ODEME-GALAXYBET-5620",
      receiver:"GalaxyBet QR",
      desc:"Ödeme açıklamasına kullanıcı adını ekle."
    };
  }

  return {
    title:"Banka IBAN Bilgisi",
    value:"TR12 0001 0002 3456 7890 1234 56",
    receiver:"BOZO FİNANS",
    desc:"Açıklama kısmına kullanıcı adını yaz."
  };
}

function renderDepositPaymentStep(amount, method){
  const info = getDepositAccountInfo(method);

  const target = document.querySelector(".deposit-form-card") || document.querySelector(".deposit-page-grid");

  if(!target){
    alert("Yatırım ekranı bulunamadı.");
    return;
  }

  target.innerHTML = `
    <h3>Yatırım Bilgileri</h3>

    <div class="deposit-pay-step">
      <div class="deposit-pay-row">
        <small>Seçili Yöntem</small>
        <b>${method}</b>
      </div>

      <div class="deposit-pay-row">
        <small>Yatırım Tutarı</small>
        <b>${money(amount)}</b>
      </div>

      <div class="deposit-account-box">
        <small>Alıcı İsmi</small>
        <b id="depositReceiverName">${info.receiver}</b>
        <button onclick="copyText('${info.receiver}')">Alıcıyı Kopyala</button>
      </div>

      <div class="deposit-account-box">
        <small>${info.title}</small>
        <b id="depositAccountValue">${info.value}</b>
        <button onclick="copyText('${info.value}')">Kopyala</button>
      </div>

      <div class="deposit-pay-note">
        <b>Ödeme Açıklaması</b>
        <span>${info.desc}</span>
      </div>

      <button class="btn primary full-btn" onclick="confirmDepositPaid()">Yatırım Yaptım</button>
      <button class="btn ghost full-btn" onclick="renderDepositSitePage()">Yöntemi / Tutarı Değiştir</button>
    </div>
  `;
}

function submitDepositShowAccountStep(){
  if(!user){
    loginModal();
    return;
  }

  const amount = parseFlexibleAmount(document.getElementById("siteDepositAmount")?.value);
  const method = getSelectedDepositMethodName();

  const l = typeof getPaymentLimits === "function" ? getPaymentLimits() : {
    minDeposit:100,
    maxDeposit:50000
  };

  if(!Number.isFinite(amount) || amount <= 0){
    alert("Geçerli yatırım tutarı gir.");
    return;
  }

  if(amount < l.minDeposit || amount > l.maxDeposit){
    alert(`Yatırım tutarı ${money(l.minDeposit)} ile ${money(l.maxDeposit)} arasında olmalı.`);
    return;
  }

  pendingDepositRequestData = {
    username:user.username,
    userId:user.id || user.username,
    type:"Yatırım",
    direction:"plus",
    amount,
    method,
    status:"Bekliyor",
    note:`${method} yöntemiyle yatırım bildirimi oluşturuldu`
  };

  renderDepositPaymentStep(amount, method);
}

function confirmDepositPaid(){
  if(!user){
    loginModal();
    return;
  }

  if(!pendingDepositRequestData){
    alert("Yatırım bilgisi bulunamadı. Lütfen yeniden talep oluştur.");
    renderDepositSitePage();
    return;
  }

  addPaymentRequest(pendingDepositRequestData);

  addTransaction({
    username:user.username,
    userId:user.id || user.username,
    type:"Yatırım Talebi",
    direction:"plus",
    amount:pendingDepositRequestData.amount,
    status:"Bekliyor",
    note:`${pendingDepositRequestData.method} yöntemiyle yatırım bildirimi gönderildi`
  });

  pendingDepositRequestData = null;

  alert("Yatırım bildirimin alındı. Admin onayından sonra bakiyene eklenecek.");
  renderProfile();
}

window.openTawkSupport = function(){
  if(window.Tawk_API && typeof window.Tawk_API.maximize === "function") window.Tawk_API.maximize();
};

// BETNEX GAME IMPORT PANEL
function getBetnexGameSettings(){
  return JSON.parse(localStorage.getItem("bozobet_betnex_game_settings") || "null") || {
    key:"",
    host:"",
    endpoint:"",
    arrayPath:"",
    titleKey:"name",
    imageKey:"image",
    providerKey:"provider",
    categoryKey:"category"
  };
}

function setBetnexGameSettings(data){
  localStorage.setItem("bozobet_betnex_game_settings", JSON.stringify(data));
}

function getImportedApiGames(){
  return JSON.parse(localStorage.getItem("bozobet_api_games") || "[]");
}

function setImportedApiGames(items){
  localStorage.setItem("bozobet_api_games", JSON.stringify(items));
}

function readByPath(obj, path){
  if(!path) return obj;

  return String(path)
    .split(".")
    .map(x => x.trim())
    .filter(Boolean)
    .reduce((acc,key) => acc && acc[key], obj);
}

function saveBetnexGameSettings(){
  if(user?.role !== "admin"){
    alert("Bu işlem sadece admin için.");
    return;
  }

  const data = {
    key:document.getElementById("rapidGameKey")?.value?.trim() || "",
    host:document.getElementById("rapidGameHost")?.value?.trim() || "",
    endpoint:document.getElementById("rapidGameEndpoint")?.value?.trim() || "",
    arrayPath:document.getElementById("rapidGameArrayPath")?.value?.trim() || "",
    titleKey:document.getElementById("rapidGameTitleKey")?.value?.trim() || "name",
    imageKey:document.getElementById("rapidGameImageKey")?.value?.trim() || "image",
    providerKey:document.getElementById("rapidGameProviderKey")?.value?.trim() || "provider",
    categoryKey:document.getElementById("rapidGameCategoryKey")?.value?.trim() || "category"
  };

  if(!data.key || !data.host || !data.endpoint){
    alert("API Key, Host ve Endpoint boş olamaz.");
    return;
  }

  setBetnexGameSettings(data);
  alert("Betnex ayarları kaydedildi.");
  renderBetnexGamesAdmin();
}

async function importBetnexGames(){
  if(user?.role !== "admin"){
    alert("Bu işlem sadece admin için.");
    return;
  }

  const settings = getBetnexGameSettings();

  const btn = document.getElementById("rapidImportBtn");
  if(btn){
    btn.disabled = true;
    btn.textContent = "Oyunlar çekiliyor...";
  }

  try{
    const provider = document.getElementById("betApiProvider")?.value?.trim() || "SPRIBE";
    const res = await fetch(`/api/games?provider=${encodeURIComponent(provider)}`, {
      method:"GET",
      headers:{
        "Content-Type":"application/json"
      }
    });

    if(!res.ok){
      throw new Error("API isteği başarısız: " + res.status);
    }

    const json = await res.json();
    const configuredList = readByPath(json, settings.arrayPath);
    const list = Array.isArray(configuredList) ? configuredList : findFirstArrayDeep(json);

    if(!Array.isArray(list)){
      alert("Oyun listesi bulunamadı. Array path alanını kontrol et.");
      return;
    }

    const games = list.map((g,i) => {
      const title = readByPath(g, settings.titleKey) || g.name || g.title || `Oyun ${i + 1}`;
      const image = readByPath(g, settings.imageKey) || g.image || g.img || g.thumbnail || "";
      const provider = readByPath(g, settings.providerKey) || g.provider || g.providerName || "Provider";
      const category = readByPath(g, settings.categoryKey) || g.category || g.type || "Sanal Oyunlar";

      return {
        id:"api_game_" + Date.now() + "_" + i,
        title:String(title),
        image:String(image || ""),
        provider:String(provider || ""),
        category:String(category || "Sanal Oyunlar"),
        raw:g
      };
    }).filter(g => g.title);

    setImportedApiGames(games);

    alert(`${games.length} oyun içeri aktarıldı.`);
    renderBetnexGamesAdmin();
  }catch(err){
    alert("Oyunlar çekilemedi: " + err.message);
  }finally{
    if(btn){
      btn.disabled = false;
      btn.textContent = "API'den Oyunları Çek";
    }
  }
}

function clearBetnexGames(){
  if(user?.role !== "admin"){
    alert("Bu işlem sadece admin için.");
    return;
  }

  setImportedApiGames([]);
  alert("API oyunları temizlendi.");
  renderBetnexGamesAdmin();
}

function apiGameCardHtml(g){
  return `
    <div class="api-game-card">
      <div class="api-game-img">
        ${g.image ? `<img src="${g.image}" alt="">` : `<span>🎮</span>`}
      </div>

      <div class="api-game-info">
        <b>${g.title}</b>
        <span>${g.provider || "Provider"}</span>
        <em>${g.category || "Sanal Oyunlar"}</em>
      </div>

      <button onclick="alert('Oyun açma bağlantısı API cevabındaki launch/url alanına göre bağlanacak.')">
        Oyna
      </button>
    </div>
  `;
}

function renderBetnexGamesAdmin(){
  if(user?.role !== "admin"){
    alert("Bu alana sadece admin hesabı erişebilir.");
    loginModal();
    return;
  }

  const s = getBetnexGameSettings();
  const games = getImportedApiGames();

  document.getElementById("app").innerHTML = shell(`
    <section class="page-hero mini admin-mini">
      <div>
        <span>OYUN YÖNETİMİ</span>
        <h1>Betnex Oyun Aktarıcı</h1>
        <p>Betnex oyun listesini çek ve site içinde göster.</p>
      </div>
      <button class="btn gold" onclick="renderAdminDashboard()">Admin Panele Dön</button>
    </section>

    <section class="rapid-api-grid">
      <div class="card rapid-api-card">
        <h3>API Ayarları</h3>

        <div class="rapid-api-form">
          <label class="wide">
            <span>API Key</span>
            <input id="rapidGameKey" value="${s.key || ""}" placeholder="API key">
          </label>

          <label>
            <span>API Host</span>
            <input id="rapidGameHost" value="${s.host || ""}" placeholder="Betnex">
          </label>

          <label>
            <span>Endpoint URL</span>
            <input id="rapidGameEndpoint" value="${s.endpoint || ""}" placeholder="https://...">
          </label>

          <label>
            <span>Array Path</span>
            <input id="rapidGameArrayPath" value="${s.arrayPath || ""}" placeholder="data.games veya boş">
          </label>

          <label>
            <span>Oyun Adı Key</span>
            <input id="rapidGameTitleKey" value="${s.titleKey || "name"}">
          </label>

          <label>
            <span>Görsel Key</span>
            <input id="rapidGameImageKey" value="${s.imageKey || "image"}">
          </label>

          <label>
            <span>Provider Key</span>
            <input id="rapidGameProviderKey" value="${s.providerKey || "provider"}">
          </label>

          <label>
            <span>Kategori Key</span>
            <input id="rapidGameCategoryKey" value="${s.categoryKey || "category"}">
          </label>
        </div>

        <div class="rapid-api-actions">
          <button class="btn gold" onclick="saveBetnexGameSettings()">Ayarları Kaydet</button>
          <button id="rapidImportBtn" class="btn primary" onclick="importBetnexGames()">API'den Oyunları Çek</button>
          <button class="btn ghost" onclick="clearBetnexGames()">Oyunları Temizle</button>
        </div>
      </div>

      <div class="card rapid-api-card">
        <h3>Çekilen Oyunlar</h3>

        ${games.length ? `
          <div class="api-game-list">
            ${games.slice(0,60).map(apiGameCardHtml).join("")}
          </div>
        ` : `
          <div class="empty-coupon">
            <b>Henüz oyun çekilmedi</b>
            <span>API ayarlarını girip oyunları çek.</span>
          </div>
        `}
      </div>
    </section>
  `);
}

// Admin kısayolu
if(typeof renderAdminDashboard === "function"){
  const oldRenderAdminDashboardRapidGames = renderAdminDashboard;

  renderAdminDashboard = function(){
    oldRenderAdminDashboardRapidGames();

    setTimeout(() => {
      const shortcuts = document.querySelector(".admin-shortcuts");

      if(shortcuts && !document.querySelector(".rapid-games-shortcut")){
        shortcuts.insertAdjacentHTML("beforeend", `
          <button class="rapid-games-shortcut" onclick="renderBetnexGamesAdmin()">
            <b>🎮 Betnex Oyun Aktarıcı</b>
            <span>API oyunlarını çek ve siteye ekle.</span>
          </button>
        `);
      }
    }, 120);
  };
}

// Sanal oyunlar / casino / slot sayfalarında API oyunlarını göster
function renderApiGamesPage(title, categoryFilter){
  const games = getImportedApiGames();
  const filtered = categoryFilter
    ? games.filter(g => String(g.category || "").toLowerCase().includes(categoryFilter.toLowerCase()))
    : games;

  document.getElementById("app").innerHTML = shell(`
    <section class="page-hero mini">
      <div>
        <span>OYUNLAR</span>
        <h1>${title}</h1>
        <p>Aktif oyun listesi.</p>
      </div>
    </section>

    <section class="api-games-public-grid">
      ${filtered.length ? filtered.map(apiGameCardHtml).join("") : `
        <div class="empty-coupon">
          <b>Henüz oyun yok</b>
          <span>Admin panelinden Betnex oyunlarını çek.</span>
        </div>
      `}
    </section>
  `);
}

if(typeof renderVirtualGames === "function"){
  renderVirtualGames = function(){
    renderApiGamesPage("Sanal Oyunlar", "");
  };
}

if(typeof renderCasino === "function"){
  const oldRenderCasinoRapid = renderCasino;

  renderCasino = function(){
    const games = getImportedApiGames();

    if(games.length){
      renderApiGamesPage("Casino", "casino");
    }else{
      oldRenderCasinoRapid();
    }
  };
}

if(typeof renderSlot === "function"){
  const oldRenderSlotRapid = renderSlot;

  renderSlot = function(){
    const games = getImportedApiGames();

    if(games.length){
      renderApiGamesPage("Slot", "slot");
    }else{
      oldRenderSlotRapid();
    }
  };
}

// BET API PROVIDER / GAMES / LAUNCH INTEGRATION
const BET_API_BASE = "/api";

function getBetApiSettings(){
  return JSON.parse(localStorage.getItem("bozobet_bet_api_settings") || "null") || {
    key:"",
    provider:"SPRIBE",
    usernamePrefix:"bozobet_user_",
    lang:"tr",
    currency:"TRY",
    homeUrl:"https://bozobet.local"
  };
}

function setBetApiSettings(data){
  localStorage.setItem("bozobet_bet_api_settings", JSON.stringify(data));
}

function getBetApiGames(){
  return JSON.parse(localStorage.getItem("bozobet_bet_api_games") || "[]");
}

function setBetApiGames(items){
  localStorage.setItem("bozobet_bet_api_games", JSON.stringify(items));
}

function betApiHeaders(){
  const s = getBetApiSettings();

  return {
    "Content-Type":"application/json"
  };
}

function saveBetApiSettings(){
  if(user?.role !== "admin"){
    alert("Bu işlem sadece admin için.");
    return;
  }

  const data = {
    key:document.getElementById("betApiKey")?.value?.trim() || "",
    provider:document.getElementById("betApiProvider")?.value?.trim() || "SPRIBE",
    usernamePrefix:document.getElementById("betApiUsernamePrefix")?.value?.trim() || "bozobet_user_",
    lang:document.getElementById("betApiLang")?.value?.trim() || "tr",
    currency:document.getElementById("betApiCurrency")?.value?.trim() || "TRY",
    homeUrl:document.getElementById("betApiHomeUrl")?.value?.trim() || location.origin
  };

  setBetApiSettings(data);
  alert("API ayarları kaydedildi.");
  renderBetApiAdmin();
}

function findFirstArrayDeep(obj){
  if(Array.isArray(obj)) return obj;

  if(!obj || typeof obj !== "object") return [];

  const keys = ["data","games","result","results","items","list","providers"];

  for(const key of keys){
    if(Array.isArray(obj[key])) return obj[key];
    if(obj[key] && typeof obj[key] === "object"){
      const nested = findFirstArrayDeep(obj[key]);
      if(nested.length) return nested;
    }
  }

  for(const value of Object.values(obj)){
    if(Array.isArray(value)) return value;

    if(value && typeof value === "object"){
      const nested = findFirstArrayDeep(value);
      if(nested.length) return nested;
    }
  }

  return [];
}

function normalizeBetApiGame(g, index, provider){
  const id =
    g.gameId ||
    g.game_id ||
    g.id ||
    g.uuid ||
    g.gameCode ||
    g.code ||
    g.slug ||
    "";

  const title =
    g.gameName ||
    g.name ||
    g.title ||
    g.game ||
    g.game_title ||
    `Oyun ${index + 1}`;

  const image =
    g.image ||
    g.img ||
    g.icon ||
    g.thumbnail ||
    g.logo ||
    g.cover ||
    "";

  const category =
    g.category ||
    g.type ||
    g.gameType ||
    provider ||
    "Casino";

  return {
    id:"betapi_" + Date.now() + "_" + index,
    gameId:String(id),
    title:String(title),
    image:String(image || ""),
    provider:String(provider || g.provider || g.providerName || ""),
    category:String(category || "Casino"),
    raw:g
  };
}

async function fetchBetApiProviders(){
  if(user?.role !== "admin"){
    alert("Bu işlem sadece admin için.");
    return;
  }

  const s = getBetApiSettings();

  try{
    const res = await fetch(`${BET_API_BASE}/providers`, {
      method:"GET",
      headers:betApiHeaders()
    });

    const json = await res.json();
    const list = findFirstArrayDeep(json);

    if(!list.length){
      alert("Provider listesi okunamadı. Example Response ekranını atarsan path'i net bağlarız.");
      return;
    }

    const names = list.map(x => {
      if(typeof x === "string") return x;
      return x.provider || x.name || x.title || x.code || x.id;
    }).filter(Boolean);

    localStorage.setItem("bozobet_bet_api_providers", JSON.stringify(names));

    alert(`${names.length} provider çekildi.`);
    renderBetApiAdmin();
  }catch(e){
    alert("Provider çekilemedi: " + e.message);
  }
}

async function fetchBetApiGamesByProvider(){
  if(user?.role !== "admin"){
    alert("Bu işlem sadece admin için.");
    return;
  }

  const s = getBetApiSettings();

  const provider = document.getElementById("betApiProvider")?.value?.trim() || s.provider || "SPRIBE";

  try{
    const url = `${BET_API_BASE}/games?provider=${encodeURIComponent(provider)}`;

    const res = await fetch(url, {
      method:"GET",
      headers:betApiHeaders()
    });

    const json = await res.json();
    const list = findFirstArrayDeep(json);

    if(!list.length){
      alert("Oyun listesi okunamadı. Example Response ekranını atarsan JSON yolunu net bağlarız.");
      return;
    }

    const games = list
      .map((g,i) => normalizeBetApiGame(g, i, provider))
      .filter(g => g.gameId && g.title);

    setBetApiGames(games);

    alert(`${games.length} oyun çekildi ve siteye eklendi.`);
    renderBetApiAdmin();
  }catch(e){
    alert("Oyunlar çekilemedi: " + e.message);
  }
}

function clearBetApiGames(){
  if(user?.role !== "admin"){
    alert("Bu işlem sadece admin için.");
    return;
  }

  setBetApiGames([]);
  alert("API oyunları temizlendi.");
  renderBetApiAdmin();
}

function betApiPublicGameCard(g){
  return `
    <div class="api-game-card betapi-game-card">
      <div class="api-game-img">
        ${g.image ? `<img src="${g.image}" alt="">` : `<span>🎮</span>`}
      </div>

      <div class="api-game-info">
        <b>${g.title}</b>
        <span>${g.provider || "Provider"}</span>
        <em>${g.category || "Casino"}</em>
      </div>

      <button onclick="launchBetApiGame('${g.gameId}')">Oyna</button>
    </div>
  `;
}

async function launchBetApiGame(gameId){
  if(!user){
    loginModal();
    return;
  }

  const s = getBetApiSettings();

  try{
    const username = `${s.usernamePrefix || "bozobet_user_"}${user.username || user.id}`;

    const res = await fetch(`${BET_API_BASE}/game-url`, {
      method:"POST",
      headers:betApiHeaders(),
      body:JSON.stringify({
        username,
        gameId,
        lang:s.lang || "tr",
        money:Number(user.balance || 0),
        home_url:s.homeUrl || location.origin,
        platform:1,
        currency:s.currency || "TRY"
      })
    });

    const json = await res.json();

    const url = json.launchUrl;

    if(!url){
      console.log("Game URL response:", json);
      alert("Oyun linki alınamadı. Response içindeki URL alanını görmemiz lazım.");
      return;
    }

    window.open(url, "_blank");
  }catch(e){
    alert("Oyun açılamadı: " + e.message);
  }
}

function renderBetApiAdmin(){
  if(user?.role !== "admin"){
    alert("Bu alana sadece admin hesabı erişebilir.");
    loginModal();
    return;
  }

  const s = getBetApiSettings();
  const providers = JSON.parse(localStorage.getItem("bozobet_bet_api_providers") || "[]");
  const games = getBetApiGames();

  document.getElementById("app").innerHTML = shell(`
    <section class="page-hero mini admin-mini">
      <div>
        <span>OYUN YÖNETİMİ</span>
        <h1>Bet API Oyunları</h1>
        <p>Provider listesini çek, provider oyunlarını siteye ekle ve Oyna butonuyla oyun linki oluştur.</p>
      </div>
      <button class="btn gold" onclick="renderAdminDashboard()">Admin Panele Dön</button>
    </section>

    <section class="rapid-api-grid">
      <div class="card rapid-api-card">
        <h3>API Ayarları</h3>

        <div class="rapid-api-form">
          <label class="wide">
            <span>API Key</span>
            <input id="betApiKey" value="${s.key || ""}" placeholder="API key">
          </label>

          <label class="wide">
            <span>Host</span>
            <input value="${BET_API_HOST}" disabled>
          </label>

          <label>
            <span>Provider</span>
            <input id="betApiProvider" value="${s.provider || "SPRIBE"}" list="betApiProviderList">
            <datalist id="betApiProviderList">
              ${providers.map(p => `<option value="${p}"></option>`).join("")}
            </datalist>
          </label>

          <label>
            <span>Currency</span>
            <input id="betApiCurrency" value="${s.currency || "TRY"}">
          </label>

          <label>
            <span>Language</span>
            <input id="betApiLang" value="${s.lang || "tr"}">
          </label>

          <label>
            <span>Username Prefix</span>
            <input id="betApiUsernamePrefix" value="${s.usernamePrefix || "bozobet_user_"}">
          </label>

          <label class="wide">
            <span>Home URL</span>
            <input id="betApiHomeUrl" value="${s.homeUrl || location.origin}">
          </label>
        </div>

        <div class="rapid-api-actions">
          <button class="btn gold" onclick="saveBetApiSettings()">Ayarları Kaydet</button>
          <button class="btn ghost" onclick="fetchBetApiProviders()">Providerları Çek</button>
          <button class="btn primary" onclick="fetchBetApiGamesByProvider()">Provider Oyunlarını Çek</button>
          <button class="btn ghost" onclick="clearBetApiGames()">Oyunları Temizle</button>
        </div>
      </div>

      <div class="card rapid-api-card">
        <h3>Çekilen Oyunlar</h3>

        ${games.length ? `
          <div class="api-game-list">
            ${games.slice(0,80).map(betApiPublicGameCard).join("")}
          </div>
        ` : `
          <div class="empty-coupon">
            <b>Henüz oyun çekilmedi</b>
            <span>Önce API key kaydet, sonra provider oyunlarını çek.</span>
          </div>
        `}
      </div>
    </section>
  `);
}

if(typeof renderAdminDashboard === "function"){
  const oldRenderAdminDashboardBetApi = renderAdminDashboard;

  renderAdminDashboard = function(){
    oldRenderAdminDashboardBetApi();

    setTimeout(() => {
      const shortcuts = document.querySelector(".admin-shortcuts");

      if(shortcuts && !document.querySelector(".betapi-games-shortcut")){
        shortcuts.insertAdjacentHTML("beforeend", `
          <button class="betapi-games-shortcut" onclick="renderBetApiAdmin()">
            <b>🎰 Bet API Oyunları</b>
            <span>Provider oyunlarını çek ve oyun linki oluştur.</span>
          </button>
        `);
      }
    }, 120);
  };
}

function renderBetApiGamesPublicLegacy(title, filter){
  const games = getBetApiGames();
  const q = String(filter || "").toLowerCase();

  const filtered = q
    ? games.filter(g => `${g.title} ${g.provider} ${g.category}`.toLowerCase().includes(q))
    : games;

  document.getElementById("app").innerHTML = shell(`
    <section class="page-hero mini">
      <div>
        <span>OYUNLAR</span>
        <h1>${title}</h1>
        <p>Aktif oyun listesi.</p>
      </div>
    </section>

    <section class="api-games-public-grid">
      ${filtered.length ? filtered.map(betApiPublicGameCard).join("") : `
        <div class="empty-coupon">
          <b>Henüz oyun yok</b>
          <span>Admin panelinden Bet API oyunlarını çek.</span>
        </div>
      `}
    </section>
  `);
}

if(typeof renderVirtualGames === "function"){
  renderVirtualGames = function(){
    renderBetApiGamesPublic("Sanal Oyunlar", "");
  };
}

if(typeof renderCasino === "function"){
  const oldRenderCasinoBetApi = renderCasino;

  renderCasino = function(){
    if(getBetApiGames().length){
      renderBetApiGamesPublic("Casino", "casino");
    }else{
      oldRenderCasinoBetApi();
    }
  };
}

if(typeof renderSlot === "function"){
  const oldRenderSlotBetApi = renderSlot;

  renderSlot = function(){
    if(getBetApiGames().length){
      renderBetApiGamesPublic("Slot", "slot");
    }else{
      oldRenderSlotBetApi();
    }
  };
}

// FORCE BET API ADMIN BUTTON / DIRECT ROUTE
function forceBetApiAdminAccessButton(){
  if(!user || user.role !== "admin") return;
  if(typeof renderBetApiAdmin !== "function") return;

  // Header'a buton ekle
  const header =
    document.querySelector("header") ||
    document.querySelector(".topbar") ||
    document.querySelector(".navbar") ||
    document.querySelector(".site-header");

  if(header && !document.querySelector(".force-betapi-header-btn")){
    const btn = document.createElement("button");
    btn.className = "force-betapi-header-btn";
    btn.innerHTML = "🎰 Bet API";
    btn.onclick = renderBetApiAdmin;
    header.appendChild(btn);
  }

  // Admin panel içine büyük kart ekle
  const app = document.getElementById("app");
  if(app && app.textContent.includes("Admin") && !document.querySelector(".force-betapi-admin-card")){
    app.insertAdjacentHTML("afterbegin", `
      <section class="force-betapi-admin-card" onclick="renderBetApiAdmin()">
        <div>
          <b>🎰 Bet API Oyunları</b>
          <span>Provider oyunlarını çek, Casino / Slot / Sanal Oyunlar tarafına ekle.</span>
        </div>
        <button>Panele Git</button>
      </section>
    `);
  }
}

// Direkt URL ile açma: /?betapi=1
function openBetApiFromUrl(){
  const params = new URLSearchParams(location.search);

  if(params.get("betapi") === "1"){
    setTimeout(() => {
      if(!user){
        loginModal();
        alert("Önce admin hesabıyla giriş yap.");
        return;
      }

      if(user.role !== "admin"){
        alert("Bu alan sadece admin için.");
        return;
      }

      if(typeof renderBetApiAdmin === "function"){
        renderBetApiAdmin();
      }else{
        alert("Bet API panel fonksiyonu bulunamadı. Önceki API yaması tam eklenmemiş olabilir.");
      }
    }, 500);
  }
}

window.addEventListener("load", () => {
  setTimeout(forceBetApiAdminAccessButton, 500);
  setTimeout(openBetApiFromUrl, 700);
});

document.addEventListener("click", () => {
  setTimeout(forceBetApiAdminAccessButton, 300);
});

setInterval(forceBetApiAdminAccessButton, 1200);

if(typeof renderAdminDashboard === "function"){
  const oldRenderAdminDashboardForceBetApi = renderAdminDashboard;

  renderAdminDashboard = function(){
    oldRenderAdminDashboardForceBetApi();

    setTimeout(forceBetApiAdminAccessButton, 150);
    setTimeout(forceBetApiAdminAccessButton, 500);
  };
}

// BET API ALL PROVIDERS / MULTI PROVIDER IMPORT
function getBetApiProviders(){
  return JSON.parse(localStorage.getItem("bozobet_bet_api_providers") || "[]");
}

function setBetApiProviders(items){
  localStorage.setItem("bozobet_bet_api_providers", JSON.stringify(items));
}

function mergeBetApiGames(newGames){
  const oldGames = getBetApiGames();

  const map = new Map();

  [...oldGames, ...newGames].forEach(g => {
    const key = `${g.provider || ""}_${g.gameId || g.title}`;
    map.set(key, g);
  });

  setBetApiGames([...map.values()]);
}

function normalizeProviderName(item){
  if(typeof item === "string") return item;

  return (
    item.provider ||
    item.name ||
    item.title ||
    item.code ||
    item.providerName ||
    item.id ||
    ""
  );
}

async function fetchBetApiProvidersV2(){
  if(user?.role !== "admin"){
    alert("Bu işlem sadece admin için.");
    return;
  }

  const s = getBetApiSettings();

  try{
    const res = await fetch(`${BET_API_BASE}/providers`, {
      method:"GET",
      headers:betApiHeaders()
    });

    const json = await res.json();
    const list = findFirstArrayDeep(json);

    const providers = list
      .map(normalizeProviderName)
      .filter(Boolean)
      .map(x => String(x).trim())
      .filter(Boolean);

    const unique = [...new Set(providers)];

    if(!unique.length){
      console.log("Provider response:", json);
      alert("Provider listesi okunamadı. Console'da response görünüyor.");
      return;
    }

    setBetApiProviders(unique);

    alert(`${unique.length} provider çekildi.`);
    renderBetApiAdmin();
  }catch(e){
    alert("Providerlar çekilemedi: " + e.message);
  }
}

async function fetchOneProviderGames(provider, appendMode){
  const s = getBetApiSettings();

  const url = `${BET_API_BASE}/games?provider=${encodeURIComponent(provider)}`;

  const res = await fetch(url, {
    method:"GET",
    headers:betApiHeaders()
  });

  const json = await res.json();
  const list = findFirstArrayDeep(json);

  if(!Array.isArray(list) || !list.length){
    console.log("Oyun response boş:", provider, json);
    return [];
  }

  const games = list
    .map((g,i) => normalizeBetApiGame(g, i, provider))
    .filter(g => g.gameId && g.title);

  if(appendMode){
    mergeBetApiGames(games);
  }else{
    setBetApiGames(games);
  }

  return games;
}

async function fetchSelectedBetApiProviderGames(providerName){
  if(user?.role !== "admin"){
    alert("Bu işlem sadece admin için.");
    return;
  }

  const s = getBetApiSettings();

  const provider = providerName || document.getElementById("betApiProvider")?.value?.trim() || s.provider || "SPRIBE";

  try{
    const games = await fetchOneProviderGames(provider, false);

    if(!games.length){
      alert(`${provider} için oyun bulunamadı.`);
      return;
    }

    const next = {
      ...s,
      provider
    };

    setBetApiSettings(next);

    alert(`${provider} için ${games.length} oyun çekildi.`);
    renderBetApiAdmin();
  }catch(e){
    alert(`${provider} oyunları çekilemedi: ` + e.message);
  }
}

async function appendSelectedBetApiProviderGames(providerName){
  if(user?.role !== "admin"){
    alert("Bu işlem sadece admin için.");
    return;
  }

  const s = getBetApiSettings();

  const provider = providerName || document.getElementById("betApiProvider")?.value?.trim() || s.provider || "SPRIBE";

  try{
    const before = getBetApiGames().length;
    const games = await fetchOneProviderGames(provider, true);
    const after = getBetApiGames().length;

    if(!games.length){
      alert(`${provider} için oyun bulunamadı.`);
      return;
    }

    alert(`${provider} eklendi. Toplam oyun: ${after} kayıt.`);
    renderBetApiAdmin();
  }catch(e){
    alert(`${provider} eklenemedi: ` + e.message);
  }
}

async function fetchAllBetApiProviderGames(){
  if(user?.role !== "admin"){
    alert("Bu işlem sadece admin için.");
    return;
  }

  const s = getBetApiSettings();

  let providers = getBetApiProviders();

  if(!providers.length){
    alert("Önce Providerları Çek butonuna bas.");
    return;
  }

  const ok = confirm(`${providers.length} provider için oyun çekilecek. Devam edilsin mi?`);
  if(!ok) return;

  setBetApiGames([]);

  let total = 0;
  let success = 0;
  let failed = 0;

  const btn = document.getElementById("fetchAllProvidersBtn");
  if(btn){
    btn.disabled = true;
    btn.textContent = "Tüm providerlar çekiliyor...";
  }

  for(const provider of providers){
    try{
      const games = await fetchOneProviderGames(provider, true);
      total += games.length;

      if(games.length) success++;
      else failed++;

      await new Promise(resolve => setTimeout(resolve, 350));
    }catch(e){
      failed++;
      console.log("Provider hata:", provider, e);
    }
  }

  if(btn){
    btn.disabled = false;
    btn.textContent = "Tüm Provider Oyunlarını Çek";
  }

  alert(`Bitti. ${success} provider başarılı, ${failed} boş/hatalı. Toplam ${getBetApiGames().length} oyun eklendi.`);
  renderBetApiAdmin();
}

function providerQuickButtonsHtml(providers, activeProvider){
  if(!providers.length){
    return `
      <div class="provider-empty-box">
        <b>Provider listesi yok</b>
        <span>Önce Providerları Çek butonuna bas.</span>
      </div>
    `;
  }

  return `
    <div class="provider-button-grid">
      ${providers.map(p => `
        <button class="${String(p).toLowerCase() === String(activeProvider).toLowerCase() ? "active" : ""}" onclick="fetchSelectedBetApiProviderGames('${p}')">
          ${p}
        </button>
      `).join("")}
    </div>
  `;
}

// Eski provider çekme ve oyun çekme butonlarını yeni sisteme bağla
fetchBetApiProviders = fetchBetApiProvidersV2;
fetchBetApiGamesByProvider = function(){
  return fetchSelectedBetApiProviderGames();
};

renderBetApiAdmin = function(){
  if(user?.role !== "admin"){
    alert("Bu alana sadece admin hesabı erişebilir.");
    loginModal();
    return;
  }

  const s = getBetApiSettings();
  const providers = getBetApiProviders();
  const games = getBetApiGames();

  const providerCounts = games.reduce((acc,g) => {
    const p = g.provider || "Provider";
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {});

  document.getElementById("app").innerHTML = shell(`
    <section class="page-hero mini admin-mini">
      <div>
        <span>OYUN YÖNETİMİ</span>
        <h1>Bet API Oyunları</h1>
        <p>Providerları çek, istediğin sağlayıcıyı tek tek yükle veya tüm provider oyunlarını içeri aktar.</p>
      </div>
      <button class="btn gold" onclick="renderAdminDashboard()">Admin Panele Dön</button>
    </section>

    <section class="rapid-api-grid">
      <div class="card rapid-api-card">
        <h3>API Ayarları</h3>

        <div class="rapid-api-form">
          <label class="wide">
            <span>API Key</span>
            <input id="betApiKey" value="${s.key || ""}" placeholder="API key">
          </label>

          <label class="wide">
            <span>Host</span>
            <input value="${BET_API_HOST}" disabled>
          </label>

          <label>
            <span>Provider</span>
            <input id="betApiProvider" value="${s.provider || "SPRIBE"}" list="betApiProviderList">
            <datalist id="betApiProviderList">
              ${providers.map(p => `<option value="${p}"></option>`).join("")}
            </datalist>
          </label>

          <label>
            <span>Currency</span>
            <input id="betApiCurrency" value="${s.currency || "TRY"}">
          </label>

          <label>
            <span>Language</span>
            <input id="betApiLang" value="${s.lang || "tr"}">
          </label>

          <label>
            <span>Username Prefix</span>
            <input id="betApiUsernamePrefix" value="${s.usernamePrefix || "bozobet_user_"}">
          </label>

          <label class="wide">
            <span>Home URL</span>
            <input id="betApiHomeUrl" value="${s.homeUrl || location.origin}">
          </label>
        </div>

        <div class="rapid-api-actions">
          <button class="btn gold" onclick="saveBetApiSettings()">Ayarları Kaydet</button>
          <button class="btn ghost" onclick="fetchBetApiProvidersV2()">Providerları Çek</button>
          <button class="btn primary" onclick="fetchSelectedBetApiProviderGames()">Seçili Providerı Yükle</button>
          <button class="btn ghost" onclick="appendSelectedBetApiProviderGames()">Seçili Providerı Ekle</button>
          <button id="fetchAllProvidersBtn" class="btn primary" onclick="fetchAllBetApiProviderGames()">Tüm Provider Oyunlarını Çek</button>
          <button class="btn ghost" onclick="clearBetApiGames()">Oyunları Temizle</button>
        </div>

        <div class="provider-panel">
          <div class="provider-panel-head">
            <b>Providerlar</b>
            <span>${providers.length} sağlayıcı</span>
          </div>
          ${providerQuickButtonsHtml(providers, s.provider)}
        </div>
      </div>

      <div class="card rapid-api-card">
        <h3>Çekilen Oyunlar</h3>

        <div class="provider-counts">
          ${Object.entries(providerCounts).slice(0,16).map(([p,c]) => `
            <span>${p}: <b>${c}</b></span>
          `).join("")}
        </div>

        ${games.length ? `
          <div class="api-game-list">
            ${games.slice(0,120).map(betApiPublicGameCard).join("")}
          </div>
        ` : `
          <div class="empty-coupon">
            <b>Henüz oyun çekilmedi</b>
            <span>Providerları çekip Pragmatic, Evolution, Jili gibi sağlayıcıları yükle.</span>
          </div>
        `}
      </div>
    </section>
  `);
};

// BET API PUBLIC GAME DESIGN UPGRADE
var betGameSearchText = "";
var betGameProviderFilter = "all";

function bbGameSafeText(value){
  return String(value || "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function setBetGameProviderFilter(provider){
  betGameProviderFilter = provider || "all";

  const currentTitle = document.querySelector(".bet-games-page-title")?.textContent || "Casino Oyunları";
  renderBetApiGamesPublic(currentTitle, "");
}

function searchBetGames(){
  betGameSearchText = document.getElementById("betGameSearchInput")?.value?.trim() || "";

  const currentTitle = document.querySelector(".bet-games-page-title")?.textContent || "Casino Oyunları";
  renderBetApiGamesPublic(currentTitle, "");
}

function clearBetGameSearch(){
  betGameSearchText = "";
  betGameProviderFilter = "all";

  const currentTitle = document.querySelector(".bet-games-page-title")?.textContent || "Casino Oyunları";
  renderBetApiGamesPublic(currentTitle, "");
}

function getBetGameProvidersFromGames(games){
  return [...new Set(
    games
      .map(g => g.provider || "Provider")
      .filter(Boolean)
  )].sort();
}

function getFilteredBetGames(title, filter){
  let games = typeof getBetApiGames === "function" ? getBetApiGames() : [];

  const q = String(betGameSearchText || "").toLowerCase();
  const provider = String(betGameProviderFilter || "all").toLowerCase();
  const pageFilter = String(filter || "").toLowerCase();

  return games.filter(g => {
    const full = `${g.title || ""} ${g.provider || ""} ${g.category || ""}`.toLowerCase();

    const searchOk = !q || full.includes(q);
    const providerOk = provider === "all" || String(g.provider || "").toLowerCase() === provider;

    let pageOk = true;

    if(pageFilter){
      pageOk = full.includes(pageFilter);
    }

    // Eğer casino/slot filtresi çok dar kalırsa tüm oyunlar görünsün diye gevşek bırakıyoruz
    if(title && String(title).toLowerCase().includes("casino")){
      pageOk = true;
    }

    if(title && String(title).toLowerCase().includes("slot")){
      pageOk = full.includes("slot") || full.includes("casino") || true;
    }

    return searchOk && providerOk && pageOk;
  });
}

function betApiPremiumGameCard(g, index){
  const title = bbGameSafeText(g.title || "Oyun");
  const provider = bbGameSafeText(g.provider || "Provider");
  const category = bbGameSafeText(g.category || "Casino");
  const img = String(g.image || "").trim();

  return `
    <div class="premium-game-card" style="--delay:${Math.min(index, 12) * .035}s">
      <div class="premium-game-image">
        ${img ? `<img src="${img}" alt="${title}" loading="lazy" onerror="this.remove(); this.closest('.premium-game-image').classList.add('no-img')">` : ""}
        <div class="premium-game-fallback"><img src="assets/mobile/icons/slot-icon.png" alt="" aria-hidden="true"></div>

        <div class="premium-game-provider">${provider}</div>

        <button class="premium-game-play-overlay" onclick="launchBetApiGame('${g.gameId}')">
          Oyna
        </button>
      </div>

      <div class="premium-game-content">
        <b>${title}</b>

        <div class="premium-game-meta">
          <span>${category}</span>
          <em>Aktif</em>
        </div>

        <button onclick="launchBetApiGame('${g.gameId}')">
          Hemen Oyna
        </button>
      </div>
    </div>
  `;
}

function renderBetApiGamesPublic(title, filter){
  const allGames = typeof getBetApiGames === "function" ? getBetApiGames() : [];
  const games = getFilteredBetGames(title, filter);
  const providers = getBetGameProvidersFromGames(allGames);

  document.getElementById("app").innerHTML = shell(`
    <section class="bet-games-hero">
      <div>
        <span>OYUNLAR</span>
        <h1 class="bet-games-page-title">${title}</h1>
        <p>Popüler sağlayıcıların oyunlarını tek ekranda keşfet.</p>
      </div>

      <div class="bet-games-hero-card">
        <small>Aktif Oyun</small>
        <b>${allGames.length}</b>
        <span>${providers.length} sağlayıcı</span>
      </div>
    </section>

    <section class="bet-games-toolbar-card">
      <div class="bet-games-search">
        <span>🔎</span>
        <input id="betGameSearchInput" value="${bbGameSafeText(betGameSearchText)}" placeholder="Oyun veya sağlayıcı ara">
        <button onclick="searchBetGames()">Ara</button>
        <button onclick="clearBetGameSearch()">Temizle</button>
      </div>

      <div class="bet-provider-tabs">
        <button class="${betGameProviderFilter === "all" ? "active" : ""}" onclick="setBetGameProviderFilter('all')">
          Tümü
        </button>

        ${providers.slice(0,28).map(p => `
          <button class="${betGameProviderFilter === p ? "active" : ""}" onclick="setBetGameProviderFilter('${bbGameSafeText(p)}')">
            ${bbGameSafeText(p)}
          </button>
        `).join("")}
      </div>
    </section>

    ${games.length ? `
      <section class="premium-games-grid">
        ${games.slice(0,240).map(betApiPremiumGameCard).join("")}
      </section>
    ` : `
      <section class="empty-coupon">
        <b>Oyun bulunamadı</b>
        <span>Arama veya sağlayıcı filtresini temizleyip tekrar dene.</span>
      </section>
    `}
  `);
}

// Menü fonksiyonlarını yeni tasarıma bağla
if(typeof renderCasino === "function"){
  renderCasino = function(){
    renderBetApiGamesPublic("Casino Oyunları", "");
  };
}

if(typeof renderSlot === "function"){
  renderSlot = function(){
    renderBetApiGamesPublic("Slot Oyunları", "");
  };
}

if(typeof renderVirtualGames === "function"){
  renderVirtualGames = function(){
    renderBetApiGamesPublic("Sanal Oyunlar", "");
  };
}

// Admin paneldeki oyun önizlemesini de premium tasarıma yaklaştır
function betApiAdminPreviewCard(g){
  const title = bbGameSafeText(g.title || "Oyun");
  const provider = bbGameSafeText(g.provider || "Provider");
  const img = String(g.image || "").trim();

  return `
    <div class="admin-game-preview-card">
      <div>
        ${img ? `<img src="${img}" alt="${title}" loading="lazy">` : `<span>🎰</span>`}
      </div>

      <b>${title}</b>
      <small>${provider}</small>
    </div>
  `;
}

// HOME POPULAR GAMES FIX - KEEP CARD, REPLACE CONTENT
function bbFindGameByNames(names){
  const games = typeof getBetApiGames === "function" ? getBetApiGames() : [];

  const lowerNames = names.map(x => String(x).toLowerCase());

  return games.find(g => {
    const title = String(g.title || "").toLowerCase();
    return lowerNames.some(n => title.includes(n));
  }) || null;
}

function bbHomePopularGameData(){
  return [
    {
      title:"GATES OF OLYMPUS",
      emoji:"🦁",
      names:["gates of olympus", "olympus"]
    },
    {
      title:"SWEET BONANZA",
      emoji:"🍬",
      names:["sweet bonanza", "bonanza"]
    },
    {
      title:"BIG BASS",
      emoji:"🎣",
      names:["big bass", "bass bonanza", "big bass bonanza"]
    },
    {
      title:"SUGAR RUSH",
      emoji:"🍭",
      names:["sugar rush"]
    },
    {
      title:"AVIATOR",
      emoji:"✈️",
      names:["aviator"]
    }
  ].map(item => {
    const apiGame = bbFindGameByNames(item.names);

    return {
      ...item,
      gameId:apiGame?.gameId || "",
      image:apiGame?.image || "",
      provider:apiGame?.provider || ""
    };
  });
}

function bbHomePopularGameCardHtml(g){
  return `
    <button class="bb-home-popular-game-card" onclick="${g.gameId ? `launchBetApiGame('${g.gameId}')` : `renderCasino()`}">
      <div class="bb-home-popular-game-art">
        ${g.image ? `<img src="${g.image}" alt="${g.title}" onerror="this.remove()">` : ""}
        <span>${g.emoji}</span>
      </div>

      <b>${g.title}</b>
    </button>
  `;
}

function bbReplaceHomePopularGames(){
  const app = document.getElementById("app");
  if(!app) return;
  if(app.querySelector(".bb-mobile-home-content")) return;

  const headings = [...app.querySelectorAll("h1,h2,h3,b,strong,div,span")];

  const title = headings.find(el => {
    const text = String(el.textContent || "").trim().toLowerCase();
    return text === "popüler oyunlar" || text.includes("popüler oyunlar");
  });

  if(!title) return;

  const card =
    title.closest(".card") ||
    title.closest("section") ||
    title.parentElement?.parentElement;

  if(!card) return;

  if(card.querySelector(".bb-home-popular-games-fixed")) return;

  const header =
    title.closest(".card-head") ||
    title.parentElement;

  [...card.children].forEach(child => {
    if(child !== header){
      child.remove();
    }
  });

  card.insertAdjacentHTML("beforeend", `
    <div class="bb-home-popular-games-fixed">
      ${bbHomePopularGameData().map(bbHomePopularGameCardHtml).join("")}
    </div>
  `);
}

if(typeof renderHome === "function"){
  const oldRenderHomePopularGamesFix = renderHome;

  renderHome = function(){
    oldRenderHomePopularGamesFix();

    setTimeout(bbReplaceHomePopularGames, 120);
    setTimeout(bbReplaceHomePopularGames, 400);
  };
}

window.addEventListener("load", () => {
  setTimeout(bbReplaceHomePopularGames, 700);
});

document.addEventListener("click", () => {
  setTimeout(bbReplaceHomePopularGames, 250);
});

// MOBILE LOGIN + HOME POPULAR FIX FOR PUBLISHED SITE
function bbNotifyLoginRequired(){
  if(typeof toast === "function"){
    toast("Lütfen hesabınıza giriş yapın.");
  }else{
    alert("Lütfen hesabınıza giriş yapın.");
  }

  if(typeof loginModal === "function"){
    setTimeout(loginModal, 150);
  }
}

function bbOpenRegisterSafe(e){
  if(e && typeof e.preventDefault === "function") e.preventDefault();
  if(e && typeof e.stopPropagation === "function") e.stopPropagation();

  if(typeof registerModal === "function"){
    registerModal();
    return false;
  }

  if(typeof openRegister === "function"){
    openRegister();
    return false;
  }

  alert("Üyelik ekranı bulunamadı.");
  return false;
}

function bbOpenLoginSafe(e){
  if(e && typeof e.preventDefault === "function") e.preventDefault();
  if(e && typeof e.stopPropagation === "function") e.stopPropagation();

  if(typeof loginModal === "function"){
    loginModal();
    return false;
  }

  alert("Giriş ekranı bulunamadı.");
  return false;
}

const BB_HOME_POPULAR_STATIC = [
  {
    title:"SWEET BONANZA",
    emoji:"🍬",
    image:"assets/mobile/promos/welcome-bonus.png",
    names:["sweet bonanza","bonanza"]
  },
  {
    title:"GATES OF OLYMPUS",
    emoji:"⚡",
    image:"assets/galaxybet/banners/banner-01.png?v=2",
    names:["gates of olympus","olympus"]
  },
  {
    title:"BIG BASS",
    emoji:"🎣",
    image:"assets/galaxybet/banners/banner-02.png?v=2",
    names:["big bass","bass bonanza","big bass bonanza"]
  },
  {
    title:"SUGAR RUSH",
    emoji:"🍭",
    image:"assets/mobile/promos/freespin.png",
    names:["sugar rush"]
  },
  {
    title:"AVIATOR",
    emoji:"✈️",
    image:"assets/galaxybet/banners/banner-03.png?v=2",
    names:["aviator"]
  }
];

function bbFindGameByNamesSafe(names){
  const games = typeof getBetApiGames === "function" ? getBetApiGames() : [];
  const lowerNames = names.map(x => String(x).toLowerCase());

  return games.find(g => {
    const title = String(g.title || "").toLowerCase();
    return lowerNames.some(n => title.includes(n));
  }) || null;
}

function bbLaunchHomePopularGame(index){
  const item = BB_HOME_POPULAR_STATIC[index];
  if(!item) return;

  if(!user){
    bbNotifyLoginRequired();
    return;
  }

  const apiGame = bbFindGameByNamesSafe(item.names);

  if(apiGame && apiGame.gameId && typeof launchBetApiGame === "function"){
    launchBetApiGame(apiGame.gameId);
    return;
  }

  if(typeof renderCasino === "function"){
    renderCasino();
    setTimeout(() => {
      const input = document.getElementById("betGameSearchInput");
      if(input){
        input.value = item.title;
        if(typeof searchBetGames === "function") searchBetGames();
      }
    }, 250);
    return;
  }

  alert("Oyun şu an hazırlanıyor.");
}

function bbHomePopularGameCardStaticHtml(g, index){
  return `
    <button class="bb-home-popular-game-card bb-home-popular-static" onclick="bbLaunchHomePopularGame(${index})">
      <div class="bb-home-popular-game-art">
        <img src="${g.image}" alt="${g.title}" loading="lazy" onerror="this.style.display='none'">
        <span>${g.emoji}</span>
      </div>
      <b>${g.title}</b>
      <small>Hemen Oyna</small>
    </button>
  `;
}

function bbReplaceHomePopularGamesPublished(){
  const app = document.getElementById("app");
  if(!app) return;
  if(app.querySelector(".bb-mobile-home-content")) return;

  const headings = [...app.querySelectorAll("h1,h2,h3,b,strong,div,span")];

  const title = headings.find(el => {
    const text = String(el.textContent || "").trim().toLowerCase();
    return text === "popüler oyunlar" || text.includes("popüler oyunlar");
  });

  if(!title) return;

  const card =
    title.closest(".card") ||
    title.closest("section") ||
    title.parentElement?.parentElement;

  if(!card) return;

  const old = card.querySelector(".bb-home-popular-games-fixed");
  if(old) old.remove();

  const header =
    title.closest(".card-head") ||
    title.parentElement;

  [...card.children].forEach(child => {
    if(child !== header){
      child.remove();
    }
  });

  card.insertAdjacentHTML("beforeend", `
    <div class="mobile-popular-heading">
      <b>POPÜLER OYUNLAR</b>
      <button type="button" onclick="renderCasino()">Tümünü Gör</button>
    </div>
    <div class="bb-home-popular-games-fixed bb-home-popular-published">
      ${BB_HOME_POPULAR_STATIC.map(bbHomePopularGameCardStaticHtml).join("")}
    </div>
  `);
}

function bbForceMobileAuthButtons(){
  document.querySelectorAll(".bb-mobile-auth-actions").forEach(node => node.remove());
}

function bbGuardGameClicksForGuests(){
  document.addEventListener("click", function(e){
    const btn = e.target.closest("button,a");
    if(!btn) return;

    const text = String(btn.textContent || "").trim().toLowerCase();
    const onclick = String(btn.getAttribute("onclick") || "").toLowerCase();

    const isGameAction =
      text.includes("oyna") ||
      onclick.includes("launchbetapigame") ||
      onclick.includes("bblaunchhomepopulargame");

    if(isGameAction && !user){
      e.preventDefault();
      e.stopPropagation();
      bbNotifyLoginRequired();
      return false;
    }
  }, true);
}

function bbAfterEveryRenderFix(){
  setTimeout(bbReplaceHomePopularGamesPublished, 120);
  setTimeout(bbForceMobileAuthButtons, 150);
  setTimeout(bbReplaceHomePopularGamesPublished, 500);
  setTimeout(bbForceMobileAuthButtons, 500);
}

if(typeof renderHome === "function"){
  const oldRenderHomeMobilePublishedFix = renderHome;
  renderHome = function(){
    oldRenderHomeMobilePublishedFix();
    bbAfterEveryRenderFix();
  };
}

window.addEventListener("load", () => {
  bbAfterEveryRenderFix();
  bbGuardGameClicksForGuests();
});

document.addEventListener("click", () => {
  setTimeout(bbForceMobileAuthButtons, 150);
});

// CACHEFIX MOBILE HARD PATCH
function bbHardMobileLoginBar(){
  document.querySelectorAll(".bb-hard-mobile-login-bar").forEach(node => node.remove());
}

function bbForceGuestGameWarning(){
  document.addEventListener("click", function(e){
    const target = e.target.closest("button,a,.bb-home-popular-game-card,.premium-game-card");
    if(!target) return;

    const text = String(target.textContent || "").toLowerCase();
    const click = String(target.getAttribute("onclick") || "").toLowerCase();

    const isGame =
      text.includes("oyna") ||
      click.includes("launchbetapigame") ||
      click.includes("bblaunchhomepopulargame") ||
      target.classList.contains("bb-home-popular-game-card") ||
      target.classList.contains("premium-game-card");

    if(isGame && !user){
      e.preventDefault();
      e.stopImmediatePropagation();

      alert("Lütfen hesabınıza giriş yapın.");

      setTimeout(() => {
        if(typeof loginModal === "function") loginModal();
      }, 150);

      return false;
    }
  }, true);
}

function bbHardFixHomePopular(){
  setTimeout(() => {
    if(typeof bbReplaceHomePopularGamesPublished === "function"){
      bbReplaceHomePopularGamesPublished();
    }
  }, 200);

  setTimeout(() => {
    if(typeof bbReplaceHomePopularGamesPublished === "function"){
      bbReplaceHomePopularGamesPublished();
    }
  }, 800);
}

window.addEventListener("load", () => {
  bbHardMobileLoginBar();
  bbHardFixHomePopular();

  if(!window.__bbGuestGameWarningInstalled){
    window.__bbGuestGameWarningInstalled = true;
    bbForceGuestGameWarning();
  }
});

setInterval(() => {
  bbHardMobileLoginBar();
}, 1500);

// PUBLIC MOBILE CATALOG FINAL FIX
const BB_PUBLIC_GAMES = [
  {
    title:"Sweet Bonanza",
    provider:"Pragmatic Play",
    category:"Slot",
    emoji:"🍬",
    image:"assets/mobile/promos/welcome-bonus.png",
    keywords:["sweet","bonanza"]
  },
  {
    title:"Gates of Olympus",
    provider:"Pragmatic Play",
    category:"Slot",
    emoji:"⚡",
    image:"assets/galaxybet/banners/banner-01.png?v=2",
    keywords:["gates","olympus"]
  },
  {
    title:"Big Bass Bonanza",
    provider:"Pragmatic Play",
    category:"Slot",
    emoji:"🎣",
    image:"assets/galaxybet/banners/banner-02.png?v=2",
    keywords:["big","bass","bonanza"]
  },
  {
    title:"Sugar Rush",
    provider:"Pragmatic Play",
    category:"Slot",
    emoji:"🍭",
    image:"assets/mobile/promos/freespin.png",
    keywords:["sugar","rush"]
  },
  {
    title:"Aviator",
    provider:"Spribe",
    category:"Crash",
    emoji:"✈️",
    image:"assets/galaxybet/banners/banner-03.png?v=2",
    keywords:["aviator"]
  },
  {
    title:"Mines",
    provider:"Spribe",
    category:"Crash",
    emoji:"💣",
    image:"assets/mobile/icons/casino-icon.png",
    keywords:["mines"]
  },
  {
    title:"Plinko",
    provider:"Spribe",
    category:"Arcade",
    emoji:"🔴",
    image:"assets/mobile/icons/slot-icon.png",
    keywords:["plinko"]
  },
  {
    title:"Crazy Time",
    provider:"Evolution",
    category:"Live Casino",
    emoji:"🎡",
    image:"assets/mobile/dealers/dealer-live-casino-1.png",
    keywords:["crazy","time"]
  },
  {
    title:"Lightning Roulette",
    provider:"Evolution",
    category:"Live Casino",
    emoji:"⚡",
    image:"assets/mobile/dealers/dealer-live-casino-2.png",
    keywords:["lightning","roulette"]
  },
  {
    title:"Mega Wheel",
    provider:"Pragmatic Play",
    category:"Live Casino",
    emoji:"🎯",
    image:"assets/galaxybet/banners/banner-05.png?v=2",
    keywords:["mega","wheel"]
  },
  {
    title:"Book of Dead",
    provider:"Play'n GO",
    category:"Slot",
    emoji:"📕",
    image:"assets/mobile/dealers/dealer-cards.png",
    keywords:["book","dead"]
  },
  {
    title:"The Dog House",
    provider:"Pragmatic Play",
    category:"Slot",
    emoji:"🐶",
    image:"assets/mobile/promos/bonus-campaign.png",
    keywords:["dog","house"]
  }
];

function bbGetAllPublicGames(){
  const apiGames = typeof getBetApiGames === "function" ? getBetApiGames() : [];
  const cleanApi = Array.isArray(apiGames) ? apiGames.filter(g => g && g.title) : [];

  const mappedPublic = BB_PUBLIC_GAMES.map((g,i) => ({
    id:"public_game_" + i,
    gameId:"",
    title:g.title,
    provider:g.provider,
    category:g.category,
    emoji:g.emoji,
    image:g.image,
    publicOnly:true
  }));

  if(cleanApi.length){
    const merged = [...cleanApi];

    mappedPublic.forEach(pg => {
      const exists = merged.some(g => String(g.title || "").toLowerCase().includes(pg.title.toLowerCase().split(" ")[0]));
      if(!exists) merged.push(pg);
    });

    return merged;
  }

  return mappedPublic;
}

function bbLoginWarningFinal(){
  alert("Lütfen hesabınıza giriş yapın.");

  setTimeout(() => {
    if(typeof loginModal === "function") loginModal();
  }, 120);
}

function bbPlayPublicGameFinal(gameTitle){
  if(!user){
    bbLoginWarningFinal();
    return;
  }

  const all = bbGetAllPublicGames();

  const found = all.find(g => String(g.title || "").toLowerCase() === String(gameTitle || "").toLowerCase());

  if(found && found.gameId && typeof launchBetApiGame === "function"){
    launchBetApiGame(found.gameId);
    return;
  }

  alert(gameTitle + " açılıyor.");
}

function bbPublicGameImageHtml(g){
  const img = String(g.image || "");

  if(img.startsWith("linear-gradient")){
    return `
      <div class="bb-public-game-art-gradient" style="background:${img}">
        <span>${g.emoji || "🎰"}</span>
      </div>
    `;
  }

  if(img){
    return `
      <div class="bb-public-game-art-gradient">
        <img src="${img}" alt="">
        <span>${g.emoji || "🎰"}</span>
      </div>
    `;
  }

  return `
    <div class="bb-public-game-art-gradient">
      <span>${g.emoji || "🎰"}</span>
    </div>
  `;
}

function bbPublicGameCardHtml(g){
  const title = String(g.title || "Oyun").replaceAll("'","&#039;");
  const provider = String(g.provider || "Provider");
  const category = String(g.category || "Casino");

  return `
    <button class="bb-public-game-card-final" onclick="bbPlayPublicGameFinal('${title}')">
      ${bbPublicGameImageHtml(g)}

      <div class="bb-public-game-card-info">
        <b>${title}</b>
        <span>${provider}</span>
        <em>${category}</em>
      </div>

      <strong>Oyna</strong>
    </button>
  `;
}

function bbRenderPublicCasinoFinal(title){
  const games = bbGetAllPublicGames();

  document.getElementById("app").innerHTML = shell(`
    <section class="bb-mobile-casino-hero-final">
      <div>
        <span>OYUNLAR</span>
        <h1>${title}</h1>
        <p>Popüler slot, casino ve crash oyunları.</p>
      </div>
    </section>

    <section class="bb-public-provider-row">
      <button>Pragmatic Play</button>
      <button>Spribe</button>
      <button>Evolution</button>
      <button>Play'n GO</button>
    </section>

    <section class="bb-public-games-grid-final">
      ${games.map(bbPublicGameCardHtml).join("")}
    </section>
  `);

  bbHardMobileLoginBarFinal();
}

function bbRenderHomePopularFinal(){
  const app = document.getElementById("app");
  if(!app) return;
  if(app.querySelector(".bb-mobile-home-content")) return;

  const headings = [...app.querySelectorAll("h1,h2,h3,b,strong,span,div")];

  const title = headings.find(el => {
    const t = String(el.textContent || "").trim().toLowerCase();
    return t === "popüler oyunlar" || t.includes("popüler oyunlar");
  });

  if(!title) return;

  const card =
    title.closest(".card") ||
    title.closest("section") ||
    title.parentElement?.parentElement;

  if(!card) return;

  const header = title.closest(".card-head") || title.parentElement;

  [...card.children].forEach(child => {
    if(child !== header) child.remove();
  });

  const top5 = BB_PUBLIC_GAMES.slice(0,5);

  card.insertAdjacentHTML("beforeend", `
    <div class="bb-home-popular-final-grid">
      ${top5.map(bbPublicGameCardHtml).join("")}
    </div>
  `);
}

function bbHardMobileLoginBarFinal(){
  document.querySelectorAll(".bb-hard-mobile-login-bar-final").forEach(x => x.remove());
}

function bbGlobalGuestGuardFinal(){
  if(window.__bbGlobalGuestGuardFinal) return;
  window.__bbGlobalGuestGuardFinal = true;

  document.addEventListener("click", function(e){
    const el = e.target.closest("button,a,.bb-public-game-card-final,.bb-home-popular-game-card,.premium-game-card");
    if(!el) return;

    const text = String(el.textContent || "").toLowerCase();
    const onclick = String(el.getAttribute("onclick") || "").toLowerCase();

    const gameClick =
      text.includes("oyna") ||
      onclick.includes("launchbetapigame") ||
      onclick.includes("bbplaypublicgamefinal") ||
      el.classList.contains("bb-public-game-card-final") ||
      el.classList.contains("premium-game-card");

    if(gameClick && !user){
      e.preventDefault();
      e.stopImmediatePropagation();
      bbLoginWarningFinal();
      return false;
    }
  }, true);
}

if(typeof renderHome === "function"){
  const oldRenderHomePublicMobileFinal = renderHome;

  renderHome = function(){
    oldRenderHomePublicMobileFinal();

    setTimeout(bbRenderHomePopularFinal, 80);
    setTimeout(bbRenderHomePopularFinal, 350);
    setTimeout(bbHardMobileLoginBarFinal, 150);
  };
}

renderCasino = function(){
  bbRenderPublicCasinoFinal("Casino Oyunları");
};

renderSlot = function(){
  bbRenderPublicCasinoFinal("Slot Oyunları");
};

renderVirtualGames = function(){
  bbRenderPublicCasinoFinal("Sanal Oyunlar");
};

window.addEventListener("load", () => {
  setTimeout(bbRenderHomePopularFinal, 300);
  setTimeout(bbHardMobileLoginBarFinal, 300);
  bbGlobalGuestGuardFinal();
});

document.addEventListener("click", () => {
  setTimeout(bbHardMobileLoginBarFinal, 200);
});

// GAMES CATALOG + MOBILE/DESKTOP SHARED FIX
function bbCatalogFallbackGames(){
  return [
    {id:"fallback_sweet",gameId:"",title:"Sweet Bonanza",provider:"Pragmatic Play",category:"Slot",image:"assets/mobile/promos/welcome-bonus.png"},
    {id:"fallback_gates",gameId:"",title:"Gates of Olympus",provider:"Pragmatic Play",category:"Slot",image:"assets/galaxybet/banners/banner-01.png?v=2"},
    {id:"fallback_bigbass",gameId:"",title:"Big Bass Bonanza",provider:"Pragmatic Play",category:"Slot",image:"assets/galaxybet/banners/banner-02.png?v=2"},
    {id:"fallback_sugar",gameId:"",title:"Sugar Rush",provider:"Pragmatic Play",category:"Slot",image:"assets/mobile/promos/freespin.png"},
    {id:"fallback_aviator",gameId:"",title:"Aviator",provider:"Spribe",category:"Crash",image:"assets/galaxybet/banners/banner-03.png?v=2"},
    {id:"fallback_mines",gameId:"",title:"Mines",provider:"Spribe",category:"Crash",image:"assets/mobile/icons/casino-icon.png"},
    {id:"fallback_plinko",gameId:"",title:"Plinko",provider:"Spribe",category:"Arcade",image:"assets/mobile/icons/slot-icon.png"},
    {id:"fallback_crazy",gameId:"",title:"Crazy Time",provider:"Evolution",category:"Live Casino",image:"assets/mobile/dealers/dealer-live-casino-1.png"},
    {id:"fallback_roulette",gameId:"",title:"Lightning Roulette",provider:"Evolution",category:"Live Casino",image:"assets/mobile/dealers/dealer-live-casino-2.png"},
    {id:"fallback_blackjack",gameId:"",title:"Blackjack",provider:"Evolution",category:"Live Casino",image:"assets/mobile/dealers/dealer-cards.png"}
  ];
}

function bbGetPublishedGames(){
  const catalog = Array.isArray(window.BOZOBET_GAME_CATALOG) ? window.BOZOBET_GAME_CATALOG : [];
  const local = typeof getBetApiGames === "function" ? getBetApiGames() : [];

  if(catalog.length) return catalog;
  if(Array.isArray(local) && local.length) return local;

  return bbCatalogFallbackGames();
}

getBetApiGames = function(){
  return bbGetPublishedGames();
};

function bbActiveCouponCount(){
  if(!user) return 0;

  const all =
    JSON.parse(localStorage.getItem("bozobet_bets") || "[]")
    .concat(JSON.parse(localStorage.getItem("bozobet_coupons") || "[]"));

  return all.filter(b => {
    const sameUser =
      String(b.userId || b.username || "") === String(user.id || user.username || "") ||
      String(b.user || "") === String(user.username || "");

    const active =
      ["active","pending","open","waiting","bekliyor"].includes(String(b.status || "").toLowerCase());

    return sameUser && active;
  }).length;
}

function bbCouponBadgeHtml(){
  const n = bbActiveCouponCount();
  return `<span class="bb-mobile-coupon-badge">${n}</span>`;
}

function bbMobileMenuFinal(){
  document.querySelectorAll(".bb-bottom-nav-final").forEach(x => x.remove());
  if(document.querySelector(".bb-bottom-nav-real")) return;

  const nav = document.createElement("nav");
  nav.className = "bb-bottom-nav-final";
  nav.innerHTML = `
    <button onclick="renderHome && renderHome()">
      <span class="bb-nav-ico home">⌂</span>
      <b>Ana Sayfa</b>
    </button>
    <button onclick="renderSports && renderSports()">
      <span class="bb-nav-ico sport">⚽</span>
      <b>Spor</b>
    </button>
    <button onclick="renderCasino && renderCasino()">
      <span class="bb-nav-ico casino">▣</span>
      <b>Casino</b>
    </button>
    <button class="coupon" onclick="renderCoupon && renderCoupon()">
      <span class="bb-nav-ico coupon">▤</span>
      ${bbCouponBadgeHtml()}
      <b>Kupon</b>
    </button>
    <button onclick="user ? (renderProfile && renderProfile()) : (loginModal && loginModal())">
      <span class="bb-nav-ico account">●</span>
      <b>Hesabım</b>
    </button>
  `;
  document.body.appendChild(nav);
}

function bbRenderGamesShared(title){
  const games = bbGetPublishedGames();

  document.getElementById("app").innerHTML = shell(`
    <section class="bet-games-hero">
      <div>
        <span>OYUNLAR</span>
        <h1>${title}</h1>
        <p>Popüler sağlayıcıların oyunları.</p>
      </div>
      <div class="bet-games-hero-card">
        <small>Aktif Oyun</small>
        <b>${games.length}</b>
        <span>Casino & Slot</span>
      </div>
    </section>

    <section class="premium-games-grid">
      ${games.slice(0,240).map((g,i) => {
        const safeTitle = String(g.title || "Oyun").replaceAll("'","&#039;");
        const img = g.image || "";
        return `
          <div class="premium-game-card">
            <div class="premium-game-image">
              ${img ? `<img src="${img}" loading="lazy" onerror="this.remove()">` : `<div class="premium-game-fallback"><img src="assets/mobile/icons/slot-icon.png" alt="" aria-hidden="true"></div>`}
              <div class="premium-game-provider">${g.provider || "Provider"}</div>
              <button class="premium-game-play-overlay" onclick="bbPlayPublishedGame('${safeTitle}')">Oyna</button>
            </div>
            <div class="premium-game-content">
              <b>${g.title || "Oyun"}</b>
              <div class="premium-game-meta">
                <span>${g.category || "Casino"}</span>
                <em>Aktif</em>
              </div>
              <button onclick="bbPlayPublishedGame('${safeTitle}')">Hemen Oyna</button>
            </div>
          </div>
        `;
      }).join("")}
    </section>
  `);

  bbMobileMenuFinal();
}

function bbPlayPublishedGame(title){
  if(!user){
    alert("Lütfen hesabınıza giriş yapın.");
    if(typeof loginModal === "function") setTimeout(loginModal, 150);
    return;
  }

  const g = bbGetPublishedGames().find(x => String(x.title || "").toLowerCase() === String(title || "").toLowerCase());

  if(g && g.gameId && typeof launchBetApiGame === "function"){
    launchBetApiGame(g.gameId);
    return;
  }

  alert("Oyun açılıyor: " + title);
}

renderCasino = function(){ bbRenderGamesShared("Casino Oyunları"); };
renderSlot = function(){ bbRenderGamesShared("Slot Oyunları"); };
renderVirtualGames = function(){ bbRenderGamesShared("Sanal Oyunlar"); };

window.addEventListener("load", () => {
  setTimeout(bbMobileMenuFinal, 300);
  setTimeout(bbMobileMenuFinal, 1200);
});

document.addEventListener("click", () => {
  setTimeout(bbMobileMenuFinal, 250);
});


// FORCE PUBLISHED GAMES + MOBILE FIX V1
(function(){
  function esc(v){
    return String(v || "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function getCatalogGames(){
    var catalog = Array.isArray(window.BOZOBET_GAME_CATALOG) ? window.BOZOBET_GAME_CATALOG : [];
    var local = [];

    try{
      local = JSON.parse(localStorage.getItem("bozobet_bet_api_games") || "[]");
    }catch(e){
      local = [];
    }

    if(local && local.length){
      var merged = local.slice();

      catalog.forEach(function(c){
        var exists = merged.some(function(g){
          return String(g.title || "").toLowerCase() === String(c.title || "").toLowerCase();
        });

        if(!exists) merged.push(c);
      });

      return merged;
    }

    return catalog;
  }

  window.bbGetCatalogGames = getCatalogGames;

  try{
    getBetApiGames = function(){
      return getCatalogGames();
    };
  }catch(e){}

  function requireLogin(){
    try{
      if(!user){
        alert("Lütfen hesabınıza giriş yapın.");
        if(typeof loginModal === "function"){
          setTimeout(loginModal, 150);
        }
        return false;
      }
    }catch(e){
      alert("Lütfen hesabınıza giriş yapın.");
      return false;
    }

    return true;
  }

  window.bbRequireLogin = requireLogin;

  window.bbPlayCatalogGame = function(title){
    if(!requireLogin()) return;

    var games = getCatalogGames();
    var game = games.find(function(g){
      return String(g.title || "").toLowerCase() === String(title || "").toLowerCase();
    });

    if(game && game.gameId && typeof launchBetApiGame === "function"){
      launchBetApiGame(game.gameId);
      return;
    }

    alert(title + " açılıyor.");
  };

  function gameCard(g){
    var title = esc(g.title || "Oyun");
    var provider = esc(g.provider || "Provider");
    var category = esc(g.category || "Casino");
    var emoji = esc(g.emoji || "🎰");
    var bg = g.bg || "linear-gradient(135deg,#10251b,#0b0f12)";

    var imagePart = g.image
      ? '<img src="' + esc(g.image) + '" loading="lazy" onerror="this.remove()">'
      : '<div class="bb-catalog-game-gradient" style="background:' + esc(bg) + '"><span>' + emoji + '</span></div>';

    return ''
      + '<div class="bb-catalog-game-card">'
      +   '<div class="bb-catalog-game-media">'
      +     imagePart
      +     '<small>' + provider + '</small>'
      +   '</div>'
      +   '<div class="bb-catalog-game-info">'
      +     '<b>' + title + '</b>'
      +     '<em>' + category + '</em>'
      +     '<button onclick="bbPlayCatalogGame(\'' + title + '\')">Hemen Oyna</button>'
      +   '</div>'
      + '</div>';
  }

  function renderGamesPage(title){
    var games = getCatalogGames();

    document.getElementById("app").innerHTML = shell(''
      + '<section class="bb-games-mobile-hero">'
      +   '<div>'
      +     '<span>OYUNLAR</span>'
      +     '<h1>' + esc(title) + '</h1>'
      +     '<p>Popüler slot, casino ve canlı oyunlar.</p>'
      +   '</div>'
      +   '<strong>' + games.length + '</strong>'
      + '</section>'
      + '<section class="bb-games-provider-tabs">'
      +   '<button>Pragmatic Play</button><button>Spribe</button><button>Evolution</button><button>Casino</button>'
      + '</section>'
      + '<section class="bb-catalog-games-grid">'
      +   games.map(gameCard).join("")
      + '</section>'
    );

    renderBottomNav();
  }

  window.bbRenderGamesPage = renderGamesPage;

  try{ renderCasino = function(){ renderGamesPage("Casino Oyunları"); }; }catch(e){}
  try{ renderSlot = function(){ renderGamesPage("Slot Oyunları"); }; }catch(e){}
  try{ renderVirtualGames = function(){ renderGamesPage("Sanal Oyunlar"); }; }catch(e){}

  function activeCouponCount(){
    try{
      if(!user) return 0;

      var bets = JSON.parse(localStorage.getItem("bozobet_bets") || "[]");
      var coupons = JSON.parse(localStorage.getItem("bozobet_coupons") || "[]");
      var all = bets.concat(coupons);

      return all.filter(function(b){
        var st = String(b.status || "").toLowerCase();
        var active = ["active","pending","open","waiting","bekliyor"].includes(st);
        if(!active) return false;

        var uid = String(b.userId || b.username || b.user || "");
        return uid === String(user.id || "") || uid === String(user.username || "");
      }).length;
    }catch(e){
      return 0;
    }
  }

  function renderBottomNav(){
    document.querySelectorAll(".bb-bottom-nav-real,.bb-bottom-nav-final").forEach(function(x){ x.remove(); });

    var nav = document.createElement("nav");
    nav.className = "bb-bottom-nav-real";

    nav.innerHTML = ''
      + '<button data-page="home" onclick="renderHome && renderHome()"><img src="assets/mobile/icons/nav-home-transparent.png" alt=""><b>Ana Sayfa</b></button>'
      + '<button data-page="sports" onclick="renderSports && renderSports()"><img src="assets/mobile/icons/nav-sports-transparent.png" alt=""><b>Spor</b></button>'
      + '<button data-page="casino" onclick="renderCasino && renderCasino()"><img src="assets/mobile/icons/nav-casino-transparent.png" alt=""><b>Casino</b></button>'
      + '<button data-page="coupon" class="coupon" onclick="renderCoupon ? renderCoupon() : alert(\'Kuponunuz boş.\')"><img src="assets/mobile/icons/nav-coupon-transparent.png" alt=""><i>' + activeCouponCount() + '</i><b>Kupon</b></button>'
      + '<button data-page="profile" onclick="user ? (renderProfile && renderProfile()) : (loginModal && loginModal())"><img src="assets/mobile/icons/nav-account-transparent.png" alt=""><b>Hesabım</b></button>';

    document.body.appendChild(nav);
  }

  window.bbRenderBottomNav = renderBottomNav;

  function fixHomePopular(){
    var app = document.getElementById("app");
    if(!app) return;
    if(app.querySelector(".bb-mobile-home-content")) return;

    var found = Array.from(app.querySelectorAll("h1,h2,h3,b,strong,span,div")).find(function(el){
      var t = String(el.textContent || "").trim().toLowerCase();
      return t === "popüler oyunlar" || t.includes("popüler oyunlar");
    });

    if(!found) return;

    var card = found.closest(".card") || found.closest("section") || found.parentElement?.parentElement;
    if(!card) return;

    var header = found.closest(".card-head") || found.parentElement;

    Array.from(card.children).forEach(function(child){
      if(child !== header) child.remove();
    });

    var top = getCatalogGames().slice(0,5);

    card.insertAdjacentHTML("beforeend", ''
      + '<div class="mobile-popular-heading">'
      +   '<b>POPÜLER OYUNLAR</b>'
      +   '<button type="button" onclick="renderCasino()">Tümünü Gör</button>'
      + '</div>'
      + '<div class="bb-home-popular-real">' + top.map(gameCard).join("") + '</div>');
  }

  if(typeof renderHome === "function"){
    var oldHome = renderHome;
    renderHome = function(){
      oldHome();
      setTimeout(fixHomePopular, 100);
      setTimeout(fixHomePopular, 400);
      setTimeout(renderBottomNav, 150);
    };
  }

  document.addEventListener("click", function(e){
    var el = e.target.closest("button,a,.bb-catalog-game-card,.premium-game-card");
    if(!el) return;

    var text = String(el.textContent || "").toLowerCase();
    var click = String(el.getAttribute("onclick") || "").toLowerCase();

    if((text.includes("oyna") || click.includes("launchbetapigame")) && !user){
      e.preventDefault();
      e.stopImmediatePropagation();
      requireLogin();
      return false;
    }
  }, true);

  window.addEventListener("load", function(){
    setTimeout(fixHomePopular, 300);
    setTimeout(renderBottomNav, 350);
    setTimeout(renderBottomNav, 1200);
  });
})();

// GALAXYBET GENERATED MOBILE VISUAL ASSETS V1
(function(){
  const AS='/assets/mobile/';
  const bbAssets={
    banners:[
      'assets/galaxybet/banners/banner-02.png?v=2',
      'assets/galaxybet/banners/banner-03.png?v=2',
      'assets/galaxybet/banners/banner-04.png?v=2',
      'assets/galaxybet/banners/banner-05.png?v=2',
      'assets/galaxybet/banners/banner-01.png?v=2'
    ],
    promos:[['Hoş Geldin Bonusu',AS+'promos/welcome-bonus.png'],['Çevrimsiz Bonus',AS+'promos/no-wager-bonus.png'],['Kayıp Bonusu',AS+'promos/loss-bonus.png'],['Free Spin',AS+'promos/freespin.png'],['Bonus Kampanyası',AS+'promos/bonus-campaign.png'],['Cebinde GalaxyBet',AS+'promos/mobile-pocket.png']],
    dealers:[AS+'dealers/dealer-live-casino-1.png',AS+'dealers/dealer-live-casino-2.png',AS+'dealers/dealer-live-casino-3.png',AS+'dealers/dealer-live-casino-4.png',AS+'dealers/dealer-live-casino-5.png',AS+'dealers/dealer-cards.png'],
    nav:{home:AS+'icons/nav-home-transparent.png',sports:AS+'icons/nav-sports-transparent.png',casino:AS+'icons/nav-casino-transparent.png',coupon:AS+'icons/nav-coupon-transparent.png',account:AS+'icons/nav-account-transparent.png'},
    icons:[['Casino',AS+'icons/casino-icon.png'],['Futbol',AS+'icons/football-icon.png'],['Basketbol',AS+'icons/basketball-icon.png'],['Cüzdan',AS+'icons/wallet-icon.png'],['Hediye',AS+'icons/gift-icon.png'],['VIP',AS+'icons/crown-icon.png'],['Slot',AS+'icons/slot-icon.png']]
  };
  window.BB_GENERATED_MOBILE_ASSETS=bbAssets;
  function img(src,alt){return `<img src="${src}" alt="${alt||''}" loading="lazy" decoding="async">`;}
  function activeCouponCount(){try{if(!user)return 0;const all=[...JSON.parse(localStorage.getItem('bozobet_bets')||'[]'),...JSON.parse(localStorage.getItem('bozobet_coupons')||'[]')];return all.filter(b=>['active','pending','open','waiting','bekliyor'].includes(String(b.status||'').toLowerCase())&&[String(user.id||''),String(user.username||'')].includes(String(b.userId||b.username||b.user||''))).length;}catch(e){return 0;}}
  function injectMobileHomeVisuals(){ /* Removed: superseded by the canonical mobile homepage. */ }
  function renderGeneratedBottomNav(){ document.querySelectorAll('.bb-gen-bottom-nav').forEach(x=>x.remove()); }
  if(typeof renderHome==='function'){const old=renderHome;renderHome=function(){old();setTimeout(injectMobileHomeVisuals,120);setTimeout(renderGeneratedBottomNav,160);};}
  window.addEventListener('load',()=>{setTimeout(injectMobileHomeVisuals,300);setTimeout(renderGeneratedBottomNav,350);});
  document.addEventListener('click',()=>setTimeout(renderGeneratedBottomNav,200));
})();

// Keep every mobile bottom navigation in sync with the page being rendered.
(function(){
  const pageIndexes = { home:0, sports:1, casino:2, coupon:3, profile:4 };
  let activePage = "home";

  function syncBottomNav(){
    const activeIndex = pageIndexes[activePage];
    document.querySelectorAll(
      ".bbf-nav,.bb-clean-nav,.bb-bottom-nav-real,.bb-bottom-nav-final,.bb-gen-bottom-nav"
    ).forEach(nav => {
      Array.from(nav.querySelectorAll(":scope > button")).forEach((button, index) => {
        button.classList.toggle("active", index === activeIndex);
        if(index === activeIndex) button.setAttribute("aria-current", "page");
        else button.removeAttribute("aria-current");
      });
    });
  }

  function setActivePage(page){
    activePage = page;
    window.bbActiveBottomPage = page;
    syncBottomNav();
    requestAnimationFrame(syncBottomNav);
  }

  function wrapRenderer(name, page){
    const original = window[name];
    if(typeof original !== "function" || original.bbTracksBottomNav) return;

    const wrapped = function(){
      setActivePage(page);
      return original.apply(this, arguments);
    };
    wrapped.bbTracksBottomNav = true;
    window[name] = wrapped;
  }

  function installTracking(){
    wrapRenderer("renderHome", "home");
    wrapRenderer("renderSports", "sports");
    wrapRenderer("renderCasino", "casino");
    wrapRenderer("renderCoupon", "coupon");
    wrapRenderer("renderProfile", "profile");
    syncBottomNav();
  }

  new MutationObserver(syncBottomNav).observe(document.body, { childList:true, subtree:true });
  window.addEventListener("load", installTracking);
  installTracking();
})();

// REAL BETNEX GAME LOAD + NO EMOJI CARD FIX V1
(function(){
  const BB_GAME_API_BASE = "/api";

  const BB_MOBILE_IMG = {
    slot:"assets/mobile/icons/slot-icon.png",
    casino:"assets/mobile/icons/casino-icon.png",
    sport:"assets/mobile/icons/football-icon.png",
    live1:"assets/galaxybet/banners/banner-02.png?v=2",
    live2:"assets/galaxybet/banners/banner-03.png?v=2",
    dealer:"assets/mobile/dealers/dealer-live-casino-1.png",
    promo:"assets/mobile/promos/welcome-bonus.png"
  };

  function bbEsc(v){
    return String(v || "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function bbFindArrayDeep(obj){
    if(Array.isArray(obj)) return obj;
    if(!obj || typeof obj !== "object") return [];

    const keys = ["data","games","result","results","items","list","providers"];

    for(const k of keys){
      if(Array.isArray(obj[k])) return obj[k];
      if(obj[k] && typeof obj[k] === "object"){
        const r = bbFindArrayDeep(obj[k]);
        if(r.length) return r;
      }
    }

    for(const v of Object.values(obj)){
      if(Array.isArray(v)) return v;
      if(v && typeof v === "object"){
        const r = bbFindArrayDeep(v);
        if(r.length) return r;
      }
    }

    return [];
  }

  function bbNormalizeGame(g, provider, index){
    const gameId =
      g.gameId ||
      g.game_id ||
      g.id ||
      g.uuid ||
      g.gameCode ||
      g.code ||
      g.slug ||
      "";

    const title =
      g.gameName ||
      g.name ||
      g.title ||
      g.game ||
      g.game_title ||
      `Oyun ${index + 1}`;

    const image =
      g.image ||
      g.img ||
      g.icon ||
      g.thumbnail ||
      g.logo ||
      g.cover ||
      "";

    return {
      id:"betnex_" + provider + "_" + index,
      gameId:String(gameId || ""),
      title:String(title || ""),
      provider:String(provider || g.provider || g.providerName || ""),
      category:String(g.category || g.type || g.gameType || "Casino"),
      image:String(image || "")
    };
  }

  function bbGetStoredBetnexGames(){
    try{
      return JSON.parse(localStorage.getItem("bozobet_live_betnex_games") || "[]");
    }catch(e){
      return [];
    }
  }

  function bbSetStoredBetnexGames(games){
    localStorage.setItem("bozobet_live_betnex_games", JSON.stringify(games || []));
  }

  async function bbFetchProviders(){
    const res = await fetch(`${BB_GAME_API_BASE}/providers`);

    const json = await res.json();
    const list = bbFindArrayDeep(json);

    const providers = list.map(x => {
      if(typeof x === "string") return x;
      return x.provider || x.name || x.title || x.code || x.providerName || x.id || "";
    }).filter(Boolean);

    return [...new Set(providers)];
  }

  async function bbFetchGamesForProvider(provider){
    const res = await fetch(`${BB_GAME_API_BASE}/games?provider=${encodeURIComponent(provider)}`);

    const json = await res.json();
    const list = bbFindArrayDeep(json);

    return list
      .map((g,i) => bbNormalizeGame(g, provider, i))
      .filter(g => g.title && g.gameId);
  }

  async function bbEnsureBetnexGames(){
    const old = bbGetStoredBetnexGames();

    if(old.length && old.some(g => g.gameId)){
      return old;
    }

    let providers = [];

    try{
      providers = await bbFetchProviders();
    }catch(e){
      providers = [];
    }

    if(!providers.length){
      providers = ["SPRIBE","PRAGMATIC PLAY","PRAGMATICPLAY","EVOLUTION","JILI"];
    }

    const all = [];

    for(const provider of providers.slice(0,35)){
      try{
        const games = await bbFetchGamesForProvider(provider);
        all.push(...games);
        await new Promise(r => setTimeout(r, 250));
      }catch(e){
        console.log("Provider alınamadı:", provider, e);
      }
    }

    const map = new Map();

    all.forEach(g => {
      const key = `${g.provider}_${g.gameId}`;
      map.set(key, g);
    });

    const finalGames = [...map.values()];

    if(finalGames.length){
      bbSetStoredBetnexGames(finalGames);
    }

    return finalGames;
  }

  function bbFallbackVisual(g, index){
    const text = `${g.title || ""} ${g.provider || ""} ${g.category || ""}`.toLowerCase();

    if(g.image) return g.image;
    if(text.includes("slot") || text.includes("pragmatic")) return BB_MOBILE_IMG.slot;
    if(text.includes("live") || text.includes("evolution")) return BB_MOBILE_IMG.dealer;
    if(text.includes("spribe") || text.includes("aviator")) return BB_MOBILE_IMG.live2;
    if(index % 4 === 0) return BB_MOBILE_IMG.live1;
    if(index % 4 === 1) return BB_MOBILE_IMG.casino;
    if(index % 4 === 2) return BB_MOBILE_IMG.promo;
    return BB_MOBILE_IMG.slot;
  }

  function bbGetAllGamesNow(){
    const loaded = bbGetStoredBetnexGames();

    if(loaded.length){
      return loaded;
    }

    const catalog = Array.isArray(window.BOZOBET_GAME_CATALOG) ? window.BOZOBET_GAME_CATALOG : [];

    return catalog.map((g,i) => ({
      ...g,
      image:g.image || bbFallbackVisual(g, i)
    }));
  }

  window.getBetApiGames = function(){
    return bbGetAllGamesNow();
  };

  window.launchBetApiGame = async function(gameId){
    if(!user){
      alert("Lütfen hesabınıza giriş yapın.");
      if(typeof loginModal === "function") setTimeout(loginModal, 150);
      return;
    }

    if(!gameId){
      alert("Oyun bağlantısı hazırlanıyor. Birkaç saniye sonra tekrar dene.");
      await bbEnsureBetnexGames();
      return;
    }

    try{
      const username = "bozobet_user_" + (user.username || user.id || Date.now());

      const res = await fetch(`${BB_GAME_API_BASE}/game-url`, {
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          username,
          gameId,
          lang:"tr",
          money:0,
          home_url:location.origin,
          platform:1,
          currency:"INR"
        })
      });

      const json = await res.json();

      const url = json.launchUrl;

      if(!url){
        console.log("Game URL response:", json);
        alert("Oyun linki alınamadı. API cevabını kontrol etmek lazım.");
        return;
      }

      window.open(url, "_blank");
    }catch(e){
      alert("Oyun açılamadı: " + e.message);
    }
  };

  function bbGameCard(g, index){
    const title = bbEsc(g.title || "Oyun");
    const provider = bbEsc(g.provider || "Provider");
    const category = bbEsc(g.category || "Casino");
    const image = bbFallbackVisual(g, index);

    return `
      <div class="bb-real-game-card">
        <div class="bb-real-game-media">
          <img src="${bbEsc(image)}" loading="lazy" decoding="async" onerror="this.src='${BB_MOBILE_IMG.slot}'">
          <small>${provider}</small>
        </div>

        <div class="bb-real-game-info">
          <b>${title}</b>
          <em>${category}</em>
          <button onclick="launchBetApiGame('${bbEsc(g.gameId || "")}')">Hemen Oyna</button>
        </div>
      </div>
    `;
  }

  async function bbRenderRealGames(title){
    const app = document.getElementById("app");

    let games = bbGetAllGamesNow();

    app.innerHTML = shell(`
      <section class="bb-real-games-hero">
        <div>
          <span>OYUNLAR</span>
          <h1>${bbEsc(title)}</h1>
          <p>Oyunlar yükleniyor, birkaç saniye sürebilir.</p>
        </div>
        <strong>${games.length}</strong>
      </section>

      <section class="bb-real-games-grid">
        ${games.slice(0,160).map(bbGameCard).join("")}
      </section>
    `);

    const live = await bbEnsureBetnexGames();

    if(live.length){
      games = bbGetAllGamesNow();

      app.innerHTML = shell(`
        <section class="bb-real-games-hero">
          <div>
            <span>OYUNLAR</span>
            <h1>${bbEsc(title)}</h1>
            <p>Betnex sağlayıcılarından çekilen aktif oyunlar.</p>
          </div>
          <strong>${games.length}</strong>
        </section>

        <section class="bb-real-games-grid">
          ${games.slice(0,240).map(bbGameCard).join("")}
        </section>
      `);
    }

    if(typeof bbRenderGeneratedBottomNav === "function"){
      bbRenderGeneratedBottomNav();
    }
  }

  window.renderCasino = function(title = "Casino Oyunları"){
    bbRenderRealGames(title);
  };

  window.renderSlot = function(){
    bbRenderRealGames("Slot Oyunları");
  };

  window.renderVirtualGames = function(){
    bbRenderRealGames("Sanal Oyunlar");
  };

  window.bbClearBetnexGameCache = function(){
    localStorage.removeItem("bozobet_live_betnex_games");
    alert("Oyun cache temizlendi. Sayfayı yenile.");
  };
})();
