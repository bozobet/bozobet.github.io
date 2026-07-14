(function exposeGalaxyBetAssets() {
  const version = "3";
  const bannerFiles = [
    "banner-01.png",
    "banner-02.png",
    "banner-03.png",
    "banner-04.png",
    "banner-05.png",
    "banner-06.png",
    "banner-07.png",
    "banner-08.png",
    "banner-09.png",
    "banner-10.png",
    "banner-11.png",
    "banner-12.png",
    "banner-13.png",
    "banner-14.png",
    "banner-15.png",
    "banner-16.png",
    "banner-17.png",
    "banner-18.png",
    "banner-19.png",
    "banner-20.png",
    "banner-21.png",
    "banner-22.png"
  ];
  const assetUrl = file => `assets/galaxybet/banners/${file}?v=${version}`;
  const sliderFiles = bannerFiles;
  const promotionFiles = bannerFiles.slice(6, 12);
  const campaignFiles = bannerFiles;
  const campaignDetails = [
    {title:"%25 Çevrimsiz Yatırım Bonusu", description:"Her yatırımında anında tanımlanan %25 çevrimsiz bonusla bakiyeni güçlendir, kazancını özgürce kullan."},
    {title:"%50 Spor Yatırım Bonusu", description:"Spor bahislerine özel %50 yatırım desteğiyle kuponlarını daha güçlü oranlar ve daha yüksek potansiyelle oluştur."},
    {title:"%75 Casino Bonusu", description:"Seçili casino oyunlarında geçerli %75 bonusla eğlenceye daha yüksek bakiye avantajıyla başla."},
    {title:"%150 Hoş Geldin Bonusu", description:"GalaxyBet dünyasına ilk adımında yatırımını %150 hoş geldin bonusuyla büyüt ve ayrıcalıklı başlangıcın tadını çıkar."},
    {title:"%200 Hoş Geldin Bonusu", description:"Yeni üyelere özel %200 başlangıç paketiyle ilk yatırımını üç katına varan oyun bakiyesine dönüştür."},
    {title:"%10 Kayıp Bonusu", description:"Haftalık net kaybının %10'unu geri al; favori spor ve casino deneyimlerine kaldığın yerden devam et."},
    {title:"%25 Arkadaşını Getir Bonusu", description:"Davet bağlantını paylaş, arkadaşın aramıza katıldığında uygun yatırımlar üzerinden %25 referans ödülü kazan."},
    {title:"%15 Anında Yatırım Bonusu", description:"Her uygun yatırımında %15 bonus anında hesabına tanımlansın; beklemeden daha fazlasını oyna."},
    {title:"%50 Hafta Sonu Bonusu", description:"Hafta sonuna özel %50 yatırım fırsatıyla tatil keyfini ve oyun bakiyeni birlikte yükselt."},
    {title:"%100 İlk Yatırım Bonusu", description:"İlk yatırımını %100 bonusla ikiye katla; spor ve casino dünyasına avantajlı bir başlangıç yap."},
    {title:"%50 Spor Kayıp Bonusu", description:"Spor bahislerindeki haftalık net kaybının %50'sine varan kısmını bonus olarak geri kazan."},
    {title:"%30 Çevrimsiz Yatırım Bonusu", description:"Yatırımına eklenen %30 çevrimsiz bonusla kazançlarını ek çevrim koşulu olmadan değerlendirme fırsatı yakala."},
    {title:"VIP İlk Yatırım Paketi", description:"VIP üyelerine özel ilk yatırım bonusu, çevrimsiz destek ve öncelikli ayrıcalıklarla seçkin bir başlangıç yap."},
    {title:"Hafta Sonu Bonus Festivali", description:"Yatırım, hoş geldin, cashback ve freespin fırsatlarını tek pakette buluşturan hafta sonu festivaline katıl."},
    {title:"%75 Yatırım Bonusu", description:"İlk yatırımına özel %75 bonus ve devam eden kayıp desteğiyle oyun deneyimini daha güçlü başlat."},
    {title:"%100 Kripto Yatırım Bonusu", description:"Kripto para yatırımlarına özel %100 bonusla dijital cüzdanından hızlıca yatırım yap, bakiyeni ikiye katla."},
    {title:"Kazancını Bonuslarla Büyüt", description:"Çevrimsiz, yatırım ve arkadaşını getir fırsatlarını bir arada değerlendirerek her adımda ek avantaj kazan."},
    {title:"Bahse Gir, Kazan", description:"İlk yatırım, kombine kupon ve günlük kayıp fırsatlarıyla spor heyecanını çok katmanlı bonuslarla yaşa."},
    {title:"100 Free Spin Zafer Paketi", description:"Yatırım, kayıp ve çevrimsiz bonuslara ek 100 ücretsiz dönüşle kazanç yolculuğuna güçlü bir başlangıç yap."},
    {title:"%100 Hazine Yatırım Bonusu", description:"İlk yatırımını %100 bonusla büyüt; çevrimsiz ve kayıp desteğiyle GalaxyBet hazinesini keşfet."},
    {title:"Gece Başlar, Kazanç Seninle", description:"Geceye özel hoş geldin, çevrimsiz ve kayıp bonuslarını birleştiren premium eğlence paketinden yararlan."},
    {title:"250 Free Spin Hazine Paketi", description:"%50 çevrimsiz bonus, 250 free spin ve yatırım avantajlarını bir araya getiren kapsamlı hazine paketini keşfet."}
  ];

  window.GALAXYBET_ASSETS = Object.freeze({
    logo: `assets/galaxybet/logo.png?v=${version}`,
    favicon: `assets/galaxybet/favicon.png?v=${version}`,
    // Keep `banners` as a compatibility alias for the six homepage slides.
    banners: Object.freeze(sliderFiles.map(assetUrl)),
    slider: Object.freeze(sliderFiles.map(assetUrl)),
    promotions: Object.freeze(promotionFiles.map(assetUrl)),
    campaigns: Object.freeze(campaignFiles.map(assetUrl)),
    campaignDetails: Object.freeze(campaignDetails.map(item => Object.freeze(item)))
  });
})();
