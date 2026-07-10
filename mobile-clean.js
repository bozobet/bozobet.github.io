(function () {
  const REPO_BASE = location.hostname.endsWith("github.io")
    ? "/bozobet-v2/"
    : "./";

  window.BB_ASSET = function (path) {
    return REPO_BASE + String(path || "").replace(/^\/+/, "");
  };

  function repairImages() {
    document.querySelectorAll("img").forEach((img) => {
      const src = img.getAttribute("src") || "";

      if (
        src.startsWith("assets/") ||
        src.startsWith("/assets/") ||
        src.includes("/bozobet-v2/assets/")
      ) {
        const clean = src
          .replace(/^https?:\/\/[^/]+\/bozobet-v2\//, "")
          .replace(/^\/bozobet-v2\//, "")
          .replace(/^\/+/, "");

        img.src = BB_ASSET(clean);
      }

      img.onerror = function () {
        const fallback = BB_ASSET("assets/mobile/icons/slot-icon.png");

        if (!this.dataset.fallbackApplied) {
          this.dataset.fallbackApplied = "1";
          this.src = fallback;
        } else {
          this.style.display = "none";
        }
      };
    });
  }

  function removeOldMobileBars() {
    document.querySelectorAll(
      ".bb-hard-mobile-login-bar," +
      ".bb-hard-mobile-login-bar-final," +
      ".bb-mobile-auth-actions," +
      ".bb-bottom-nav-final," +
      ".bb-bottom-nav-real"
    ).forEach((el) => el.remove());
  }

  function currentUser() {
    try {
      return (
        window.user ||
        JSON.parse(localStorage.getItem("bozobet_user") || "null") ||
        JSON.parse(localStorage.getItem("bozobet_current_user") || "null")
      );
    } catch {
      return window.user || null;
    }
  }

  function activeCouponCount() {
    const u = currentUser();
    if (!u) return 0;

    try {
      const all = [
        ...JSON.parse(localStorage.getItem("bozobet_bets") || "[]"),
        ...JSON.parse(localStorage.getItem("bozobet_coupons") || "[]")
      ];

      return all.filter((item) => {
        const status = String(item.status || "").toLowerCase();
        const active = [
          "active",
          "pending",
          "open",
          "waiting",
          "bekliyor"
        ].includes(status);

        const owner = String(
          item.userId ||
          item.username ||
          item.user ||
          ""
        );

        const sameUser =
          owner === String(u.id || "") ||
          owner === String(u.username || "");

        return active && sameUser;
      }).length;
    } catch {
      return 0;
    }
  }

  function renderCleanNav() {
    document.querySelectorAll(".bb-clean-nav").forEach((el) => el.remove());

    const nav = document.createElement("nav");
    nav.className = "bb-clean-nav";

    nav.innerHTML = `
      <button onclick="typeof renderHome==='function' && renderHome()">
        <img src="${BB_ASSET("assets/mobile/icons/nav-home.png")}">
        <b>Ana Sayfa</b>
      </button>

      <button onclick="typeof renderSports==='function' && renderSports()">
        <img src="${BB_ASSET("assets/mobile/icons/nav-sports.png")}">
        <b>Spor</b>
      </button>

      <button onclick="typeof renderCasino==='function' && renderCasino()">
        <img src="${BB_ASSET("assets/mobile/icons/nav-casino.png")}">
        <b>Casino</b>
      </button>

      <button class="coupon" onclick="typeof renderCoupon==='function' ? renderCoupon() : alert('Kuponunuz boş.')">
        <img src="${BB_ASSET("assets/mobile/icons/nav-coupon.png")}">
        <i>${activeCouponCount()}</i>
        <b>Kupon</b>
      </button>

      <button onclick="currentUser() ? (typeof renderProfile==='function' && renderProfile()) : (typeof loginModal==='function' && loginModal())">
        <img src="${BB_ASSET("assets/mobile/icons/nav-account.png")}">
        <b>Hesabım</b>
      </button>
    `;

    document.body.appendChild(nav);
    repairImages();
  }

  function repairAuthArea() {
    const user = currentUser();

    document.querySelectorAll(
      ".bb-mobile-auth-actions,.bb-hard-mobile-login-bar,.bb-hard-mobile-login-bar-final"
    ).forEach((el) => el.remove());

    if (user) return;

    const duplicateButtons = [...document.querySelectorAll("button,a")]
      .filter((el) => {
        const text = String(el.textContent || "").trim().toLowerCase();
        return text === "üye ol" || text === "giriş yap";
      });

    duplicateButtons.forEach((el, index) => {
      if (index > 1 && !el.closest("header")) {
        el.style.display = "none";
      }
    });
  }

  function applyFixes() {
    removeOldMobileBars();
    repairImages();
    repairAuthArea();
    renderCleanNav();
  }

  window.addEventListener("load", () => {
    setTimeout(applyFixes, 150);
    setTimeout(applyFixes, 800);
  });

  document.addEventListener("click", () => {
    setTimeout(() => {
      repairImages();
      renderCleanNav();
    }, 180);
  });
})();
