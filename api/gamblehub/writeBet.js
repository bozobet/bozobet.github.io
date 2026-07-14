import { handleWalletCallback } from "../_lib/gamblehub-callback.js";

export default function handler(req, res) {
  return handleWalletCallback(req, res, "writeBet");
}
