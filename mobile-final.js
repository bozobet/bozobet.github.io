// GALAXYBET MOBILE FINAL OVERRIDE
(function(){
  const GAME_API_BASE = "/api";

  const AS = "assets/mobile/";

  const CATALOG = [
    {title:"Sweet Bonanza", provider:"Pragmatic Play", category:"Slot", image:AS+"promos/welcome-bonus.png", keys:["sweet","bonanza"]},
    {title:"Gates of Olympus", provider:"Pragmatic Play", category:"Slot", image:AS+"banners/big-prize-banner.png", keys:["gates","olympus"]},
    {title:"Big Bass Bonanza", provider:"Pragmatic Play", category:"Slot", image:AS+"banners/live-casino-hero-1.png", keys:["big","bass"]},
    {title:"Sugar Rush", provider:"Pragmatic Play", category:"Slot", image:AS+"promos/freespin.png", keys:["sugar","rush"]},
    {title:"Aviator", provider:"Spribe", category:"Crash", image:AS+"banners/live-casino-hero-2.png", keys:["aviator"]},
    {title:"Mines", provider:"Spribe", category:"Crash", image:AS+"icons/casino-icon.png", keys:["mines"]},
    {title:"Plinko", provider:"Spribe", category:"Arcade", image:AS+"icons/slot-icon.png", keys:["plinko"]},
    {title:"Crazy Time", provider:"Evolution", category:"Live Casino", image:AS+"dealers/dealer-live-casino-1.png", keys:["crazy","time"]},
    {title:"Lightning Roulette", provider:"Evolution", category:"Live Casino", image:AS+"dealers/dealer-live-casino-2.png", keys:["lightning","roulette"]},
    {title:"Blackjack", provider:"Evolution", category:"Live Casino", image:AS+"dealers/dealer-cards.png", keys:["blackjack"]},
    {title:"Mega Wheel", provider:"Pragmatic Play", category:"Live Casino", image:AS+"banners/vip-casino-banner.png", keys:["mega","wheel"]},
    {title:"The Dog House", provider:"Pragmatic Play", category:"Slot", image:AS+"promos/bonus-campaign.png", keys:["dog","house"]}
  ];

  function esc(v){
    return String(v || "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function currentUser(){
    try{return window.user || JSON.parse(localStorage.getItem("bozobet_user") || "null");}
    catch(e){return window.user || null;}
  }

  function safeShell(html){
    if(typeof window.shell === "function") return window.shell(html);
    return `<main class="app-shell">${html}</main>`;
  }

  function storedGames(){
    try{return JSON.parse(localStorage.getItem("bozobet_betnex_games_final") || "[]");}
    catch(e){return [];}
  }

  function saveGames(games){
    localStorage.setItem("bozobet_betnex_games_final", JSON.stringify(games || []));
  }

  function mergeGames(){
    const loadedGames = storedGames();
    const merged = [];

    CATALOG.forEach(c => {
      const match = loadedGames.find(r => {
        const t = String(r.title || "").toLowerCase();
        return c.keys.some(k => t.includes(k));
      });

      merged.push({
        ...c,
        gameId: match?.gameId || "",
        image: match?.image || c.image,
        provider: match?.provider || c.provider,
        category: match?.category || c.category
      });
    });

    loadedGames.forEach(r => {
      const exists = merged.some(m => String(m.gameId) === String(r.gameId) || String(m.title).toLowerCase() === String(r.title).toLowerCase());
      if(!exists) merged.push(r);
    });

    return merged;
  }

  function findArray(obj){
    if(Array.isArray(obj)) return obj;
    if(!obj || typeof obj !== "object") return [];
    for(const k of ["data","games","result","results","items","list"]){
      if(Array.isArray(obj[k])) return obj[k];
      const n = findArray(obj[k]);
      if(n.length) return n;
    }
    for(const v of Object.values(obj)){
      const n = findArray(v);
      if(n.length) return n;
    }
    return [];
  }

  function norm(g, provider, i){
    const gameId = g.gameId || g.game_id || g.id || g.uuid || g.gameCode || g.code || g.slug || "";
    const title = g.gameName || g.name || g.title || g.game || g.game_title || ("Oyun " + (i+1));
    const image = g.image || g.img || g.icon || g.thumbnail || g.logo || g.cover || "";
    return {gameId:String(gameId), title:String(title), provider:String(provider || g.provider || g.providerName || ""), category:String(g.category || g.type || g.gameType || "Casino"), image:String(image || "")};
  }

  async function fetchProvider(provider){
    const res = await fetch(`${GAME_API_BASE}/games?provider=${encodeURIComponent(provider)}`);
    if(!res.ok) throw new Error(`Oyun kataloğu yüklenemedi: ${res.status}`);
    const json = await res.json();
    return findArray(json).map((g,i)=>norm(g,provider,i)).filter(g=>g.gameId && g.title);
  }

  async function loadProviderGames(){
    if(storedGames().some(g => g.gameId)) return storedGames();

    const providerResponse = await fetch(`${GAME_API_BASE}/providers`);
    if(!providerResponse.ok) throw new Error(`Provider listesi yüklenemedi: ${providerResponse.status}`);
    const providers = findArray(await providerResponse.json()).map(p => typeof p === "string" ? p : p.provider || p.name || p.code || p.id).filter(Boolean);
    const all = [];

    for(const p of providers){
      try{
        const list = await fetchProvider(p);
        all.push(...list);
        await new Promise(r=>setTimeout(r,250));
      }catch(e){
        console.log("Provider hata:", p, e);
      }
    }

    const map = new Map();
    all.forEach(g => map.set(`${g.provider}_${g.gameId}`, g));
    const final = [...map.values()];
    if(final.length) saveGames(final);
    return final;
  }

  function needLogin(){
    if(!currentUser()){
      alert("Lütfen hesabınıza giriş yapın.");
      if(typeof window.loginModal === "function") setTimeout(window.loginModal,150);
      return false;
    }
    return true;
  }

  window.bbMobilePlayGame = async function(title){
    if(!needLogin()) return;

    let games = mergeGames();
    let g = games.find(x => String(x.title).toLowerCase() === String(title).toLowerCase());

    if(!g?.gameId){
      await loadProviderGames();
      games = mergeGames();
      g = games.find(x => String(x.title).toLowerCase() === String(title).toLowerCase());
    }

    if(!g?.gameId){
      alert("Oyun bağlantısı henüz alınamadı. Admin panelden provider oyunlarını tekrar çekmek gerekebilir.");
      return;
    }

    try{
      const u = currentUser();
      const username = "bozobet_user_" + (u.username || u.id || Date.now());

      const res = await fetch(`${GAME_API_BASE}/game-url`, {
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          username,
          gameId:g.gameId,
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
        alert("Oyun linki alınamadı.");
        return;
      }

      window.open(url, "_blank");
    }catch(e){
      alert("Oyun açılamadı: " + e.message);
    }
  };

  function card(g){
    return `
      <div class="bbf-card">
        <div class="bbf-img">
          <img src="${esc(g.image)}" loading="lazy" decoding="async" onerror="this.src='${AS}icons/slot-icon.png'">
          <small>${esc(g.provider)}</small>
        </div>
        <div class="bbf-info">
          <b>${esc(g.title)}</b>
          <em>${esc(g.category)}</em>
          <button onclick="bbMobilePlayGame('${esc(g.title)}')">Hemen Oyna</button>
        </div>
      </div>
    `;
  }

  function bottomNav(){
    document.querySelectorAll(".bbf-nav").forEach(x=>x.remove());

    let n = 0;
    try{
      const u = currentUser();
      const bets = JSON.parse(localStorage.getItem("bozobet_bets") || "[]");
      n = u ? bets.filter(b => ["active","pending","open","waiting","bekliyor"].includes(String(b.status || "").toLowerCase())).length : 0;
    }catch(e){}

    const nav = document.createElement("nav");
    nav.className = "bbf-nav";
    nav.innerHTML = `
      <button onclick="renderHome && renderHome()"><img src="${AS}icons/nav-home.png"><b>Ana Sayfa</b></button>
      <button onclick="renderSports && renderSports()"><img src="${AS}icons/nav-sports.png"><b>Spor</b></button>
      <button onclick="renderCasino && renderCasino()"><img src="${AS}icons/nav-casino.png"><b>Casino</b></button>
      <button onclick="renderCoupon ? renderCoupon() : alert('Kuponunuz boş.')"><img src="${AS}icons/nav-coupon.png"><i>${n}</i><b>Kupon</b></button>
      <button onclick="currentUser() ? (renderProfile && renderProfile()) : (loginModal && loginModal())"><img src="${AS}icons/nav-account.png"><b>Hesabım</b></button>
    `;
    document.body.appendChild(nav);
  }

  function renderGames(title){
    const games = mergeGames();

    document.getElementById("app").innerHTML = safeShell(`
      <section class="bbf-hero">
        <div>
          <span>OYUNLAR</span>
          <h1>${esc(title)}</h1>
          <p>Popüler sağlayıcıların aktif casino ve slot oyunları.</p>
        </div>
        <strong>${games.length}</strong>
      </section>

      <section class="bbf-tabs">
        <button>Pragmatic Play</button>
        <button>Spribe</button>
        <button>Evolution</button>
        <button>Jili</button>
      </section>

      <section class="bbf-grid">
        ${games.slice(0,240).map(card).join("")}
      </section>
    `);

    bottomNav();

    loadProviderGames().then(() => {
      const fresh = mergeGames();
      const grid = document.querySelector(".bbf-grid");
      const count = document.querySelector(".bbf-hero strong");
      if(grid) grid.innerHTML = fresh.slice(0,240).map(card).join("");
      if(count) count.textContent = fresh.length;
    });
  }

  window.renderCasino = function(){ renderGames("Casino Oyunları"); };
  window.renderSlot = function(){ renderGames("Slot Oyunları"); };
  window.renderVirtualGames = function(){ renderGames("Sanal Oyunlar"); };

  function fixHome(){
    const app = document.getElementById("app");
    if(!app) return;

    const found = [...app.querySelectorAll("h1,h2,h3,b,strong,span,div")].find(el => {
      const t = String(el.textContent || "").trim().toLowerCase();
      return t === "popüler oyunlar" || t.includes("popüler oyunlar");
    });

    if(!found) return;

    const cardEl = found.closest(".card") || found.closest("section") || found.parentElement?.parentElement;
    if(!cardEl) return;

    const header = found.closest(".card-head") || found.parentElement;
    [...cardEl.children].forEach(ch => { if(ch !== header) ch.remove(); });

    cardEl.insertAdjacentHTML("beforeend", `
      <div class="bbf-home-popular">
        ${mergeGames().slice(0,5).map(card).join("")}
      </div>
    `);

    bottomNav();
  }

  if(typeof window.renderHome === "function"){
    const old = window.renderHome;
    window.renderHome = function(){
      old();
      setTimeout(fixHome,100);
      setTimeout(fixHome,500);
      setTimeout(bottomNav,200);
    };
  }

  window.addEventListener("load", () => {
    setTimeout(fixHome,400);
    setTimeout(bottomNav,500);
  });

  window.bbClearRealGames = function(){
    localStorage.removeItem("bozobet_betnex_games_final");
    alert("Oyun cache temizlendi. Sayfayı yenile.");
  };
})();
