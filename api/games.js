export default async function handler(req, res) {
  try {
    const provider = req.query.provider;

    const response = await fetch(
      `https://livecasinoapi.betnex.co/casino/getallgamesandprovider?provider=${encodeURIComponent(provider)}`,
      {
        headers: {
          "x-betnex-key": process.env.BETNEX_API_KEY
        }
      }
    );

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}