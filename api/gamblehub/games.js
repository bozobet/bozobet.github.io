import {
  allowMethods,
  applyCors
} from "../_lib/gamblehub.js";
import { getConfig, getGames, StageCredentialsRequiredError } from "../../services/gambleHub.js";

export default async function handler(req, res) {
  if (applyCors(req, res, ["GET"])) return;
  if (!allowMethods(req, res, ["GET"])) return;
  try {
    const config = getConfig();
    const data = await getGames(config.currency);
    const list = Array.isArray(data) ? data : (Array.isArray(data?.games) ? data.games : []);
    const games = list.filter(game => game?.isEnabled === true).map(game => ({
      id:String(game.id || ""),
      title:String(game.title || ""),
      imageUrl:String(game.imageUrl || ""),
      provider:String(game.provider || ""),
      isEnabled:true
    })).filter(game => game.id && game.title);
    return res.status(200).json({ ok:true, games });
  } catch (error) {
    if (error instanceof StageCredentialsRequiredError) {
      return res.status(503).json({ ok:false, error:"stage_credentials_required", message:error.message, missing:error.missing });
    }
    console.error("Gamble Hub games failed", { code:error?.code || "unknown" });
    return res.status(502).json({ ok:false, error:error?.code || "games_provider_error" });
  }
}
