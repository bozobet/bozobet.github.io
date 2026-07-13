import {
  allowMethods,
  applyCors,
  getGambleHubConfig,
  getMissingConfig,
  handleApiError,
  officeAuthorizedGet,
  readProviderJson,
  sendSetupRequired,
  UpstreamError
} from "../_lib/gamblehub.js";

const REQUIRED = ["GAMBLEHUB_API_LOGIN", "GAMBLEHUB_API_PASSWORD", "GAMBLEHUB_USER_ID"];

export default async function handler(req, res) {
  if (applyCors(req, res, ["GET"])) return;
  if (!allowMethods(req, res, ["GET"])) return;
  if (getMissingConfig(REQUIRED).length) return sendSetupRequired(res, REQUIRED);
  try {
    const config = getGambleHubConfig();
    const path = "/users/" + encodeURIComponent(config.userId) + "/getUserGames/" + encodeURIComponent(config.currency);
    const response = await officeAuthorizedGet(path);
    const data = await readProviderJson(response);
    if (!response.ok) throw new UpstreamError(response.status === 401 ? "provider_auth_failed" : "games_provider_error", response.status);
    const list = Array.isArray(data) ? data : [];
    const games = list.filter(game => game?.isEnabled === true).map(game => ({
      id:String(game.id || ""),
      title:String(game.title || ""),
      imageUrl:String(game.imageUrl || ""),
      provider:String(game.provider || ""),
      isEnabled:true
    })).filter(game => game.id && game.title);
    return res.status(200).json({ ok:true, games });
  } catch (error) {
    return handleApiError(error, res);
  }
}
