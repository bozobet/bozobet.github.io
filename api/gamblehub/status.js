import {
  allowMethods,
  applyCors,
  GAMBLEHUB_ENV_KEYS,
  getMissingConfig
} from "../_lib/gamblehub.js";

export default async function handler(req, res) {
  if (applyCors(req, res, ["GET"])) return;
  if (!allowMethods(req, res, ["GET"])) return;
  const missing = getMissingConfig(GAMBLEHUB_ENV_KEYS);
  return res.status(200).json({
    ok:true,
    configured:missing.length === 0,
    environment:"stage",
    missing
  });
}
