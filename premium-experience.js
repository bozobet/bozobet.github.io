(() => {
  "use strict";

  const KEYS = {
    favorites:"galaxybet_favorites_v1",
    recent:"galaxybet_recent_games_v1",
    continue:"galaxybet_continue_games_v1",
    settings:"galaxybet_user_settings_v1"
  };
  const state = {searchIndex:0,query:"",enhanceQueued:false};
  const catalog = [
    {id:"sweet-bonanza",title:"Sweet Bonanza",provider:"Pragmatic Play",category:"Slot",image:"assets/mobile/promos/welcome-bonus.png"},
    {id:"gates-olympus",title:"Gates of Olympus",provider:"Pragmatic Play",category:"Slot",image:"assets/galaxybet/banners/banner-01.png?v=3"},
    {id:"aviator",title:"Aviator",provider:"Spribe",category:"Crash",image:"assets/galaxybet/banners/banner-03.png?v=3"},
    {id:"lightning-roulette",title:"Lightning Roulette",provider:"Evolution",category:"Canlı Casino",image:"assets/mobile/dealers/dealer-live-casino-2.png"},
    {id:"wanted",title:"Wanted Dead or a Wild",provider:"Hacksaw",category:"Slot",image:"assets/galaxybet/banners/banner-04.png?v=3"},
    {id:"big-bass",title:"Big Bass Bonanza",provider:"Pragmatic Play",category:"Slot",image:"assets/galaxybet/banners/banner-02.png?v=3"},
    {id:"crazy-time",title:"Crazy Time",provider:"Evolution",category:"Game Show",image:"assets/mobile/dealers/dealer-live-casino-1.png"},
    {id:"starlight",title:"Starlight Princess",provider:"Pragmatic Play",category:"Slot",image:"assets/galaxybet/banners/banner-05.png?v=3"}
  ];
  const continueDemo = [catalog[1],catalog[2],catalog[3]].map((game,index) => ({...game,progress:[68,34,82][index],lastPlayed:"Demo oturum"}));
  const winnerFeed = [
    ["Ah***","Sweet Bonanza",48250],["Me***","Lightning Roulette",19800],["Mu***","Gates of Olympus",132450],["Se***","Aviator",27640]
  ];
  const iconPaths = {
    search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',heart:'<path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.4a5.5 5.5 0 0 0 1-8.9Z"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',play:'<path d="m8 5 11 7-11 7V5Z"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',
    arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',gift:'<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 12h18M7.5 8C5 8 4 6.8 4 5.4 4 4 5 3 6.3 3 8.5 3 10 5.2 12 8m4.5 0C19 8 20 6.8 20 5.4 20 4 19 3 17.7 3 15.5 3 14 5.2 12 8"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V3h4v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/>',
    check:'<path d="m5 12 4 4L19 6"/>',shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',warning:'<path d="M12 3 2 21h20L12 3Z"/><path d="M12 9v5m0 3h.01"/>',error:'<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/>',
    deposit:'<path d="M12 3v12m-4-4 4 4 4-4M4 19h16"/>',withdraw:'<path d="M12 16V4m-4 4 4-4 4 4M4 20h16"/>'
  };
  const svg = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name] || iconPaths.info}</svg>`;
  const esc = value => String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const read = (key,fallback=[]) => {try{return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));}catch(_){return fallback;}};
  const write = (key,value) => localStorage.setItem(key,JSON.stringify(value));
  const storageKey = key => `${key}:${window.user?.id || window.user?.username || "guest"}`;
  const slug = value => String(value || "game").toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
  const favorites = () => read(storageKey(KEYS.favorites));
  const recent = () => read(storageKey(KEYS.recent));
  const continueGames = () => read(storageKey(KEYS.continue),continueDemo);
  const isFavorite = id => favorites().some(game => game.id === id);

  function normalizeGame(game){
    return {id:game.id || slug(game.title),title:String(game.title || "GalaxyBet Oyunu"),provider:String(game.provider || "GalaxyBet"),category:String(game.category || "Oyun"),image:String(game.image || "assets/mobile/icons/casino-icon.png")};
  }
  function pushUnique(key,game,limit){
    const item = {...normalizeGame(game),updatedAt:Date.now()};
    const scoped = storageKey(key);
    write(scoped,[item,...read(scoped).filter(entry => entry.id !== item.id)].slice(0,limit));
    return item;
  }
  function rememberViewed(game){ pushUnique(KEYS.recent,game,12); }
  function rememberPlayed(game){
    const item = pushUnique(KEYS.continue,{...game,lastPlayed:new Date().toLocaleString("tr-TR"),progress:Math.floor(28+Math.random()*64)},8);
    rememberViewed(item);
  }

  window.gbToggleFavorite = function(game,button){
    const item = normalizeGame(game);
    const items = favorites();
    const exists = items.some(entry => entry.id === item.id);
    write(storageKey(KEYS.favorites),exists ? items.filter(entry => entry.id !== item.id) : [item,...items].slice(0,50));
    document.querySelectorAll(`[data-favorite-id="${CSS.escape(item.id)}"]`).forEach(node => {node.classList.toggle("active",!exists);node.setAttribute("aria-pressed",String(!exists));});
    if(button) button.classList.toggle("active",!exists);
    gbToast(exists ? "Favorilerden çıkarıldı" : "Favorilere eklendi",`${item.title} ${exists ? "listenizden kaldırıldı." : "listenize kaydedildi."}`,exists ? "info" : "success");
    if(document.querySelector(".gb-favorites-page")) renderFavorites();
  };

  window.gbToast = function(title,message,type="info",duration=3600){
    let host = document.querySelector(".gb-toast-host");
    if(!host){host=document.createElement("div");host.className="gb-toast-host";host.setAttribute("aria-live","polite");document.body.appendChild(host);}
    const toast = document.createElement("div");toast.className=`gb-toast ${type}`;toast.innerHTML=`<i>${svg(type === "success" ? "check" : type === "error" ? "error" : type === "warning" ? "warning" : "info")}</i><div><b>${esc(title)}</b><span>${esc(message)}</span></div><button aria-label="Kapat">${svg("close")}</button><em style="--toast-duration:${duration}ms"></em>`;
    toast.querySelector("button").onclick=()=>removeToast(toast);
    host.appendChild(toast);requestAnimationFrame(()=>toast.classList.add("show"));setTimeout(()=>removeToast(toast),duration);
  };
  function removeToast(toast){if(!toast?.isConnected)return;toast.classList.remove("show");setTimeout(()=>toast.remove(),260);}

  function searchDock(){
    return `<section class="gb-search-dock"><button class="gb-search-box" type="button" onclick="gbOpenSearch()">${svg("search")}<span>Oyun, sağlayıcı veya kategori ara</span><kbd>⌘ K</kbd></button><div><button onclick="renderFavorites()" aria-label="Favoriler">${svg("heart")}<span>Favoriler</span><em>${favorites().length}</em></button><button onclick="renderBonusCenter()" aria-label="Bonus Merkezi">${svg("gift")}<span>Bonuslar</span></button><button onclick="renderSettings()" aria-label="Ayarlar">${svg("settings")}<span>Ayarlar</span></button></div></section>`;
  }
  function searchOverlay(){
    const node=document.createElement("div");node.className="gb-search-overlay";node.innerHTML=`<div class="gb-search-panel" role="dialog" aria-modal="true" aria-label="Global arama"><div class="gb-search-input-row">${svg("search")}<input id="gbGlobalSearchInput" autocomplete="off" placeholder="Oyun, sağlayıcı veya kategori ara..." aria-label="Arama"><kbd>ESC</kbd></div><div class="gb-search-meta"><span>POPÜLER ARAMALAR</span><div>${["Pragmatic Play","Canlı Casino","Slot","Aviator"].map(term=>`<button data-search-term="${term}">${term}</button>`).join("")}</div></div><div class="gb-search-results" role="listbox"></div><footer><span><kbd>↑</kbd><kbd>↓</kbd> gezin</span><span><kbd>↵</kbd> seç</span><span><kbd>ESC</kbd> kapat</span></footer></div>`;document.body.appendChild(node);
    node.addEventListener("mousedown",event=>{if(event.target===node)gbCloseSearch();});node.querySelectorAll("[data-search-term]").forEach(button=>button.onclick=()=>{const input=node.querySelector("input");input.value=button.dataset.searchTerm;renderSearchResults(input.value);});
    const input=node.querySelector("input");input.addEventListener("input",()=>renderSearchResults(input.value));input.addEventListener("keydown",searchKeydown);return node;
  }
  window.gbOpenSearch = function(query=""){
    let overlay=document.querySelector(".gb-search-overlay") || searchOverlay();state.searchIndex=0;overlay.classList.add("open");document.body.classList.add("gb-search-open");const input=overlay.querySelector("input");input.value=query;renderSearchResults(query);setTimeout(()=>input.focus(),60);
  };
  window.gbCloseSearch = function(){document.querySelector(".gb-search-overlay")?.classList.remove("open");document.body.classList.remove("gb-search-open");}
  function filteredCatalog(query){const value=String(query||"").trim().toLocaleLowerCase("tr-TR");return !value?catalog.slice(0,6):catalog.filter(game=>`${game.title} ${game.provider} ${game.category}`.toLocaleLowerCase("tr-TR").includes(value));}
  function renderSearchResults(query){
    state.query=query;const result=filteredCatalog(query);state.searchIndex=Math.min(state.searchIndex,Math.max(0,result.length-1));const root=document.querySelector(".gb-search-results");if(!root)return;
    root.innerHTML=result.length?`<header><span>${query?"ARAMA SONUÇLARI":"SANA ÖZEL"}</span><b>${result.length} sonuç</b></header>${result.map((game,index)=>`<article class="${index===state.searchIndex?"active":""}" role="option" aria-selected="${index===state.searchIndex}" data-search-id="${game.id}"><img src="${game.image}" alt="" loading="lazy" decoding="async"><div><strong>${game.title}</strong><span>${game.provider} · ${game.category}</span></div><button class="gb-result-heart ${isFavorite(game.id)?"active":""}" data-favorite-id="${game.id}" aria-label="Favoriye ekle" aria-pressed="${isFavorite(game.id)}">${svg("heart")}</button><button class="gb-result-open">İncele ${svg("arrow")}</button></article>`).join("")}`:`<div class="gb-search-empty">${svg("search")}<b>Sonuç bulunamadı</b><span>Farklı bir oyun, sağlayıcı veya kategori deneyin.</span></div>`;
    root.querySelectorAll("article").forEach((row,index)=>{row.onmouseenter=()=>{state.searchIndex=index;syncSearchActive();};row.querySelector(".gb-result-heart").onclick=event=>{event.stopPropagation();gbToggleFavorite(result[index],event.currentTarget);renderSearchResults(state.query);};row.onclick=()=>openDemoGame(result[index]);});
  }
  function syncSearchActive(){document.querySelectorAll(".gb-search-results article").forEach((row,index)=>{row.classList.toggle("active",index===state.searchIndex);row.setAttribute("aria-selected",String(index===state.searchIndex));});document.querySelector(".gb-search-results article.active")?.scrollIntoView({block:"nearest"});}
  function searchKeydown(event){const results=filteredCatalog(state.query);if(event.key==="ArrowDown"){event.preventDefault();state.searchIndex=(state.searchIndex+1)%Math.max(1,results.length);syncSearchActive();}else if(event.key==="ArrowUp"){event.preventDefault();state.searchIndex=(state.searchIndex-1+Math.max(1,results.length))%Math.max(1,results.length);syncSearchActive();}else if(event.key==="Enter"&&results[state.searchIndex]){event.preventDefault();openDemoGame(results[state.searchIndex]);}else if(event.key==="Escape")gbCloseSearch();}
  function openDemoGame(game){rememberViewed(game);rememberPlayed(game);gbCloseSearch();gbToast("Gambit Stage hazır","Oyun bağlantısı entegrasyon tamamlandığında açılacak.","info");}

  function experienceHero(eyebrow,title,text,actions=""){
    return `<section class="gb-experience-hero"><div><span>${eyebrow}</span><h1>${title}</h1><p>${text}</p></div>${actions}</section>`;
  }
  function gameCard(game,{continueMode=false}={}){
    const item=normalizeGame(game);return `<article class="gb-library-card"><div class="gb-library-media"><img src="${item.image}" alt="${esc(item.title)}" loading="lazy" decoding="async"><button class="gb-favorite-heart ${isFavorite(item.id)?"active":""}" data-favorite-id="${item.id}" aria-label="Favori" aria-pressed="${isFavorite(item.id)}">${svg("heart")}</button>${continueMode?`<span>${Number(game.progress||0)}%</span>`:""}</div><div class="gb-library-info"><small>${esc(item.provider)} · ${esc(item.category)}</small><strong>${esc(item.title)}</strong>${continueMode?`<div class="gb-library-progress"><i style="width:${Number(game.progress||0)}%"></i></div>`:""}<button data-open-library="${item.id}">${svg("play")} ${continueMode?"Devam Et":"İncele"}</button></div></article>`;
  }
  function bindLibrary(root,items){root.querySelectorAll(".gb-library-card").forEach((card,index)=>{card.querySelector(".gb-favorite-heart").onclick=event=>{event.stopPropagation();gbToggleFavorite(items[index],event.currentTarget);};card.querySelector("[data-open-library]").onclick=()=>openDemoGame(items[index]);});}

  window.renderFavorites = function(){
    const favs=favorites(),viewed=recent(),continued=continueGames();document.getElementById("app").innerHTML=window.shell(`<div class="gb-experience-page gb-favorites-page">${experienceHero("KİŞİSEL KÜTÜPHANE","Favorilerim","Sevdiğin oyunlara, son görüntülediklerine ve yarım kalan deneyimlerine tek yerden ulaş.",`<button class="gb-hero-action" onclick="gbOpenSearch()">${svg("search")} Oyun Ara</button>`)}<section class="gb-library-section"><header><div><span>FAVORİLER</span><h2>Kaydettiğin oyunlar</h2></div><b>${favs.length} oyun</b></header>${favs.length?`<div class="gb-library-grid" data-library="favorites">${favs.map(game=>gameCard(game)).join("")}</div>`:`<div class="gb-library-empty">${svg("heart")}<b>Favori listen henüz boş</b><span>Arama sonuçlarındaki kalp ikonuna dokunarak oyunları buraya ekleyebilirsin.</span><button onclick="gbOpenSearch()">Oyunları Keşfet</button></div>`}</section><section class="gb-library-section"><header><div><span>GEÇMİŞ</span><h2>Son görüntülenenler</h2></div><b>${viewed.length} kayıt</b></header>${viewed.length?`<div class="gb-library-grid compact" data-library="recent">${viewed.slice(0,6).map(game=>gameCard(game)).join("")}</div>`:`<div class="gb-library-empty compact">${svg("clock")}<b>Henüz görüntülenen oyun yok</b><span>İncelediğin oyunlar burada listelenecek.</span></div>`}</section><section class="gb-library-section"><header><div><span>DEVAM ET</span><h2>Son oynadığın oyunlar</h2></div><b>${continued.length} oyun</b></header><div class="gb-library-grid compact" data-library="continue">${continued.slice(0,6).map(game=>gameCard(game,{continueMode:true})).join("")}</div></section></div>`);
    bindLibrary(document.querySelector('[data-library="favorites"]')||document.createElement("div"),favs);bindLibrary(document.querySelector('[data-library="recent"]')||document.createElement("div"),viewed.slice(0,6));bindLibrary(document.querySelector('[data-library="continue"]'),continued.slice(0,6));window.scrollTo({top:0,behavior:"smooth"});
  };

  const bonuses=[
    ["Hoş Geldin Bonusu","Yeni üyeliğine özel başlangıç paketi","%100","Yeni Üye"],["İlk Yatırım Bonusu","İlk yatırımını daha güçlü başlat","%25","Yatırım"],["Free Spin","Seçili slotlarda ücretsiz dönüşler","250","Free Spin"],["Cashback","Haftalık kayıplarına özel geri ödeme","%20","Cashback"],["Turnuva","Liderlik tablosunda yüksel, ödülü kap","₺250K","Turnuva"],["Arkadaşını Davet Et","Davet et, birlikte kazan","₺500","Referans"]
  ];
  const tasks=[
    ["Giriş Yap","Günlük hesabına giriş yap",()=>window.user?1:0,1],["İlk Yatırım","İlk yatırım talebini oluştur",()=>{try{return getPaymentRequests().some(x=>x.username===user?.username&&x.type==="Yatırım")?1:0}catch(_){return 0}},1],["5 Slot Oyunu Oyna","Beş farklı slot deneyimini tamamla",()=>continueGames().filter(x=>x.category==="Slot").length,5],["Canlı Casinoda 10 El Oyna","Canlı masa görevini tamamla",()=>3,10]
  ];
  const badges=[["Bronze",0],["Silver",5000],["Gold",25000],["Platinum",75000],["Diamond",200000]];
  function totalDeposit(){try{return getPaymentRequests().filter(x=>x.username===user?.username&&x.type==="Yatırım"&&["Onaylandı","Tamamlandı"].includes(x.status)).reduce((a,x)=>a+Number(x.amount||0),0)}catch(_){return 0}}
  window.renderBonusCenter = function(){
    const total=totalDeposit();document.getElementById("app").innerHTML=window.shell(`<div class="gb-experience-page gb-bonus-page">${experienceHero("ÖDÜL & SADAKAT","Bonus Merkezi","Kampanyalarını, günlük görevlerini ve başarı rozetlerini tek merkezden yönet.",`<div class="gb-bonus-balance"><small>BONUS BAKİYESİ</small><strong>${typeof money==="function"?money(user?.bonusBalance||user?.bonus||0):"₺0,00"}</strong></div>`)}<section class="gb-library-section"><header><div><span>AKTİF FIRSATLAR</span><h2>Bonuslar ve kampanyalar</h2></div><b>6 fırsat</b></header><div class="gb-bonus-grid">${bonuses.map(([title,text,value,tag],index)=>`<article style="--bonus-index:${index}"><div><span>${tag}</span><strong>${value}</strong></div><h3>${title}</h3><p>${text}</p><button data-bonus-title="${title}">Detayları İncele ${svg("arrow")}</button></article>`).join("")}</div></section><section class="gb-library-section"><header><div><span>GÜNLÜK SERİ</span><h2>Günlük görevler</h2></div><b>Her gün yenilenir</b></header><div class="gb-task-list">${tasks.map(([title,text,current,max],index)=>{const value=Math.min(max,current());const percent=Math.round(value/max*100);return `<article><i>${String(index+1).padStart(2,"0")}</i><div><b>${title}</b><span>${text}</span><div><em style="width:${percent}%"></em></div></div><strong>${value}/${max}</strong><small class="${percent===100?"done":""}">${percent===100?svg("check"):`${percent}%`}</small></article>`}).join("")}</div></section><section class="gb-library-section"><header><div><span>BAŞARILAR</span><h2>Başarı rozetleri</h2></div><b>${badges.filter(([,limit])=>total>=limit).length}/5 açık</b></header><div class="gb-badge-grid">${badges.map(([name,limit],index)=>{const unlocked=total>=limit;return `<article class="${unlocked?"unlocked":"locked"}" style="--badge-level:${index}"><i>${svg("shield")}</i><strong>${name}</strong><span>${limit?`${limit.toLocaleString("tr-TR")} ₺ yatırım`:"Başlangıç rozeti"}</span><small>${unlocked?"KAZANILDI":"KİLİTLİ"}</small></article>`}).join("")}</div></section></div>`);document.querySelectorAll("[data-bonus-title]").forEach(button=>button.onclick=()=>{if(!window.user)return window.loginModal?.();gbToast("Bonus detayı",`${button.dataset.bonusTitle} koşulları kampanya servisi bağlandığında görüntülenecek.`,"info")});window.scrollTo({top:0,behavior:"smooth"});
  };

  const defaultSettings={theme:"dark",language:"tr",currency:"TRY",notifications:{bonus:true,system:true,campaign:true},security:{twoFactor:false}};
  function settings(){const value=read(storageKey(KEYS.settings),defaultSettings);return {...defaultSettings,...value,notifications:{...defaultSettings.notifications,...value.notifications},security:{...defaultSettings.security,...value.security}};}
  function saveSettings(value){write(storageKey(KEYS.settings),value);applySettings(value);gbToast("Ayarlar kaydedildi","Tercihlerin bu cihazda güvenle saklandı.","success");}
  function applySettings(value=settings()){document.documentElement.dataset.gbTheme=value.theme;document.documentElement.lang=value.language;document.documentElement.dataset.gbCurrency=value.currency;}
  window.gbSettingChoice=function(group,value){const data=settings();data[group]=value;saveSettings(data);renderSettings();};
  window.gbToggleSetting=function(group,key){const data=settings();data[group][key]=!data[group][key];saveSettings(data);renderSettings();};
  function choiceRow(title,text,group,current,options){return `<div class="gb-setting-row"><div><b>${title}</b><span>${text}</span></div><div class="gb-choice-group">${options.map(([value,label])=>`<button class="${current===value?"active":""}" onclick="gbSettingChoice('${group}','${value}')">${label}</button>`).join("")}</div></div>`;}
  window.renderSettings=function(){const data=settings();document.getElementById("app").innerHTML=window.shell(`<div class="gb-experience-page gb-settings-page">${experienceHero("KİŞİSEL DENEYİM","Ayarlar","Görünüm, dil, para birimi, bildirim ve güvenlik tercihlerini yönet.")}<section class="gb-settings-card"><header><i>${svg("settings")}</i><div><span>GÖRÜNÜM</span><h2>Arayüz tercihleri</h2></div></header>${choiceRow("Tema","GalaxyBet görünümünü kişiselleştir","theme",data.theme,[["dark","Galaxy"],["amoled","AMOLED"],["contrast","Yüksek Kontrast"]])}${choiceRow("Dil","Arayüz ve içerik dili","language",data.language,[["tr","Türkçe"],["en","English"]])}${choiceRow("Para Birimi","Bakiyelerde gösterilecek birim","currency",data.currency,[["TRY","TRY"],["USD","USD"],["EUR","EUR"]])}</section><section class="gb-settings-card"><header><i>${svg("info")}</i><div><span>BİLDİRİMLER</span><h2>İletişim tercihleri</h2></div></header>${[["bonus","Bonus bildirimleri","Yeni bonus ve ödül fırsatları"],["system","Sistem duyuruları","Hesap ve güvenlik gelişmeleri"],["campaign","Kampanya bildirimleri","Yeni kampanya ve turnuvalar"]].map(([key,title,text])=>`<div class="gb-setting-row"><div><b>${title}</b><span>${text}</span></div><button class="gb-switch ${data.notifications[key]?"on":""}" onclick="gbToggleSetting('notifications','${key}')" aria-pressed="${data.notifications[key]}"><i></i></button></div>`).join("")}</section><section class="gb-settings-card"><header><i>${svg("shield")}</i><div><span>GÜVENLİK</span><h2>Hesap güvenliği</h2></div></header><div class="gb-setting-row"><div><b>İki adımlı doğrulama</b><span>Hesabına ek bir güvenlik katmanı ekle</span></div><button class="gb-switch ${data.security.twoFactor?"on":""}" onclick="gbToggleSetting('security','twoFactor')" aria-pressed="${data.security.twoFactor}"><i></i></button></div><div class="gb-setting-row"><div><b>Aktif oturumlar</b><span>Bu cihazdaki güvenli oturumunu görüntüle</span></div><button class="gb-setting-action" onclick="gbToast('Aktif oturum','Bu cihazda bir aktif GalaxyBet oturumu bulunuyor.','info')">Görüntüle ${svg("arrow")}</button></div></section></div>`);window.scrollTo({top:0,behavior:"smooth"});};

  function extractGame(card){
    const title=card.querySelector("[data-game-title]")?.dataset.gameTitle||card.querySelector(".mobile-game-info>b,.gamblehub-game-info>b,.rf-game-info>b,.bb-real-game-info>b,.bb-public-game-card-info>b,.premium-game-title,.game>b")?.textContent?.trim();if(!title)return null;
    const image=card.querySelector("img")?.getAttribute("src")||"assets/mobile/icons/casino-icon.png";const provider=card.querySelector(".mobile-game-meta span,.gamblehub-game-image span,.rf-game-info span,.bb-real-game-media small,.bb-public-game-card-info span,.premium-game-provider")?.textContent?.trim()||"GalaxyBet";const category=card.querySelector(".mobile-game-meta small,.bb-public-game-card-info small,.premium-game-category")?.textContent?.trim()||"Oyun";return normalizeGame({id:slug(title),title,provider,category,image});
  }
  function enhanceGameCards(root=document){
    root.querySelectorAll(".mobile-game-card,.gamblehub-game-card,.rf-game-card,.bb-real-game-card,.bb-public-game-card-final,.premium-game-card,.bb-catalog-game-card,.game").forEach(card=>{if(card.dataset.gbExperience==="1")return;const game=extractGame(card);if(!game)return;card.dataset.gbExperience="1";card.style.position="relative";const nestedInButton=card.tagName==="BUTTON";const button=document.createElement(nestedInButton?"span":"button");if(!nestedInButton)button.type="button";else{button.setAttribute("role","button");button.tabIndex=0;}button.className=`gb-favorite-heart gb-card-heart ${isFavorite(game.id)?"active":""}`;button.dataset.favoriteId=game.id;button.setAttribute("aria-label","Favoriye ekle");button.setAttribute("aria-pressed",String(isFavorite(game.id)));button.innerHTML=svg("heart");const toggle=event=>{event.preventDefault();event.stopPropagation();gbToggleFavorite(game,button)};button.onclick=toggle;button.onkeydown=event=>{if(event.key==="Enter"||event.key===" ")toggle(event)};card.appendChild(button);});
  }
  function quickActions(){return `<section class="gb-profile-quick"><header><span>HIZLI İŞLEMLER</span><h2>Ne yapmak istersin?</h2></header><div>${[["deposit","Para Yatır","renderDepositSitePage()"],["arrow","Çekim Yap","renderWithdrawSitePage()"],["gift","Bonuslar","renderBonusCenter()"],["info","Destek","renderSupport()"],["shield","VIP","renderVip()"]].map(([ico,label,action])=>`<button onclick="${action}"><i>${svg(ico)}</i><span>${label}</span>${svg("arrow")}</button>`).join("")}</div></section>`;}
  function accountExtras(wrap){const content=wrap.querySelector(".gb-account-content");if(content&&!content.querySelector(".gb-profile-quick")&&content.querySelector(".gb-profile-card"))content.querySelector(".gb-profile-card").insertAdjacentHTML("afterend",quickActions());const nav=wrap.querySelector(".gb-account-nav nav");if(nav&&!nav.querySelector("[data-xp-nav]"))nav.insertAdjacentHTML("beforeend",`<button data-xp-nav onclick="renderFavorites()">${svg("heart")}<span>Favoriler</span></button><button data-xp-nav onclick="renderBonusCenter()">${svg("gift")}<span>Bonus Merkezi</span></button><button data-xp-nav onclick="renderSettings()">${svg("settings")}<span>Ayarlar</span></button>`);}
  function winnerTicker(){if(document.querySelector(".gb-winner-ticker"))return;const node=document.createElement("aside");node.className="gb-winner-ticker";node.innerHTML=`<button aria-label="Kapat">${svg("close")}</button><i></i><div></div>`;document.body.appendChild(node);let index=0;const render=()=>{if(!node.isConnected)return;const [name,game,amount]=winnerFeed[index++%winnerFeed.length];const box=node.querySelector("div");box.classList.remove("animate");void box.offsetWidth;box.innerHTML=`<small>SON KAZANAN</small><b>${name} · ${game}</b><strong>₺${amount.toLocaleString("tr-TR")}</strong>`;box.classList.add("animate")};render();const timer=setInterval(render,4200);node.querySelector("button").onclick=()=>{clearInterval(timer);node.remove()};}
  function skeleton(wrap){if(wrap.dataset.gxSkeletonShown==="1"||wrap.classList.contains("gb-premium-home")||wrap.querySelector(".gb-route-skeleton")||matchMedia("(prefers-reduced-motion:reduce)").matches)return;wrap.dataset.gxSkeletonShown="1";wrap.insertAdjacentHTML("afterbegin",`<div class="gb-route-skeleton" aria-hidden="true"><i></i><b></b><span></span><span></span><span></span></div>`);setTimeout(()=>wrap.querySelector(".gb-route-skeleton")?.classList.add("hide"),280);setTimeout(()=>wrap.querySelector(".gb-route-skeleton")?.remove(),600);}
  function optimizeImages(root){root.querySelectorAll("img").forEach((img,index)=>{img.decoding="async";if(!img.closest(".hero-slider,.mobile-hero-slider")||index>0)img.loading="lazy";});}
  function enhance(){
    state.enhanceQueued=false;const app=document.getElementById("app"),wrap=app?.querySelector(".wrap");if(!wrap)return;
    if(!wrap.querySelector(":scope > .gb-search-dock"))wrap.insertAdjacentHTML("afterbegin",searchDock());
    accountExtras(wrap);enhanceGameCards(wrap);optimizeImages(wrap);skeleton(wrap);
  }
  function queueEnhance(){if(state.enhanceQueued)return;state.enhanceQueued=true;requestAnimationFrame(enhance);}

  document.addEventListener("click",event=>{
    const button=event.target.closest("button,.btn,a");if(button&&!button.closest(".gb-search-overlay")&&!matchMedia("(prefers-reduced-motion:reduce)").matches){const ripple=document.createElement("i");ripple.className="gb-ripple";const rect=button.getBoundingClientRect();ripple.style.left=`${event.clientX-rect.left}px`;ripple.style.top=`${event.clientY-rect.top}px`;button.appendChild(ripple);setTimeout(()=>ripple.remove(),550);}
    const play=event.target.closest(".mobile-game-play,.gamblehub-game-info button,.rf-play-btn,.bb-real-game-info button,.bb-public-game-card-final,.premium-game-card button,.bb-catalog-game-card button");if(play&&!event.target.closest(".gb-favorite-heart")){const game=extractGame(play.closest(".mobile-game-card,.gamblehub-game-card,.rf-game-card,.bb-real-game-card,.bb-public-game-card-final,.premium-game-card,.bb-catalog-game-card"));if(game)rememberPlayed(game);}
  },true);
  document.addEventListener("keydown",event=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==="k"){event.preventDefault();gbOpenSearch();}else if(event.key==="Escape"&&document.querySelector(".gb-search-overlay.open"))gbCloseSearch();});
  const app=document.getElementById("app");if(app)new MutationObserver(queueEnhance).observe(app,{childList:true,subtree:true});
  const nativeAlert=window.alert.bind(window);
  window.alert=function(message){const text=String(message||"");const lower=text.toLocaleLowerCase("tr-TR");const type=/(hata|geçersiz|yetersiz|redd|bulunamadı)/.test(lower)?"error":/(dikkat|uyarı|limit)/.test(lower)?"warning":/(başarı|onay|oluşturuldu|kopyalandı|eklendi)/.test(lower)?"success":"info";if(typeof window.gbToast==="function")window.gbToast(type==="error"?"İşlem tamamlanamadı":type==="warning"?"Dikkat":type==="success"?"İşlem başarılı":"Bilgilendirme",text,type);else nativeAlert(text);};
  applySettings();winnerTicker();queueEnhance();window.addEventListener("load",queueEnhance);
})();
