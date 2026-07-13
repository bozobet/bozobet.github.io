import {
  allowMethods,
  applyCors,
  clientPost,
  getMissingConfig,
  handleApiError,
  normalizeOpenGameBody,
  parseJsonBody,
  readProviderJson,
  requireGambleHubConfig,
  sendSetupRequired,
  signRawBody,
  UpstreamError
} from "../_lib/gamblehub.js";

const REQUIRED = ["GAMBLEHUB_USER_ID", "GAMBLEHUB_SECRET_API_KEY"];

export default async function handler(req, res) {
  if (applyCors(req, res, ["POST"])) return;
  if (!allowMethods(req, res, ["POST"])) return;
  if (getMissingConfig(REQUIRED).length) return sendSetupRequired(res, REQUIRED);
  try {
    const config = requireGambleHubConfig(REQUIRED);
    const payload = normalizeOpenGameBody(parseJsonBody(req), config);
    const rawBody = JSON.stringify(payload);
    const signature = signRawBody(rawBody, config.secretApiKey);
    const response = await clientPost("/games/openGame", rawBody, signature);
    const data = await readProviderJson(response);
    if (!response.ok || data?.status !== "success") throw new UpstreamError("open_game_provider_error", response.status);
    const gameUrl = data?.content?.game?.url;
    const sessionId = data?.content?.gameRes?.sessionId;
    if (typeof gameUrl !== "string" || !gameUrl.startsWith("https://") || typeof sessionId !== "string" || !sessionId) {
      throw new UpstreamError("invalid_provider_response", response.status);
    }
    return res.status(200).json({ ok:true, gameUrl, sessionId, demo:payload.demo === "1" });
  } catch (error) {
    return handleApiError(error, res);
  }
}
