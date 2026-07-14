(() => {
  "use strict";

  const API_URL = "/api/game-url";

  function getUser() {
    return typeof window.getAuthenticatedUser === "function"
      ? window.getAuthenticatedUser()
      : window.user || null;
  }

  function makeUsername(user) {
    let value = String(
      user?.username ||
      user?.id ||
      user?.email ||
      "bozobetuser"
    )
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 32);

    if (value.length < 4) {
      value = "user" + Date.now().toString().slice(-8);
    }

    return value;
  }

  async function launch(gameId, button) {
    const user = getUser();

    if (!user) {
      alert("Lütfen hesabınıza giriş yapın.");

      if (typeof window.loginModal === "function") {
        setTimeout(() => window.loginModal(), 100);
      }

      return;
    }

    if (!gameId) {
      alert("Oyunun gameId bilgisi bulunamadı.");
      return;
    }

    const oldText = button?.textContent || "Hemen Oyna";

    if (button) {
      button.disabled = true;
      button.textContent = "Oyun açılıyor...";
    }

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: makeUsername(user),
          gameId: String(gameId)
        })
      });

      const text = await response.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Sunucu geçersiz cevap verdi: " + text.slice(0, 100));
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
          data.message ||
          `Sunucu hatası: ${response.status}`
        );
      }

      if (!data.launchUrl) {
        throw new Error("Oyun açılış adresi gelmedi.");
      }

      // Popup engeline takılmaması için aynı sekmede aç
      window.location.assign(data.launchUrl);

    } catch (error) {
      console.error("Oyun açma hatası:", error);
      alert("Oyun açılamadı: " + error.message);

      if (button) {
        button.disabled = false;
        button.textContent = oldText;
      }
    }
  }

  // En son tanımlanan global fonksiyon
  window.rfOpenGame = function (gameId) {
    return launch(gameId, null);
  };

  window.openRapidGame = function (gameId) {
    return launch(gameId, null);
  };

  // Eski click kodlarını capture aşamasında durdur
  document.addEventListener("click", function (event) {
    const button = event.target.closest(
      ".rf-game-info button, .rapid-final-content button"
    );

    if (!button) return;

    const onclick = button.getAttribute("onclick") || "";

    const match =
      onclick.match(/rfOpenGame\(['"]([^'"]+)['"]\)/) ||
      onclick.match(/openRapidGame\(['"]([^'"]+)['"]\)/);

    if (!match?.[1]) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    launch(match[1], button);
  }, true);

  console.log("GalaxyBet launch-final aktif");
})();
