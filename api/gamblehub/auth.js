import {
  allowMethods,
  applyCors
} from "../_lib/gamblehub.js";
import { login, StageCredentialsRequiredError } from "../../services/gambleHub.js";

export default async function handler(req, res) {
  if (applyCors(req, res, ["POST"])) return;
  if (!allowMethods(req, res, ["POST"])) return;
  try {
    const data = await login();
    return res.status(200).json({ ok:true, authenticated:true, user:data?.user || null });
  } catch (error) {
    if (error instanceof StageCredentialsRequiredError) {
      return res.status(503).json({ ok:false, error:"stage_credentials_required", message:error.message, missing:error.missing });
    }
    console.error("Gamble Hub login failed", { code:error?.code || "unknown" });
    return res.status(502).json({ ok:false, error:error?.code || "provider_auth_error" });
  }
}
