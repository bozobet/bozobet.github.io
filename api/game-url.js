export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      username,
      gameId,
      money = 1000
    } = req.body;

    const response = await fetch(
      "https://livecasinoapi.betnex.co/casino/getgameurl",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-betnex-key": process.env.BETNEX_API_KEY
        },
        body: JSON.stringify({
          username,
          gameId,
          money,
          platform: 1,
          currency: "TRY",
          home_url: "https://bozobet.github.io",
          lang: "tr"
        })
      }
    );

    const data = await response.json();

    return res.status(response.status).json(data);

  } catch (e) {
    return res.status(500).json({
      error: e.message
    });
  }
}