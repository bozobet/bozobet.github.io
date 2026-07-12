export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const response = await fetch(
      "https://livecasinoapi.betnex.co/casino/getallproviders",
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
