import { getConfig, verifySignature } from "../../services/gambleHub.js";

const MOCK_BALANCE = 100000;

function rawRequestBody(req) {
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody;
  if (typeof req.rawBody === "string") return req.rawBody;
  if (typeof req.body === "string") return req.body;
  return JSON.stringify(req.body || {});
}

function requestSignature(req) {
  return String(req.headers?.["x-signature"] || req.headers?.["X-Signature"] || "").trim();
}

export function handleWalletCallback(req, res, action) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success:false, error:"method_not_allowed" });
  }

  const config = getConfig();
  const signature = requestSignature(req);
  const signatureVerified = config.secretKey
    ? verifySignature(rawRequestBody(req), signature, config.secretKey)
    : false;

  // Once GH_SECRET_KEY exists, unsigned or modified wallet callbacks are rejected.
  if (config.secretKey && !signatureVerified) {
    return res.status(401).json({ success:false, error:"invalid_signature" });
  }

  return res.status(200).json({
    success:true,
    status:"success",
    action,
    balance:MOCK_BALANCE,
    money:MOCK_BALANCE,
    currency:config.currency,
    mock:true,
    signatureVerified
  });
}

export { MOCK_BALANCE };
