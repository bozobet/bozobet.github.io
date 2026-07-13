import { createHmac } from "node:crypto";

export const GAMBLEHUB_ENV_KEYS = Object.freeze([
  "GAMBLEHUB_API_LOGIN",
  "GAMBLEHUB_API_PASSWORD",
  "GAMBLEHUB_USER_ID",
  "GAMBLEHUB_SECRET_API_KEY"
]);

const DEFAULT_OFFICE_URL = "https://office-api-dev.gamble-hub.net";
const DEFAULT_CLIENT_URL = "https://client-api-dev.gamble-hub.net";
const DEFAULT_CURRENCY = "USD";
const REQUEST_TIMEOUT_MS = 12000;
const TOKEN_EARLY_REFRESH_MS = 30000;
const TOKEN_FALLBACK_TTL_MS = 5 * 60 * 1000;

const tokenCache = globalThis.__bozobetGambleHubTokenCache || {
  accessToken:"",
  expiresAt:0,
  user:null
};
globalThis.__bozobetGambleHubTokenCache = tokenCache;

export class SetupRequiredError extends Error {
  constructor(missing) {
    super("Gamble Hub Stage configuration is incomplete");
    this.name = "SetupRequiredError";
    this.missing = missing;
  }
}

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}

export class UpstreamError extends Error {
  constructor(code, providerStatus = 0) {
    super(code);
    this.name = "UpstreamError";
    this.code = code;
    this.providerStatus = providerStatus;
  }
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function withoutTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

export function getGambleHubConfig() {
  return {
    login:clean(process.env.GAMBLEHUB_API_LOGIN),
    password:clean(process.env.GAMBLEHUB_API_PASSWORD),
    userId:clean(process.env.GAMBLEHUB_USER_ID),
    secretApiKey:clean(process.env.GAMBLEHUB_SECRET_API_KEY),
    currency:(clean(process.env.GAMBLEHUB_CURRENCY) || DEFAULT_CURRENCY).toUpperCase(),
    officeUrl:withoutTrailingSlash(clean(process.env.GAMBLEHUB_STAGE_OFFICE_URL) || DEFAULT_OFFICE_URL),
    clientUrl:withoutTrailingSlash(clean(process.env.GAMBLEHUB_STAGE_CLIENT_URL) || DEFAULT_CLIENT_URL),
    allowRealMode:clean(process.env.GAMBLEHUB_ALLOW_REAL_MODE).toLowerCase() === "true"
  };
}

const CONFIG_PROPERTY_BY_ENV = Object.freeze({
  GAMBLEHUB_API_LOGIN:"login",
  GAMBLEHUB_API_PASSWORD:"password",
  GAMBLEHUB_USER_ID:"userId",
  GAMBLEHUB_SECRET_API_KEY:"secretApiKey",
  GAMBLEHUB_CURRENCY:"currency",
  GAMBLEHUB_STAGE_OFFICE_URL:"officeUrl",
  GAMBLEHUB_STAGE_CLIENT_URL:"clientUrl"
});

export function getMissingConfig(requiredKeys = GAMBLEHUB_ENV_KEYS, config = getGambleHubConfig()) {
  return requiredKeys.filter(key => !config[CONFIG_PROPERTY_BY_ENV[key]]);
}

export function requireGambleHubConfig(requiredKeys = GAMBLEHUB_ENV_KEYS) {
  const config = getGambleHubConfig();
  const missing = getMissingConfig(requiredKeys, config);
  if (missing.length) throw new SetupRequiredError(missing);
  return config;
}

function requestOrigin(req) {
  return clean(req?.headers?.origin || req?.headers?.Origin);
}

export function allowedOrigins() {
  const origins = new Set([
    "https://bozobet.github.io",
    "https://bozobet-v2.vercel.app"
  ]);
  const vercelUrl = clean(process.env.VERCEL_URL);
  if (vercelUrl) origins.add("https://" + vercelUrl.replace(/^https?:\/\//, ""));
  return origins;
}

export function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins().has(origin)) return true;
  try {
    const url = new URL(origin);
    return (url.hostname === "localhost" || url.hostname === "127.0.0.1") && (url.protocol === "http:" || url.protocol === "https:");
  } catch {
    return false;
  }
}

export function applyCors(req, res, methods) {
  const origin = requestOrigin(req);
  if (!isAllowedOrigin(origin)) {
    res.status(403).json({ ok:false, error:"origin_not_allowed" });
    return true;
  }
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Access-Control-Allow-Methods", methods.concat("OPTIONS").join(", "));
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "600");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}

export function allowMethods(req, res, methods) {
  if (methods.includes(req.method)) return true;
  res.setHeader("Allow", methods.concat("OPTIONS").join(", "));
  res.status(405).json({ ok:false, error:"method_not_allowed" });
  return false;
}

export function sendSetupRequired(res, requiredKeys = GAMBLEHUB_ENV_KEYS) {
  const missing = getMissingConfig(requiredKeys);
  return res.status(503).json({ ok:false, error:"setup_required", missing });
}

function safeUser(user) {
  if (!user || typeof user !== "object") return null;
  return {
    id:typeof user.id === "string" ? user.id : "",
    login:typeof user.login === "string" ? user.login : "",
    role:typeof user.role === "string" ? user.role : ""
  };
}

