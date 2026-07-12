export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const provider = req.query.provider;

    if (!provider) {
      return res.status(400).json({ error: "provider is required" });
    }

    const response = await fetch(
      `https://livecasinoapi.betnex.co/casino/getallgamesandprovider?provider=${encodeURIComponent(provider)}`,
      {
        headers: {
          "x-betnex-key": process.env.BETNEX_API_KEY
        }
      }
    );

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
