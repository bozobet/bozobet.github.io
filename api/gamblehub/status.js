import {
  allowMethods,
  applyCors
} from "../_lib/gamblehub.js";
import { getMissingCredentials } from "../../services/gambleHub.js";

export default async function handler(req, res) {
  if (applyCors(req, res, ["GET"])) return;
  if (!allowMethods(req, res, ["GET"])) return;
  const missing = getMissingCredentials();
  return res.status(200).json({
    ok:true,
    configured:missing.length === 0,
    environment:"stage",
    missing
  });
}
