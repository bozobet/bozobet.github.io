import {
  allowMethods,
  applyCors,
  getAccessToken,
  getMissingConfig,
  handleApiError,
  sendSetupRequired
} from "../_lib/gamblehub.js";

const REQUIRED = ["GAMBLEHUB_API_LOGIN", "GAMBLEHUB_API_PASSWORD"];

export default async function handler(req, res) {
  if (applyCors(req, res, ["POST"])) return;
  if (!allowMethods(req, res, ["POST"])) return;
  if (getMissingConfig(REQUIRED).length) return sendSetupRequired(res, REQUIRED);
  try {
    const { user } = await getAccessToken();
    return res.status(200).json({ ok:true, authenticated:true, user });
  } catch (error) {
    return handleApiError(error, res);
  }
}
