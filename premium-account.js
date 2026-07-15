(() => {
  "use strict";

  const state = {
    depositMethod:"Havale / EFT",
    withdrawMethod:"Banka Havalesi",
    notificationFilter:"all"
  };

  const icons = {
    profile:'<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/>',
    wallet:'<path d="M4 7V5a2 2 0 0 1 2-2h12v4"/><rect x="3" y="7" width="18" height="14" rx="3"/><path d="M16 12h5v4h-5a2 2 0 0 1 0-4Z"/>',
    deposit:'<path d="M12 3v12m-4-4 4 4 4-4"/><path d="M4 18v3h16v-3"/>',
    withdraw:'<path d="M12 16V4m-4 4 4-4 4 4"/><path d="M4 18v3h16v-3"/>',
    bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
    support:'<circle cx="12" cy="12" r="9"/><path d="M8 15v-2a4 4 0 0 1 8 0v2M8 14H6v3h2m8-3h2v3h-2"/>',
    vip:'<path d="m3 7 4 4 5-7 5 7 4-4-2 12H5L3 7Z"/><path d="M5 19h14"/>',
    referral:'<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0m3-9v6m-3-3h6"/>',
    shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-5"/>',
    chart:'<path d="M4 20V10m6 10V4m6 16v-7m5 7H2"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    copy:'<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    bank:'<path d="m3 9 9-5 9 5M5 10v7m5-7v7m4-7v7m5-7v7M3 20h18"/>',
    crypto:'<path d="M9 5h5a4 4 0 0 1 0 8H8m1 0h6a4 4 0 0 1 0 8H9M12 2v3m3-3v3m-3 16v2m3-2v2"/>',
    qr:'<rect x="3" y="3" width="6" height="6"/><rect x="15" y="3" width="6" height="6"/><rect x="3" y="15" width="6" height="6"/><path d="M15 15h2v2h-2zm4 0h2v6h-6v-2"/>',
    arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>'
  };

  const svg = name => `<svg class="gb-icon" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.profile}</svg>`;
  const esc = value => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const list = (fn, fallback = []) => {
    try { return typeof window[fn] === "function" ? window[fn]() : fallback; }
    catch (_) { return fallback; }
  };
  const formatDate = value => {
    if(!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? esc(value) : date.toLocaleString("tr-TR", {dateStyle:"medium", timeStyle:"short"});
  };
  const requireUser = () => {
    if(window.user) return true;
    if(typeof window.loginModal === "function") window.loginModal();
    return false;
  };
  const currentId = item => [String(user?.id || ""), String(user?.username || "")].includes(String(item?.userId || item?.username || ""));
  const userRequests = () => list("getPaymentRequests").filter(currentId).sort((a,b) => Number(b.id || 0) - Number(a.id || 0));
  const userTransactions = () => list("getTransactions").filter(currentId).sort((a,b) => Number(b.id || 0) - Number(a.id || 0));
  const sum = (items, predicate) => items.filter(predicate).reduce((total, item) => total + Number(item.amount || 0), 0);
  const isApproved = item => ["onaylandı", "tamamlandı", "approved", "completed"].includes(String(item.status || "").toLocaleLowerCase("tr-TR"));
  const isPending = item => ["bekliyor", "pending", "open"].includes(String(item.status || "").toLocaleLowerCase("tr-TR"));

  function sessionDate(){
    for(const storage of [sessionStorage, localStorage]){
      try{
        const session = JSON.parse(storage.getItem("bozobetSession") || "null");
        if(session?.loginTime) return formatDate(session.loginTime);
      }catch(_){ }
    }
    return "Bu oturum";
  }

  function metrics(){
    const requests = userRequests();
    const deposited = sum(requests, item => item.type === "Yatırım" && isApproved(item));
    const withdrawn = sum(requests, item => item.type === "Çekim" && isApproved(item));
    const pendingWithdrawals = sum(requests, item => item.type === "Çekim" && isPending(item));
    const bonus = Number(user?.bonusBalance ?? user?.bonus ?? 0);
    const crypto = Number(user?.cryptoBalance ?? user?.usdtBalance ?? 0);
    const score = Math.max(deposited, Number(user?.totalDeposit || 0));
    const levels = [0, 5000, 25000, 75000, 200000, 500000];
    const index = Math.min(levels.length - 1, levels.filter(limit => score >= limit).length - 1);
    const next = levels[Math.min(index + 1, levels.length - 1)];
    const progress = index === levels.length - 1 ? 100 : Math.max(5, Math.min(100, ((score - levels[index]) / (next - levels[index])) * 100));
    const vipNames = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Diamond"];
    return {requests, deposited, withdrawn, pendingWithdrawals, bonus, crypto, level:index + 1, vip:esc(user?.vipLevel || vipNames[index]), progress, next};
  }

  const nav = [
    ["profile","Genel Bakış","profile","renderProfile()"],
    ["wallet","Cüzdan","wallet","renderWallet()"],
    ["deposit","Para Yatır","deposit","renderDepositSitePage()"],
    ["withdraw","Para Çek","withdraw","renderWithdrawSitePage()"],
    ["notifications","Bildirimler","bell","renderNotificationCenter()"],
    ["support","Destek","support","renderSupport()"],
    ["vip","VIP Kulübü","vip","renderVip()"],
    ["referral","Referans","referral","renderReferralSystem()"]
  ];

  function accountNav(active){
    const unread = window.user && typeof window.unreadNotificationCount === "function" ? window.unreadNotificationCount() : 0;
    return `<aside class="gb-account-nav">
      <div class="gb-account-user">
        <div class="gb-avatar">${esc((user?.username || "G").slice(0,1).toUpperCase())}<i></i></div>
        <div><small>GALAXYBET HESABI</small><strong>${esc(user?.username || "Misafir")}</strong></div>
      </div>
      <nav>${nav.map(([key,label,icon,action]) => `<button type="button" class="${active === key ? "active" : ""}" onclick="${action}">${svg(icon)}<span>${label}</span>${key === "notifications" && unread ? `<em>${unread}</em>` : ""}</button>`).join("")}</nav>
      <div class="gb-nav-security">${svg("shield")}<div><b>Güvenli oturum</b><span>256-bit koruma aktif</span></div></div>
    </aside>`;
  }

  function accountPage(active, eyebrow, title, subtitle, body, guestAllowed = false){
    if(!guestAllowed && !requireUser()) return;
    document.getElementById("app").innerHTML = shell(`
      <section class="gb-account-hero">
        <div><span>${eyebrow}</span><h1>${title}</h1><p>${subtitle}</p></div>
        ${user ? `<div class="gb-hero-balance"><small>KULLANILABİLİR BAKİYE</small><strong>${money(user.balance || 0)}</strong><i>Güvenli cüzdan</i></div>` : `<button class="gb-primary-btn" onclick="loginModal()">Giriş Yap ${svg("arrow")}</button>`}
      </section>
      <div class="gb-account-shell">
        ${accountNav(active)}
        <main class="gb-account-content">${body}</main>
      </div>
    `);
    window.scrollTo({top:0, behavior:"smooth"});
  }

  function statusBadge(status){
    const value = String(status || "Bekliyor");
    const lower = value.toLocaleLowerCase("tr-TR");
    const kind = lower.includes("onay") || lower.includes("tamam") ? "success" : lower.includes("red") || lower.includes("iptal") ? "danger" : "pending";
    return `<span class="gb-status ${kind}"><i></i>${esc(value)}</span>`;
  }

  function transactionRows(items, limit = 8){
    if(!items.length) return `<div class="gb-empty">${svg("chart")}<b>Henüz işlem bulunmuyor</b><span>Hesap hareketlerin oluştuğunda burada güvenle listelenecek.</span></div>`;
    return `<div class="gb-activity-list">${items.slice(0, limit).map(item => {
      const plus = item.direction === "plus";
      return `<article class="gb-activity-row">
        <div class="gb-activity-icon ${plus ? "plus" : "minus"}">${svg(plus ? "deposit" : "withdraw")}</div>
        <div class="gb-activity-main"><b>${esc(item.type || "Hesap işlemi")}</b><span>${esc(item.method || item.note || "GalaxyBet işlemi")}</span></div>
        <time>${esc(item.date || item.createdAt || "—")}</time>
        <div class="gb-activity-value ${plus ? "plus" : "minus"}"><strong>${plus ? "+" : "−"}${money(item.amount || 0)}</strong>${statusBadge(item.status)}</div>
      </article>`;
    }).join("")}</div>`;
  }

  window.renderProfile = function(){
    if(!requireUser()) return;
    const m = metrics();
    const txs = userTransactions();
    const verified = Boolean(user.verified || user.kycVerified || user.verificationStatus === "verified");
    const fullName = `${user.name || ""} ${user.surname || ""}`.trim() || user.username;
    accountPage("profile", "HESAP MERKEZİ", `Hoş geldin, ${esc(user.name || user.username)}`, "Bakiyeni, seviyeni ve hesap hareketlerini tek merkezden yönet.", `
      <section class="gb-profile-card gb-glass-card">
        <div class="gb-profile-identity">
          <div class="gb-profile-avatar">${esc(user.username.slice(0,1).toUpperCase())}<span>${svg("shield")}</span></div>
          <div><small>ÜYE NO · ${esc(String(user.id || user.username).slice(-8).toUpperCase())}</small><h2>${esc(fullName)}</h2><p>@${esc(user.username)} · ${m.vip} üye</p></div>
        </div>
        <div class="gb-verify ${verified ? "verified" : "pending"}">${svg("shield")}<div><small>HESAP DOĞRULAMA</small><strong>${verified ? "Doğrulandı" : "Doğrulama Bekliyor"}</strong></div></div>
      </section>

      <section class="gb-level-card gb-glass-card">
        <div class="gb-level-top"><div><span>SEVİYE ${m.level}</span><h3>${m.vip} League</h3></div><div class="gb-level-orbit"><strong>${m.level}</strong></div></div>
        <div class="gb-progress"><i style="width:${m.progress}%"></i></div>
        <div class="gb-level-meta"><span>${Math.round(m.progress)}% tamamlandı</span><b>${m.progress < 100 ? `${money(Math.max(0, m.next - m.deposited))} sonraki seviyeye` : "En yüksek seviye"}</b></div>
      </section>

      <section class="gb-stat-grid four">
        <article>${svg("deposit")}<small>TOPLAM YATIRIM</small><strong>${money(m.deposited)}</strong><span>Onaylanmış işlemler</span></article>
        <article>${svg("withdraw")}<small>TOPLAM ÇEKİM</small><strong>${money(m.withdrawn)}</strong><span>Tamamlanan çekimler</span></article>
        <article>${svg("wallet")}<small>BONUS BAKİYESİ</small><strong>${money(m.bonus)}</strong><span>Kullanılabilir bonus</span></article>
        <article>${svg("clock")}<small>SON GİRİŞ</small><strong class="date">${sessionDate()}</strong><span>Aktif oturum</span></article>
      </section>

      <section class="gb-section-card">
        <header><div><span>HESAP HAREKETLERİ</span><h2>İşlem geçmişi</h2></div><button onclick="renderWallet()">Tümünü Gör ${svg("arrow")}</button></header>
        ${transactionRows(txs)}
      </section>
    `);
  };

  window.renderWallet = function(){
    if(!requireUser()) return;
    const m = metrics();
    const txs = userTransactions();
    accountPage("wallet", "FİNANS MERKEZİ", "Cüzdan", "Tüm bakiyelerini ve son finans hareketlerini anlık takip et.", `
      <section class="gb-wallet-hero">
        <div><small>TOPLAM KULLANILABİLİR</small><strong>${money(Number(user.balance || 0) + m.bonus)}</strong><span>${svg("shield")} Bakiyen güvenli altyapıyla korunuyor</span></div>
        <div class="gb-wallet-actions"><button class="gb-primary-btn" onclick="renderDepositSitePage()">${svg("deposit")} Para Yatır</button><button class="gb-secondary-btn" onclick="renderWithdrawSitePage()">${svg("withdraw")} Para Çek</button></div>
      </section>
      <section class="gb-balance-grid">
        <article><i class="green">${svg("wallet")}</i><small>ANA BAKİYE</small><strong>${money(user.balance || 0)}</strong><span>Bahis ve çekim için uygun</span></article>
        <article><i class="gold">${svg("vip")}</i><small>BONUS BAKİYESİ</small><strong>${money(m.bonus)}</strong><span>Kampanya bakiyesi</span></article>
        <article><i class="violet">${svg("crypto")}</i><small>KRİPTO BAKİYESİ</small><strong>${m.crypto.toLocaleString("tr-TR", {minimumFractionDigits:2})} USDT</strong><span>Dijital varlık cüzdanı</span></article>
        <article><i class="blue">${svg("clock")}</i><small>BEKLEYEN ÇEKİMLER</small><strong>${money(m.pendingWithdrawals)}</strong><span>İnceleme sürecinde</span></article>
      </section>
      <section class="gb-section-card"><header><div><span>CÜZDAN AKIŞI</span><h2>Son işlemler</h2></div><b>${txs.length} kayıt</b></header>${transactionRows(txs, 12)}</section>
    `);
  };

  const paymentMethods = [
    {name:"Havale / EFT", icon:"bank", desc:"Tüm bankalardan 7/24", time:"1–5 dk"},
    {name:"Papara", icon:"wallet", desc:"Papara ile anında ödeme", time:"Anında"},
    {name:"Kripto", icon:"crypto", desc:"USDT · BTC · ETH", time:"1–3 dk"},
    {name:"QR Ödeme", icon:"qr", desc:"Mobil bankacılıkla tara", time:"Anında"}
  ];

  window.gbSelectDepositMethod = function(method){
    state.depositMethod = method;
    document.querySelectorAll("[data-gb-deposit]").forEach(card => card.classList.toggle("active", card.dataset.gbDeposit === method));
    const target = document.getElementById("gbDepositSelected");
    if(target) target.textContent = method;
  };

  window.gbSubmitDeposit = function(){
    if(!requireUser()) return;
    const limits = typeof getPaymentLimits === "function" ? getPaymentLimits() : {minDeposit:100,maxDeposit:50000};
    const amountInput = document.getElementById("gbDepositAmount");
    const amount = window.parseFlexibleAmount?.(amountInput?.value);
    if(!Number.isFinite(amount) || amount <= 0) return alert("Geçerli yatırım tutarı gir.");
    if(amount < limits.minDeposit || amount > limits.maxDeposit) return alert(`Yatırım tutarı ${money(limits.minDeposit)} ile ${money(limits.maxDeposit)} arasında olmalı.`);
    addPaymentRequest({username:user.username,userId:user.id || user.username,type:"Yatırım",direction:"plus",amount,method:state.depositMethod,note:`${state.depositMethod} yöntemiyle yatırım talebi oluşturuldu`});
    alert("Yatırım talebin güvenle oluşturuldu.");
    renderDepositSitePage();
  };

  window.renderDepositSitePage = function(){
    if(!requireUser()) return;
    const limits = typeof getPaymentLimits === "function" ? getPaymentLimits() : {minDeposit:100,maxDeposit:50000};
    const deposits = userRequests().filter(item => item.type === "Yatırım");
    accountPage("deposit", "GÜVENLİ ÖDEME", "Para yatır", "Sana en uygun yöntemi seç ve bakiyeni güvenle yükle.", `
      <section class="gb-payment-layout">
        <div class="gb-payment-main">
          <section class="gb-section-card">
            <header><div><span>ÖDEME YÖNTEMLERİ</span><h2>Yöntemini seç</h2></div><b>4 aktif yöntem</b></header>
            <div class="gb-method-grid">${paymentMethods.map((method,index) => `<button data-gb-deposit="${method.name}" class="${state.depositMethod === method.name || (!state.depositMethod && index === 0) ? "active" : ""}" onclick="gbSelectDepositMethod('${method.name}')"><i>${svg(method.icon)}</i><div><strong>${method.name}</strong><span>${method.desc}</span></div><em>${method.time}</em></button>`).join("")}</div>
          </section>
          <section class="gb-section-card gb-recent"><header><div><span>FİNANS GEÇMİŞİ</span><h2>Son yatırımlar</h2></div><b>${deposits.length} kayıt</b></header>${requestRows(deposits, "Henüz yatırım talebin yok")}</section>
        </div>
        <aside class="gb-payment-form">
          <div class="gb-form-head"><i>${svg("deposit")}</i><div><small>SEÇİLİ YÖNTEM</small><strong id="gbDepositSelected">${state.depositMethod}</strong></div></div>
          <label><span>Yatırım tutarı</span><div class="gb-money-input"><b>₺</b><input id="gbDepositAmount" type="text" inputmode="decimal" autocomplete="off" placeholder="0,00"></div></label>
          <div class="gb-quick-amounts">${[500,1000,2500,5000].map(v => `<button onclick="document.getElementById('gbDepositAmount').value=${v}">₺${v.toLocaleString("tr-TR")}</button>`).join("")}</div>
          <div class="gb-limit-cards"><div><small>MİNİMUM</small><strong>${money(limits.minDeposit)}</strong></div><div><small>MAKSİMUM</small><strong>${money(limits.maxDeposit)}</strong></div></div>
          <div class="gb-secure-note">${svg("shield")}<span>Ödemen uçtan uca güvenli şekilde işlenir.</span></div>
          <button class="gb-primary-btn full" onclick="gbSubmitDeposit()">Yatırım Talebi Oluştur ${svg("arrow")}</button>
        </aside>
      </section>
    `);
  };

  function requestRows(items, emptyText){
    if(!items.length) return `<div class="gb-empty compact">${svg("clock")}<b>${emptyText}</b><span>Yeni talepler burada görüntülenecek.</span></div>`;
    return `<div class="gb-request-list">${items.slice(0,8).map(item => `<article><i>${svg(item.type === "Çekim" ? "withdraw" : "deposit")}</i><div><b>${esc(item.method || item.type)}</b><span>${esc(item.date || "—")}</span></div><strong>${money(item.amount || 0)}</strong>${statusBadge(item.status)}</article>`).join("")}</div>`;
  }

  function savedDestinations(){
    try{return JSON.parse(localStorage.getItem(`galaxybet_payout_destinations_${user?.id || user?.username}`) || "[]");}catch(_){return [];}
  }
  function saveDestination(type, value){
    if(!value) return;
    const values = savedDestinations();
    if(!values.some(item => item.value === value)) values.unshift({type,value,date:new Date().toLocaleDateString("tr-TR")});
    localStorage.setItem(`galaxybet_payout_destinations_${user.id || user.username}`, JSON.stringify(values.slice(0,6)));
  }

  function configureWithdrawDestination(method){
    const input = document.getElementById("gbWithdrawDestination");
    if(!input) return;
    const isBank = method === "Banka Havalesi";
    input.inputMode = isBank || method === "Papara" ? "numeric" : "text";
    input.maxLength = isBank ? 32 : 120;
    if(isBank){
      input.value = typeof formatTurkishIban === "function" ? formatTurkishIban(input.value || "TR") : "TR";
      input.setAttribute("aria-invalid", "false");
      input.oninput = () => {
        input.value = typeof formatTurkishIban === "function" ? formatTurkishIban(input.value) : input.value;
        input.setAttribute("aria-invalid", "false");
        try{ input.setSelectionRange(input.value.length, input.value.length); }catch(_){ }
      };
    }else{
      input.oninput = null;
      if(input.value === "TR") input.value = "";
    }
  }

  window.gbSelectWithdrawMethod = function(method){
    state.withdrawMethod = method;
    document.querySelectorAll("[data-gb-withdraw]").forEach(card => card.classList.toggle("active", card.dataset.gbWithdraw === method));
    const target = document.getElementById("gbWithdrawSelected");
    const label = document.getElementById("gbDestinationLabel");
    const input = document.getElementById("gbWithdrawDestination");
    if(target) target.textContent = method;
    if(label) label.textContent = method === "Kripto" ? "Kripto cüzdan adresi" : method === "Papara" ? "Papara hesap numarası" : "IBAN / hesap bilgisi";
    if(input) input.placeholder = method === "Kripto" ? "TRC20 / ERC20 adresi" : method === "Papara" ? "Papara numarası" : "TR00 0000 0000 0000 0000 0000 00";
    configureWithdrawDestination(method);
  };

  window.gbSubmitWithdrawal = function(){
    if(!requireUser()) return;
    const limits = typeof getPaymentLimits === "function" ? getPaymentLimits() : {minWithdraw:100,maxWithdraw:25000};
    const amount = Number(document.getElementById("gbWithdrawAmount")?.value || 0);
    const destination = document.getElementById("gbWithdrawDestination")?.value.trim() || "";
    if(amount < limits.minWithdraw || amount > limits.maxWithdraw) return alert(`Çekim tutarı ${money(limits.minWithdraw)} ile ${money(limits.maxWithdraw)} arasında olmalı.`);
    if(amount > Number(user.balance || 0)) return alert("Kullanılabilir bakiyen bu işlem için yetersiz.");
    if(state.withdrawMethod === "Banka Havalesi"){
      const cleanIban = typeof cleanTurkishIban === "function" ? cleanTurkishIban(destination) : destination.replace(/\s/g, "");
      if(!/^TR\d{24}$/.test(cleanIban)){
        document.getElementById("gbWithdrawDestination")?.setAttribute("aria-invalid", "true");
        return alert("Geçersiz IBAN");
      }
    }else if(destination.length < 8) return alert("Geçerli hesap veya cüzdan bilgisi gir.");
    saveDestination(state.withdrawMethod, destination);
    addPaymentRequest({username:user.username,userId:user.id || user.username,type:"Çekim",direction:"minus",amount,method:state.withdrawMethod,iban:destination,note:`${state.withdrawMethod} yöntemiyle çekim talebi oluşturuldu`});
    alert("Çekim talebin güvenle oluşturuldu.");
    renderWithdrawSitePage();
  };

  window.renderWithdrawSitePage = function(){
    if(!requireUser()) return;
    const limits = typeof getPaymentLimits === "function" ? getPaymentLimits() : {minWithdraw:100,maxWithdraw:25000};
    const withdrawals = userRequests().filter(item => item.type === "Çekim");
    const methods = [
      {name:"Banka Havalesi",icon:"bank",desc:"Kayıtlı banka hesabına"},
      {name:"Papara",icon:"wallet",desc:"Doğrulanmış Papara hesabına"},
      {name:"Kripto",icon:"crypto",desc:"USDT · BTC · ETH adresine"}
    ];
    const saved = savedDestinations();
    accountPage("withdraw", "GÜVENLİ ÇEKİM", "Para çek", "Kazançlarını doğrulanmış hesabına güvenle aktar.", `
      <section class="gb-payment-layout">
        <div class="gb-payment-main">
          <section class="gb-section-card"><header><div><span>ÇEKİM KANALLARI</span><h2>Çekim yöntemleri</h2></div><b>${methods.length} aktif yöntem</b></header>
            <div class="gb-method-grid three">${methods.map(method => `<button data-gb-withdraw="${method.name}" class="${state.withdrawMethod === method.name ? "active" : ""}" onclick="gbSelectWithdrawMethod('${method.name}')"><i>${svg(method.icon)}</i><div><strong>${method.name}</strong><span>${method.desc}</span></div><em>Güvenli</em></button>`).join("")}</div>
          </section>
          <section class="gb-split-grid">
            <div class="gb-section-card"><header><div><span>KAYITLI HEDEFLER</span><h2>Banka ve kripto hesapları</h2></div></header>${saved.length ? `<div class="gb-saved-list">${saved.map(item => `<article><i>${svg(item.type === "Kripto" ? "crypto" : "bank")}</i><div><b>${esc(item.type)}</b><span>${esc(item.value.slice(0,8))}••••${esc(item.value.slice(-4))}</span></div><small>${esc(item.date)}</small></article>`).join("")}</div>` : `<div class="gb-empty compact">${svg("bank")}<b>Kayıtlı hesap bulunmuyor</b><span>İlk talebinle birlikte güvenli şekilde kaydedilir.</span></div>`}</div>
            <div class="gb-section-card"><header><div><span>TALEP DURUMU</span><h2>Bekleyen talepler</h2></div><b>${withdrawals.filter(isPending).length}</b></header>${requestRows(withdrawals.filter(isPending), "Bekleyen çekim talebin yok")}</div>
          </section>
          <section class="gb-section-card gb-recent"><header><div><span>ÇEKİM GEÇMİŞİ</span><h2>Geçmiş talepler</h2></div><b>${withdrawals.length} kayıt</b></header>${requestRows(withdrawals, "Henüz çekim talebin yok")}</section>
        </div>
        <aside class="gb-payment-form">
          <div class="gb-form-head"><i>${svg("withdraw")}</i><div><small>SEÇİLİ YÖNTEM</small><strong id="gbWithdrawSelected">${state.withdrawMethod}</strong></div></div>
          <label><span>Çekim tutarı</span><div class="gb-money-input"><b>₺</b><input id="gbWithdrawAmount" type="number" placeholder="0,00"></div></label>
          <label><span id="gbDestinationLabel">IBAN / hesap bilgisi</span><input class="gb-text-input" id="gbWithdrawDestination" placeholder="TR00 0000 0000 0000 0000 0000 00"></label>
          <div class="gb-limit-cards"><div><small>KULLANILABİLİR</small><strong>${money(user.balance || 0)}</strong></div><div><small>İŞLEM LİMİTİ</small><strong>${money(limits.minWithdraw)}–${money(limits.maxWithdraw)}</strong></div></div>
          <div class="gb-secure-note">${svg("shield")}<span>Çekimler yalnızca doğrulanmış hesaplara yapılır.</span></div>
          <button class="gb-primary-btn full" onclick="gbSubmitWithdrawal()">Çekim Talebi Oluştur ${svg("arrow")}</button>
        </aside>
      </section>
    `);
    gbSelectWithdrawMethod(state.withdrawMethod);
  };

  window.gbSetNotificationFilter = function(filter){ state.notificationFilter = filter; renderNotificationCenter(); };
  window.gbReadNotification = function(id){
    const notifications = list("getNotifications").map(item => String(item.id) === String(id) ? {...item,read:true} : item);
    if(typeof setNotifications === "function") setNotifications(notifications);
    renderNotificationCenter();
  };
  window.gbReadAllNotifications = function(){
    const notifications = list("getNotifications").map(item => item.username === user.username ? {...item,read:true} : item);
    if(typeof setNotifications === "function") setNotifications(notifications);
    renderNotificationCenter();
  };
  function notificationType(item){
    const text = `${item.type || ""} ${item.title || ""}`.toLocaleLowerCase("tr-TR");
    if(text.includes("bonus")) return "bonus";
    if(text.includes("kampanya") || text.includes("promosyon")) return "campaign";
    return "system";
  }

  window.renderNotificationCenter = function(){
    if(!requireUser()) return;
    const all = list("getNotifications").filter(item => item.username === user.username).sort((a,b) => Number(b.id || 0) - Number(a.id || 0));
    const filtered = state.notificationFilter === "all" ? all : all.filter(item => notificationType(item) === state.notificationFilter);
    const unread = all.filter(item => !item.read).length;
    accountPage("notifications", "BİLDİRİM MERKEZİ", "Bildirimler", "Bonus, sistem ve kampanya gelişmelerini kaçırma.", `
      <section class="gb-notification-toolbar">
        <div class="gb-filter-tabs">${[["all","Tümü"],["bonus","Bonuslar"],["system","Sistem"],["campaign","Kampanyalar"]].map(([key,label]) => `<button class="${state.notificationFilter === key ? "active" : ""}" onclick="gbSetNotificationFilter('${key}')">${label}${key === "all" ? `<span>${all.length}</span>` : ""}</button>`).join("")}</div>
        <button class="gb-secondary-btn" onclick="gbReadAllNotifications()">Tümünü okundu işaretle</button>
      </section>
      <section class="gb-notification-summary"><div><span>${unread}</span><p><b>Okunmamış bildirimin var</b><small>Son hesap hareketleri ve fırsatlar</small></p></div><i>${svg("bell")}</i></section>
      <section class="gb-notification-list">${filtered.length ? filtered.map(item => {
        const type = notificationType(item);
        return `<button class="${item.read ? "read" : "unread"}" onclick="gbReadNotification('${esc(item.id)}')"><i class="${type}">${svg(type === "bonus" ? "vip" : type === "campaign" ? "chart" : "bell")}</i><div><span>${type === "bonus" ? "BONUS" : type === "campaign" ? "KAMPANYA" : "SİSTEM"}</span><strong>${esc(item.title || "GalaxyBet bildirimi")}</strong><p>${esc(item.text || "")}</p><time>${esc(item.date || "—")}</time></div>${!item.read ? `<em>YENİ</em>` : ""}</button>`;
      }).join("") : `<div class="gb-empty">${svg("bell")}<b>Bu kategoride bildirim yok</b><span>Yeni gelişmeler burada görüntülenecek.</span></div>`}</section>
    `);
  };

  window.gbSupportChannel = function(channel){
    if(channel === "Canlı destek") return window.openTawkSupport?.();
    alert(`${channel} destek kanalı yönetim panelinden yapılandırıldığında burada açılacak.`);
  };
  window.renderSupport = function(){
    const tickets = user ? list("getSupportTickets").filter(item => item.username === user.username).sort((a,b) => Number(b.id || 0) - Number(a.id || 0)) : [];
    accountPage("support", "7/24 YARDIM", "Destek merkezi", "İhtiyacın olan yardıma en hızlı kanaldan ulaş.", `
      <section class="gb-support-feature">
        <div><i>${svg("support")}</i><span>7/24 CANLI DESTEK</span><h2>Gerçek bir destek uzmanıyla görüş</h2><p>Hesap ve finans işlemlerinde öncelikli destek ekibimiz yanında.</p><button class="gb-primary-btn" onclick="openTawkSupport()">Görüşmeyi Başlat ${svg("arrow")}</button></div>
        <strong>ORTALAMA YANIT<em>&lt; 2 dk</em></strong>
      </section>
      <section class="gb-contact-grid">
        <button onclick="gbSupportChannel('Telegram')"><i class="telegram">${svg("arrow")}</i><div><small>MESAJLAŞMA</small><strong>Telegram</strong><span>Hızlı destek hattı</span></div>${svg("arrow")}</button>
        <button onclick="gbSupportChannel('WhatsApp')"><i class="whatsapp">${svg("support")}</i><div><small>MESAJLAŞMA</small><strong>WhatsApp</strong><span>Mobil destek hattı</span></div>${svg("arrow")}</button>
        <button onclick="gbSupportChannel('E-posta')"><i class="email">${svg("bell")}</i><div><small>E-POSTA</small><strong>E-posta Desteği</strong><span>Detaylı talepler için</span></div>${svg("arrow")}</button>
      </section>
      <section class="gb-support-grid">
        <div class="gb-section-card"><header><div><span>YENİ TALEP</span><h2>Destek talebi oluştur</h2></div></header>${user ? `<div class="gb-support-form"><label><span>Konu</span><input id="supportSubject" placeholder="Yardım almak istediğin konu"></label><label><span>Mesajın</span><textarea id="supportMessage" placeholder="Sorunu detaylı şekilde anlat"></textarea></label><button class="gb-primary-btn full" onclick="createSupportTicket()">Talebi Gönder ${svg("arrow")}</button></div>` : `<div class="gb-empty compact"><b>Talep oluşturmak için giriş yap</b><button class="gb-primary-btn" onclick="loginModal()">Giriş Yap</button></div>`}</div>
        <div class="gb-section-card"><header><div><span>SIK SORULANLAR</span><h2>Hızlı cevaplar</h2></div></header><div class="gb-faq">
          <details><summary>Yatırımım ne zaman hesabıma geçer?<span>+</span></summary><p>Ödeme yöntemi ve banka yoğunluğuna göre işlemler genellikle birkaç dakika içinde tamamlanır.</p></details>
          <details><summary>Çekim talebimi nasıl takip ederim?<span>+</span></summary><p>Cüzdan ve Para Çek sayfalarında talebinin güncel durumunu görebilirsin.</p></details>
          <details><summary>Hesabımı nasıl doğrularım?<span>+</span></summary><p>Profilindeki hesap doğrulama alanından gerekli doğrulama adımlarını takip edebilirsin.</p></details>
          <details><summary>Bonus bakiyesi nasıl kullanılır?<span>+</span></summary><p>Her bonusun kullanım ve çevrim koşulları ilgili kampanya detayında belirtilir.</p></details>
        </div></div>
      </section>
      ${user ? `<section class="gb-section-card"><header><div><span>TALEPLERİM</span><h2>Destek geçmişi</h2></div><b>${tickets.length} kayıt</b></header>${tickets.length ? `<div class="gb-ticket-list">${tickets.map(ticket => `<article><i>${svg("support")}</i><div><b>${esc(ticket.subject)}</b><span>${esc(ticket.message)}</span><small>${esc(ticket.createdAt)}</small></div>${statusBadge(ticket.status)}</article>`).join("")}</div>` : `<div class="gb-empty compact"><b>Henüz destek talebin yok</b><span>Oluşturduğun talepler burada görünür.</span></div>`}</section>` : ""}
    `, true);
  };

  const vipTiers = [
    {name:"Bronze", min:0, color:"#bd7b50", perks:["Standart promosyon erişimi","7/24 destek","Haftalık özel görevler"]},
    {name:"Silver", min:5000, color:"#b9c5cc", perks:["Artırılmış bonus oranları","Daha hızlı finans işlemleri","Aylık sürpriz ödül"]},
    {name:"Gold", min:25000, color:"#f0c85a", perks:["Özel cashback fırsatları","Öncelikli destek","Kişisel kampanya teklifleri"]},
    {name:"Platinum", min:75000, color:"#9fe6dd", perks:["Yüksek işlem limitleri","Özel VIP etkinlikleri","Hızlandırılmış çekim"]},
    {name:"Diamond", min:200000, color:"#a9d8ff", perks:["Kişisel VIP temsilcisi","En yüksek özel limitler","Davete özel deneyimler"]}
  ];
  window.renderVip = function(){
    const m = user ? metrics() : {vip:"Bronze",deposited:0,progress:0};
    accountPage("vip", "GALAXYBET PRIVÉ", "VIP Kulübü", "Her seviyede daha seçkin ayrıcalıklar ve kişisel deneyimler.", `
      <section class="gb-vip-hero"><div><span>MEVCUT STATÜ</span><h2>${m.vip}</h2><p>${user ? "Oyunun büyüdükçe ayrıcalıkların da seninle büyür." : "VIP yolculuğunu başlatmak için hesabına giriş yap."}</p>${user ? `<div class="gb-progress"><i style="width:${m.progress}%"></i></div><small>${Math.round(m.progress)}% seviye ilerlemesi</small>` : `<button class="gb-primary-btn" onclick="loginModal()">VIP Yolculuğunu Başlat ${svg("arrow")}</button>`}</div><i>${svg("vip")}</i></section>
      <section class="gb-vip-grid">${vipTiers.map((tier,index) => `<article class="${m.vip === tier.name ? "current" : ""}" style="--tier:${tier.color}"><header><i>${svg("vip")}</i><span>LEVEL ${index + 1}</span></header><h3>${tier.name}</h3><p>${tier.min ? `${money(tier.min)} toplam yatırımdan itibaren` : "VIP dünyasına ilk adım"}</p><ul>${tier.perks.map(perk => `<li>${svg("shield")} ${perk}</li>`).join("")}</ul>${m.vip === tier.name ? `<b class="gb-current-tier">MEVCUT SEVİYEN</b>` : `<small>SEVİYE ${index + 1}</small>`}</article>`).join("")}</section>
      <section class="gb-vip-note">${svg("shield")}<p><b>Şeffaf seviye sistemi</b><span>VIP seviyeleri onaylanmış hesap hareketlerine göre otomatik hesaplanır.</span></p></section>
    `, true);
  };

  function referralCode(){
    const base = String(user?.username || "GALAXY").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0,8);
    return `${base}${String(user?.id || "24").replace(/\D/g, "").slice(-2) || "24"}`;
  }
  window.gbCopy = function(value, button){
    const done = () => { if(button){ const old = button.innerHTML; button.textContent = "Kopyalandı"; setTimeout(() => button.innerHTML = old, 1400); } };
    if(navigator.clipboard) navigator.clipboard.writeText(value).then(done).catch(() => { if(typeof copyText === "function") copyText(value); });
    else if(typeof copyText === "function") copyText(value);
  };
  window.renderReferralSystem = function(){
    if(!requireUser()) return;
    const code = referralCode();
    const link = `${location.origin}${location.pathname}?ref=${encodeURIComponent(code)}`;
    const users = list("getUsers").filter(item => String(item.referredBy || item.referralCode || "").toUpperCase() === code);
    const earnings = userTransactions().filter(item => String(item.type || "").toLocaleLowerCase("tr-TR").includes("referans"));
    const earned = sum(earnings, () => true);
    accountPage("referral", "DAVET & KAZAN", "Referans programı", "Arkadaşlarını GalaxyBet dünyasına davet et, birlikte kazan.", `
      <section class="gb-referral-hero"><div><span>TOPLAM REFERANS KAZANCI</span><strong>${money(earned)}</strong><p>${users.length} davet · ${users.filter(item => item.verified || item.kycVerified).length} doğrulanmış üye</p></div><i>${svg("referral")}</i></section>
      <section class="gb-referral-share">
        <div><small>REFERANS KODUN</small><p><strong>${esc(code)}</strong><button onclick="gbCopy('${esc(code)}',this)">${svg("copy")} Kopyala</button></p></div>
        <div class="link"><small>KİŞİSEL DAVET LİNKİN</small><p><span>${esc(link)}</span><button onclick="gbCopy('${esc(link)}',this)">${svg("copy")} Linki Kopyala</button></p></div>
      </section>
      <section class="gb-referral-steps"><article><b>01</b><div><strong>Linkini paylaş</strong><span>Kişisel davet linkini arkadaşlarına gönder.</span></div></article><article><b>02</b><div><strong>Üyelik tamamlansın</strong><span>Davetin hesabını oluşturup doğrulasın.</span></div></article><article><b>03</b><div><strong>Ödülünü kazan</strong><span>Hak edilen kazanç cüzdanına yansısın.</span></div></article></section>
      <section class="gb-split-grid referral">
        <div class="gb-section-card"><header><div><span>DAVETLER</span><h2>Davet edilen kullanıcılar</h2></div><b>${users.length} kişi</b></header>${users.length ? `<div class="gb-invite-list">${users.map(item => `<article><div class="gb-mini-avatar">${esc(item.username.slice(0,1).toUpperCase())}</div><div><b>${esc(item.username)}</b><span>${esc(item.createdAt || "Üyelik tamamlandı")}</span></div>${statusBadge(item.verified || item.kycVerified ? "Doğrulandı" : "Bekliyor")}</article>`).join("")}</div>` : `<div class="gb-empty compact">${svg("referral")}<b>Henüz davet edilen kullanıcı yok</b><span>Linkini paylaşarak referans ağını oluşturmaya başla.</span></div>`}</div>
        <div class="gb-section-card"><header><div><span>KAZANÇLAR</span><h2>Kazanç tablosu</h2></div><b>${earnings.length} kayıt</b></header>${earnings.length ? transactionRows(earnings,8) : `<div class="gb-empty compact">${svg("chart")}<b>Henüz referans kazancı yok</b><span>Hak edilen ödüller burada listelenecek.</span></div>`}</div>
      </section>
    `);
  };

  window.renderDepositPage = window.renderDepositSitePage;
  window.depositModal = window.renderDepositSitePage;
  window.withdrawModal = window.renderWithdrawSitePage;

})();
