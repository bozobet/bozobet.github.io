(() => {
  "use strict";

  const winners = [
    ["Ali K.", "Pragmatic Play", "Sweet Bonanza", 48250],
    ["Emre T.", "Evolution", "Lightning Roulette", 19800],
    ["Murat A.", "Pragmatic Play", "Gates of Olympus", 132450],
    ["Selin D.", "Spribe", "Aviator", 27640],
    ["Kerem Y.", "Hacksaw", "Wanted Dead or a Wild", 61320]
  ];

  const providers = ["Pragmatic Play", "Evolution", "Spribe", "Hacksaw", "Play'n GO", "NetEnt", "Nolimit City", "BGaming"];
  let jackpotTimer = null;
  let enhanceQueued = false;

  const icon = paths => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
  const icons = {
    fire:icon('<path d="M12 22c4 0 7-2.7 7-6.5 0-3-1.7-5.5-4.3-7.8.2 2-1 3.3-2 4-1-4-3.3-6.8-6-9.7.2 4-2 6-2 9.5C4 17.3 7.5 22 12 22Z"/><path d="M9.5 18.5c0-2 1-3.3 2.7-5 0 1.5 1.3 2.3 1.3 3.7 0 1.5-.8 2.8-2 2.8-1.1 0-2-.6-2-1.5Z"/>'),
    deposit:icon('<path d="M12 3v12m-4-4 4 4 4-4M4 19h16"/>'),
    withdraw:icon('<path d="M12 16V4m-4 4 4-4 4 4M4 20h16"/>'),
    support:icon('<circle cx="12" cy="12" r="9"/><path d="M7 15v-3a5 5 0 0 1 10 0v3M7 14H5v3h2m10-3h2v3h-2"/>'),
    shield:icon('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-5"/>'),
    bolt:icon('<path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z"/>'),
    gift:icon('<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 12h18M7.5 8C5 8 4 6.8 4 5.4 4 4 5 3 6.3 3 8.5 3 10 5.2 12 8m4.5 0C19 8 20 6.8 20 5.4 20 4 19 3 17.7 3 15.5 3 14 5.2 12 8"/>'),
    lock:icon('<rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>'),
    arrow:icon('<path d="M5 12h14m-5-5 5 5-5 5"/>'),
    mail:icon('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
    telegram:icon('<path d="m21 3-7.5 18-4.2-7.2L3 10.5 21 3Z"/><path d="m9.3 13.8 5.2-4.7"/>'),
    whatsapp:icon('<path d="M20 11.6a8 8 0 0 1-11.8 7L4 20l1.4-4A8 8 0 1 1 20 11.6Z"/><path d="M9 8.5c.4 2.8 2 4.4 4.8 4.9"/>')
  };

  function activityBar(){
    const items = winners.map(([name, studio, game, amount]) => `<span><i></i><b>${name}</b> ${studio} <strong>${game}</strong> oyununda <em>₺${amount.toLocaleString("tr-TR")}</em> kazandı.</span>`).join("");
    return `<section class="gb-live-activity" aria-label="Son kazançlar"><div class="gb-live-label"><i></i> CANLI KAZANÇLAR</div><div class="gb-live-window"><div class="gb-live-track">${items}${items}</div></div><small>● LIVE</small></section>`;
  }

  function heroCards(){
    const cards = [
      ["fire","Bugünün En Popülerleri","Oyuncuların en çok tercih ettiklerini keşfet","popular"],
      ["deposit","Hızlı Yatırım","Güvenli yöntemlerle dakikalar içinde","deposit"],
      ["withdraw","7/24 Çekim","Kesintisiz ve şeffaf finans deneyimi","withdraw"],
      ["support","Canlı Destek","Uzman destek ekibi her an yanında","support"]
    ];
    return `<section class="gb-hero-glass-grid gb-reveal">${cards.map(([ico,title,text,action]) => `<button type="button" data-gb-home-action="${action}"><i>${icons[ico]}</i><div><strong>${title}</strong><span>${text}</span></div>${icons.arrow}</button>`).join("")}</section>`;
  }

  function jackpots(){
    const data = [
      ["MEGA JACKPOT",28745620.42,"mega","Bir sonraki büyük kazanç senin olabilir"],
      ["MAJOR JACKPOT",4812940.18,"major","Premium oyun havuzunda büyüyor"],
      ["MINOR JACKPOT",684320.55,"minor","Her dakika yeni fırsatlar" ]
    ];
    return `<section class="gb-home-section home-section gb-jackpot-section gb-reveal"><header><div><span>CANLI ÖDÜL HAVUZU</span><h2>Jackpot dünyası</h2><p>Ödül havuzları gerçek zamanlı olarak büyümeye devam ediyor.</p></div><b><i></i> CANLI</b></header><div class="gb-jackpot-grid">${data.map(([title,value,type,text]) => `<article class="${type}"><div class="gb-jackpot-top"><span>${title}</span><i>${icons.bolt}</i></div><strong class="gb-jackpot-number" data-jackpot="${value}">₺${value.toLocaleString("tr-TR", {minimumFractionDigits:2,maximumFractionDigits:2})}</strong><p>${text}</p><div class="gb-jackpot-meter"><i></i></div></article>`).join("")}</div></section>`;
  }

  function providerCards(){
    return `<section class="gb-home-section home-section gb-provider-section gb-reveal"><header><div><span>GLOBAL STÜDYOLAR</span><h2>Oyun sağlayıcıları</h2><p>Gambit Stage bağlantısına hazır premium sağlayıcı ağı.</p></div><small>8 SAĞLAYICI</small></header><div class="gb-provider-grid">${providers.map((name,index) => `<article><i>${String(index + 1).padStart(2,"0")}</i><div class="gb-provider-mark">${name.split(" ").map(part => `<b>${part}</b>`).join("")}</div><span>PREMIUM PROVIDER</span></article>`).join("")}</div></section>`;
  }

  function whyGalaxy(){
    const benefits = [
      ["withdraw","Anında Çekim","Kazançlarını günün her saati hızlı ve şeffaf şekilde çek."],
      ["lock","Güvenli Ödeme","Gelişmiş güvenlik katmanlarıyla korunan finans işlemleri."],
      ["support","7/24 Destek","Deneyimli destek ekibi ihtiyaç duyduğun her an yanında."],
      ["gift","Yüksek Bonuslar","Sana özel kampanyalar ve premium bonus fırsatları."]
    ];
    return `<section class="gb-home-section home-section gb-why-section gb-reveal"><header><div><span>GALAXYBET DENEYİMİ</span><h2>Neden GalaxyBet?</h2><p>Her detayında hız, güven ve ayrıcalık.</p></div></header><div class="gb-why-grid">${benefits.map(([ico,title,text],index) => `<article><small>0${index + 1}</small><i>${icons[ico]}</i><h3>${title}</h3><p>${text}</p><span>DAHA FAZLA ${icons.arrow}</span></article>`).join("")}</div></section>`;
  }

  function supportStrip(){
    const channels = [["telegram","Telegram"],["whatsapp","WhatsApp"],["mail","E-posta"]];
    return `<section class="gb-home-support gb-reveal"><div><span>YARDIMA MI İHTİYACIN VAR?</span><h2>Premium destek, her an yanında.</h2><p>İletişim kanalları yakında aktif hale gelecek.</p></div><div>${channels.map(([ico,title]) => `<button type="button" data-placeholder-channel="${title}"><i>${icons[ico]}</i><span><small>DESTEK KANALI</small><b>${title}</b></span>${icons.arrow}</button>`).join("")}</div></section>`;
  }

  function footer(){
    const links = ["Lisans","KVKK","Gizlilik","Kullanım Şartları","Sorumlu Oyun","İletişim"];
    return `<footer class="gb-premium-footer gb-reveal"><div class="gb-footer-main"><div class="gb-footer-brand"><img src="assets/galaxybet/logo.png?v=3" alt="GalaxyBet" loading="lazy" decoding="async"><p>Yeni nesil premium bahis ve eğlence deneyimi. Güvenli, hızlı ve her zaman seninle.</p><span>${icons.shield} Güvenli platform</span></div><nav><small>YASAL &amp; KURUMSAL</small>${links.map(link => `<button type="button" data-footer-placeholder="${link}">${link}</button>`).join("")}</nav><div class="gb-footer-responsible"><small>SORUMLU OYUN</small><strong>18+</strong><p>Bahis eğlence amaçlıdır. Kaybetmeyi göze alamayacağınız tutarlarla oynamayın.</p></div></div><div class="gb-footer-bottom"><span>© 2026 GalaxyBet. Tüm hakları saklıdır.</span><div><b>SSL</b><b>256 BIT</b><b>RESPONSIBLE GAMING</b></div><small>GalaxyBet · Premium Experience</small></div></footer>`;
  }

  function skeleton(){
    return `<div class="gb-home-skeleton" aria-hidden="true"><div class="gb-sk-bar"></div><div class="gb-sk-hero"></div><div class="gb-sk-cards">${Array(4).fill('<i></i>').join("")}</div><div class="gb-sk-lines"><i></i><i></i><i></i></div></div>`;
  }

  function setLazyImages(wrap){
    const heroImages = [...wrap.querySelectorAll(".hero-slide-img,.mobile-hero-slide")];
    wrap.querySelectorAll("img").forEach(img => {
      img.decoding = "async";
      img.loading = heroImages[0] === img ? "eager" : "lazy";
    });
    if(heroImages[0]) heroImages[0].fetchPriority = "high";
  }

  function startJackpots(){
    clearInterval(jackpotTimer);
    jackpotTimer = setInterval(() => {
      const numbers = document.querySelectorAll(".gb-jackpot-number");
      if(!numbers.length){ clearInterval(jackpotTimer);jackpotTimer = null;return; }
      numbers.forEach((node,index) => {
        const current = Number(node.dataset.jackpot || 0) + (Math.random() * (index === 0 ? 8 : index === 1 ? 3 : .8));
        node.dataset.jackpot = current.toFixed(2);
        node.textContent = `₺${current.toLocaleString("tr-TR", {minimumFractionDigits:2,maximumFractionDigits:2})}`;
      });
    }, 140);
  }

  function initReveal(wrap){
    if(!("IntersectionObserver" in window)){
      wrap.querySelectorAll(".gb-reveal").forEach(node => node.classList.add("visible"));
      return;
    }
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if(entry.isIntersecting){ entry.target.classList.add("visible");observer.unobserve(entry.target); }
    }), {threshold:.12,rootMargin:"0px 0px -35px"});
    wrap.querySelectorAll(".gb-reveal").forEach(node => observer.observe(node));
  }

  function enhanceHome(){
    enhanceQueued = false;
    const app = document.getElementById("app");
    const hero = app?.querySelector(".hero-slider,.mobile-hero-slider");
    const wrap = hero?.closest(".wrap");
    if(!hero || !wrap){ if(jackpotTimer){clearInterval(jackpotTimer);jackpotTimer=null;} return; }
    if(wrap.dataset.premiumHome === "1") return;
    wrap.dataset.premiumHome = "1";
    wrap.classList.add("gb-premium-home","gb-page-enter");

    hero.insertAdjacentHTML("beforebegin", activityBar());
    hero.insertAdjacentHTML("afterend", heroCards());

    const category = wrap.querySelector(".category-row");
    const mobileContent = wrap.querySelector(".bb-mobile-home-content");
    const jackpotAnchor = mobileContent || wrap.querySelector(".main-grid") || category;
    jackpotAnchor?.insertAdjacentHTML("beforebegin", jackpots());

    const promo = wrap.querySelector(".promos,.mobile-home-section:has(.mobile-promotion-row)");
    const providerAnchor = mobileContent || promo || wrap.querySelector(".trust");
    providerAnchor?.insertAdjacentHTML("afterend", providerCards() + whyGalaxy() + supportStrip() + footer());

    wrap.querySelector(".footer")?.remove();
    wrap.querySelector(".trust")?.remove();
    wrap.querySelector(".mobile-home-trust")?.remove();
    wrap.querySelector(".mobile-provider-section")?.remove();

    wrap.insertAdjacentHTML("afterbegin", skeleton());
    setLazyImages(wrap);
    initReveal(wrap);
    startJackpots();
    requestAnimationFrame(() => wrap.classList.add("gb-page-ready"));
    setTimeout(() => wrap.querySelector(".gb-home-skeleton")?.classList.add("hidden"), 520);
    setTimeout(() => wrap.querySelector(".gb-home-skeleton")?.remove(), 900);
  }

  function queueEnhance(){
    if(enhanceQueued) return;
    enhanceQueued = true;
    requestAnimationFrame(enhanceHome);
  }

  document.addEventListener("click", event => {
    const action = event.target.closest("[data-gb-home-action]")?.dataset.gbHomeAction;
    if(action){
      if(action === "deposit") return window.renderDepositSitePage?.();
      if(action === "withdraw") return window.renderWithdrawSitePage?.();
      if(action === "support") return window.renderSupport?.();
      document.querySelector(".bb-mobile-home-content,.main-grid")?.scrollIntoView({behavior:"smooth",block:"start"});
    }
    const channel = event.target.closest("[data-placeholder-channel]")?.dataset.placeholderChannel;
    if(channel) alert(`${channel} destek bağlantısı yakında aktif olacak.`);
    const footerLink = event.target.closest("[data-footer-placeholder]")?.dataset.footerPlaceholder;
    if(footerLink) alert(`${footerLink} sayfası yakında yayınlanacak.`);
  });

  const app = document.getElementById("app");
  if(app) new MutationObserver(queueEnhance).observe(app,{childList:true,subtree:false});

  if(typeof window.renderHome === "function"){
    const original = window.renderHome;
    window.renderHome = function(){
      const result = original.apply(this,arguments);
      queueEnhance();
      return result;
    };
  }

  queueEnhance();
  window.addEventListener("load",queueEnhance);
})();
