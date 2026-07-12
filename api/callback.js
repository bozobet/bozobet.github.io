export default async function handler(req, res) {
  console.log("========== CALLBACK ==========");
  console.log("Method:", req.method);
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);

  return res.status(200).json({
    success: true,
    handle: true,
    money: 999999,
    msg: "OK"
  });
}
