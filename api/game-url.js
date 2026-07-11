export const runtime = "nodejs";
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://finance-agentix.github.io");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { username, gameId } = req.body || {};

  const cleanUsername = String(username || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 32);

  if (cleanUsername.length < 4) {
    return res.status(400).json({
      error: "Geçerli kullanıcı adı gerekli"
    });
  }

  if (!gameId) {
    return res.status(400).json({
      error: "gameId gerekli"
    });
  }

  try {
    const response = await fetch(
      "https://live-casino-slots-evolution-jili-and-50-plus-provider.p.rapidapi.com/getgameurl",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-rapidapi-host":
            "live-casino-slots-evolution-jili-and-50-plus-provider.p.rapidapi.com",
          "x-rapidapi-key": process.env.RAPIDAPI_KEY
        },
        body: JSON.stringify({
          username: cleanUsername,
          gameId: String(gameId),
          lang: "tr",
          money: 0,
          home_url:
            "https://finance-agentix.github.io/bozobet-v2/",
          platform: 1,
          currency: "INR"
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    const launchUrl =
      data?.payload?.game_launch_url ||
      data?.game_launch_url ||
      data?.url ||
      data?.gameUrl ||
      "";

    if (!launchUrl) {
      return res.status(502).json({
        error: "Oyun bağlantısı alınamadı",
        apiResponse: data
      });
    }

    return res.status(200).json({
      success: true,
      launchUrl,
      gameName: data?.payload?.game_name || "",
      provider: data?.payload?.provider || ""
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}
