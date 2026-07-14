import {
  allowMethods,
  applyCors,
  parseJsonBody
} from "../_lib/gamblehub.js";
import { openGame, StageCredentialsRequiredError } from "../../services/gambleHub.js";

export default async function handler(req, res) {
  if (applyCors(req, res, ["POST"])) return;
  if (!allowMethods(req, res, ["POST"])) return;
  try {
    const body = parseJsonBody(req);
    const result = await openGame({
      gameId:body.gameId,
      playerLogin:body.playerLogin,
      exitUrl:body.exitUrl
    });
    const data = result.data;
    const gameUrl = data?.content?.game?.url;
    const sessionId = data?.content?.gameRes?.sessionId;
    if (typeof gameUrl !== "string" || !gameUrl.startsWith("https://") || typeof sessionId !== "string" || !sessionId) {
      const error = new Error("Invalid Gamble Hub response");
      error.code = "invalid_provider_response";
      throw error;
    }
    return res.status(200).json({ ok:true, gameUrl, sessionId, demo:true });
  } catch (error) {
    if (error instanceof StageCredentialsRequiredError) {
      return res.status(503).json({ ok:false, error:"stage_credentials_required", message:error.message, missing:error.missing });
    }
    if (error?.name === "ValidationError" || error?.code === "invalid_request") {
      return res.status(400).json({ ok:false, error:"invalid_request" });
    }
    console.error("Gamble Hub openGame failed", { code:error?.code || "unknown" });
    return res.status(502).json({ ok:false, error:error?.code || "open_game_provider_error" });
  }
}