function jwtExpiry(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return Number.isFinite(Number(payload.exp)) ? Number(payload.exp) * 1000 : 0;
  } catch {
    return 0;
  }
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal:controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") throw new UpstreamError("provider_timeout");
    throw new UpstreamError("provider_unavailable");
  } finally {
    clearTimeout(timer);
  }
}

export async function readProviderJson(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new UpstreamError("invalid_provider_response", response.status);
  }
}

export function clearAccessTokenCache() {
  tokenCache.accessToken = "";
  tokenCache.expiresAt = 0;
  tokenCache.user = null;
}

export async function getAccessToken() {
  const config = requireGambleHubConfig(["GAMBLEHUB_API_LOGIN", "GAMBLEHUB_API_PASSWORD"]);
  if (tokenCache.accessToken && tokenCache.expiresAt - TOKEN_EARLY_REFRESH_MS > Date.now()) {
    return { accessToken:tokenCache.accessToken, user:tokenCache.user };
  }

  const form = new URLSearchParams({ login:config.login, password:config.password });
  const response = await fetchWithTimeout(config.officeUrl + "/auth/login", {
    method:"POST",
    headers:{ "Content-Type":"application/x-www-form-urlencoded" },
    body:form.toString()
  });
  const data = await readProviderJson(response);
  if (!response.ok || !data || typeof data.accessToken !== "string" || !data.accessToken) {
    throw new UpstreamError(response.status === 401 ? "provider_auth_failed" : "provider_auth_error", response.status);
  }

  tokenCache.accessToken = data.accessToken;
  tokenCache.expiresAt = jwtExpiry(data.accessToken) || Date.now() + TOKEN_FALLBACK_TTL_MS;
  tokenCache.user = safeUser(data.user);
  return { accessToken:tokenCache.accessToken, user:tokenCache.user };
}

export async function officeAuthorizedGet(path) {
  const config = requireGambleHubConfig(["GAMBLEHUB_API_LOGIN", "GAMBLEHUB_API_PASSWORD", "GAMBLEHUB_USER_ID"]);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { accessToken } = await getAccessToken();
    const response = await fetchWithTimeout(config.officeUrl + path, {
      method:"GET",
      headers:{ Authorization:"Bearer " + accessToken, Accept:"application/json" }
    });
    if (response.status !== 401 || attempt === 1) return response;
    clearAccessTokenCache();
  }
  throw new UpstreamError("provider_auth_failed", 401);
}

export function parseJsonBody(req) {
  if (req.body && typeof req.body === "object" && !Array.isArray(req.body)) return req.body;
  if (typeof req.body !== "string" || req.body.length > 10000) throw new ValidationError("invalid_request_body");
  try {
    const parsed = JSON.parse(req.body);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not_object");
    return parsed;
  } catch {
    throw new ValidationError("invalid_request_body");
  }
}

export function validateExitUrl(value) {
  try {
    const url = new URL(String(value || ""));
    if (!isAllowedOrigin(url.origin)) throw new Error("origin");
    if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") throw new Error("protocol");
    return url.toString();
  } catch {
    throw new ValidationError("invalid_exit_url");
  }
}

export function normalizeOpenGameBody(body, config = getGambleHubConfig()) {
  const gameId = clean(body.gameId);
  const playerLogin = clean(body.playerLogin);
  const currency = (clean(body.currency) || config.currency).toUpperCase();
  const language = (clean(body.language) || "tr").toLowerCase();
  if (!gameId || gameId.length > 200 || /[\u0000-\u001f]/.test(gameId)) throw new ValidationError("invalid_game_id");
  if (!playerLogin || playerLogin.length > 64 || !/^[\p{L}\p{N}._@-]+$/u.test(playerLogin)) throw new ValidationError("invalid_player_login");
  if (!/^[A-Z]{3}$/.test(currency)) throw new ValidationError("invalid_currency");
  if (!/^[a-z]{2}(?:-[a-z]{2})?$/.test(language)) throw new ValidationError("invalid_language");

  return {
    currency,
    demo:config.allowRealMode && String(body.demo) === "0" ? "0" : "1",
    exitUrl:validateExitUrl(body.exitUrl),
    gameId,
    language,
    player_login:playerLogin,
    user_id:config.userId
  };
}

export function signRawBody(rawBody, secretApiKey) {
  return createHmac("sha256", secretApiKey).update(rawBody, "utf8").digest("hex");
}

export async function clientPost(path, rawBody, signature) {
  const config = getGambleHubConfig();
  return fetchWithTimeout(config.clientUrl + path, {
    method:"POST",
    headers:{ "Content-Type":"application/json", "X-Signature":signature, Accept:"application/json" },
    body:rawBody
  });
}

export function handleApiError(error, res) {
  if (error instanceof SetupRequiredError) {
    return res.status(503).json({ ok:false, error:"setup_required", missing:error.missing });
  }
  if (error instanceof ValidationError) {
    return res.status(400).json({ ok:false, error:error.message });
  }
  if (error instanceof UpstreamError) {
    const status = error.code === "provider_timeout" ? 504 : 502;
    console.error("Gamble Hub upstream failure", { code:error.code, providerStatus:error.providerStatus || undefined });
    return res.status(status).json({ ok:false, error:error.code });
  }
  console.error("Gamble Hub server failure", { name:error?.name || "Error" });
  return res.status(500).json({ ok:false, error:"internal_error" });
}
