import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULTS = Object.freeze({
  office:"https://office-api-dev.gamble-hub.net",
  client:"https://client-api-dev.gamble-hub.net",
  transfer:"https://twalletvault.api.games-hub.net",
  callback:"https://our-domain.com/api/gamblehub/callback",
  currency:"TRY",
  language:"tr"
});

export class StageCredentialsRequiredError extends Error {
  constructor(missing = []) {
    super("Stage credentials required");
    this.name = "StageCredentialsRequiredError";
    this.code = "stage_credentials_required";
    this.missing = missing;
  }
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function baseUrl(value, fallback) {
  return (clean(value) || fallback).replace(/\/+$/, "");
}

export function getConfig() {
  return {
    office:baseUrl(process.env.GH_STAGE_OFFICE, DEFAULTS.office),
    client:baseUrl(process.env.GH_STAGE_CLIENT, DEFAULTS.client),
    transfer:baseUrl(process.env.GH_TRANSFER, DEFAULTS.transfer),
    login:clean(process.env.GH_LOGIN),
    password:clean(process.env.GH_PASSWORD),
    userId:clean(process.env.GH_USER_ID),
    secretKey:clean(process.env.GH_SECRET_KEY),
    callback:clean(process.env.GH_CALLBACK) || DEFAULTS.callback,
    currency:(clean(process.env.GH_CURRENCY) || DEFAULTS.currency).toUpperCase(),
    language:(clean(process.env.GH_LANGUAGE) || DEFAULTS.language).toLowerCase()
  };
}

const CONFIG_KEYS = Object.freeze({
  GH_LOGIN:"login",
  GH_PASSWORD:"password",
  GH_USER_ID:"userId",
  GH_SECRET_KEY:"secretKey"
});

export function getMissingCredentials(required = Object.keys(CONFIG_KEYS), config = getConfig()) {
  return required.filter(key => !config[CONFIG_KEYS[key]]);
}

function requireCredentials(required) {
  const config = getConfig();
  const missing = getMissingCredentials(required, config);
  if (missing.length) throw new StageCredentialsRequiredError(missing);
  return config;
}

function signatureInput(payload) {
  if (Buffer.isBuffer(payload)) return payload;
  if (typeof payload === "string") return Buffer.from(payload, "utf8");
  return Buffer.from(JSON.stringify(payload ?? {}), "utf8");
}

export function createSignature(payload, secret = getConfig().secretKey) {
  const key = clean(secret);
  if (!key) throw new StageCredentialsRequiredError(["GH_SECRET_KEY"]);
  return createHmac("sha256", key).update(signatureInput(payload)).digest("hex");
}

export function verifySignature(payload, signature, secret = getConfig().secretKey) {
  const received = clean(signature).toLowerCase();
  if (!received || !/^[a-f0-9]{64}$/.test(received)) return false;
  let expected;
  try {
    expected = createSignature(payload, secret);
  } catch (error) {
    if (error instanceof StageCredentialsRequiredError) return false;
    throw error;
  }
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex"));
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const error = new Error("Invalid Gamble Hub response");
    error.code = "invalid_provider_response";
    throw error;
  }
}

async function providerRequest(url, options) {
  const response = await fetch(url, options);
  const data = await readJson(response);
  if (!response.ok) {
    const error = new Error("Gamble Hub request failed");
    error.code = "provider_request_failed";
    error.status = response.status;
    throw error;
  }
  return data;
}

export async function login() {
  const config = requireCredentials(["GH_LOGIN", "GH_PASSWORD"]);
  const body = new URLSearchParams({ login:config.login, password:config.password });
  return providerRequest(config.office + "/auth/login", {
    method:"POST",
    headers:{ "Content-Type":"application/x-www-form-urlencoded", Accept:"application/json" },
    body:body.toString()
  });
}

export async function getGames(currency = getConfig().currency) {
  const config = requireCredentials(["GH_LOGIN", "GH_PASSWORD", "GH_USER_ID"]);
  const auth = await login();
  const accessToken = clean(auth?.accessToken || auth?.access_token || auth?.token);
  if (!accessToken) {
    const error = new Error("Gamble Hub access token missing");
    error.code = "invalid_provider_response";
    throw error;
  }
  const selectedCurrency = (clean(currency) || config.currency).toUpperCase();
  const path = "/users/" + encodeURIComponent(config.userId) + "/getUserGames/" + encodeURIComponent(selectedCurrency);
  return providerRequest(config.office + path, {
    method:"GET",
    headers:{ Authorization:"Bearer " + accessToken, Accept:"application/json" }
  });
}

export async function openGame(options = {}) {
  const config = requireCredentials(["GH_USER_ID", "GH_SECRET_KEY"]);
  const gameId = clean(options.gameId || options.game_id);
  const playerLogin = clean(options.playerLogin || options.player_login);
  if (!gameId || !playerLogin) {
    const error = new Error("gameId and playerLogin are required");
    error.code = "invalid_request";
    throw error;
  }

  const payload = {
    currency:"TRY",
    language:"tr",
    demo:"1",
    gameId,
    player_login:playerLogin,
    user_id:config.userId
  };
  if (clean(options.exitUrl || options.exit_url)) payload.exitUrl = clean(options.exitUrl || options.exit_url);

  const rawBody = JSON.stringify(payload);
  const signature = createSignature(rawBody, config.secretKey);
  const data = await providerRequest(config.client + "/games/openGame", {
    method:"POST",
    headers:{ "Content-Type":"application/json", Accept:"application/json", "X-Signature":signature },
    body:rawBody
  });
  return { data, payload, signature };
}

export default { login, getGames, openGame, createSignature, verifySignature };
