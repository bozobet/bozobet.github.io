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
  const sliderFiles = bannerFiles.slice(0, 6);
  const promotionFiles = bannerFiles.slice(6, 12);
  const campaignFiles = bannerFiles.slice(12, 22);

  window.GALAXYBET_ASSETS = Object.freeze({
    logo: `assets/galaxybet/logo.png?v=${version}`,
    favicon: `assets/galaxybet/favicon.png?v=${version}`,
    // Keep `banners` as a compatibility alias for the six homepage slides.
    banners: Object.freeze(sliderFiles.map(assetUrl)),
    slider: Object.freeze(sliderFiles.map(assetUrl)),
    promotions: Object.freeze(promotionFiles.map(assetUrl)),
    campaigns: Object.freeze(campaignFiles.map(assetUrl))
  });
})();
