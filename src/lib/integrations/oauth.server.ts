/**
 * OAuth plumbing for third-party integrations. Server-only.
 *
 * Tokens are encrypted before persistence; OAuth state is HMAC-signed and
 * short-lived. Provider-specific token exchange differences are handled here.
 */
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { findProvider, type IntegrationProvider } from "./providers";

const STATE_TTL_MS = 10 * 60 * 1000;
const NOTION_VERSION = "2026-03-11";
const THREADS_API = "https://graph.threads.net";
type ProviderConfig = Record<string, string>;

function encryptionKey(): Buffer {
  const raw = process.env["INTEGRATION_TOKEN_KEY"];
  if (!raw) throw new Error("Integration token encryption key is not configured.");
  return createHash("sha256").update(raw).digest();
}
function stateSecret(): string {
  const raw = process.env["INTEGRATION_STATE_SECRET"];
  if (!raw) throw new Error("Integration state secret is not configured.");
  return raw;
}
export function encryptToken(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64");
}
export function decryptToken(stored: string): string {
  const buf = Buffer.from(stored, "base64");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
}
export function providerConfigured(provider: IntegrationProvider): boolean {
  return Boolean(process.env[provider.clientIdEnv] && process.env[provider.clientSecretEnv]);
}
const b64url = (v: Buffer | string) =>
  Buffer.from(v as never).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
function sign(payload: string): string {
  return b64url(createHmac("sha256", stateSecret()).update(payload).digest());
}
export function createState(input: { userId: string; provider: string; origin: string }): string {
  const payload = b64url(JSON.stringify({ ...input, ts: Date.now(), n: randomBytes(8).toString("hex") }));
  return `${payload}.${sign(payload)}`;
}
export function verifyState(state: string): { userId: string; provider: string; origin: string } | null {
  const [payload, signature] = state.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
    if (typeof parsed?.ts !== "number" || Date.now() - parsed.ts > STATE_TTL_MS) return null;
    if (typeof parsed.userId !== "string" || typeof parsed.provider !== "string") return null;
    return { userId: parsed.userId, provider: parsed.provider, origin: String(parsed.origin ?? "") };
  } catch { return null; }
}

/**
 * Derive PKCE verifiers from the already HMAC-protected OAuth state so the
 * verifier never needs to live in browser storage or a separate database row.
 */
function providerPkceVerifier(providerId: "salesforce" | "x", state: string): string {
  return b64url(createHmac("sha256", stateSecret()).update(`${providerId}-pkce:${state}`).digest());
}
function providerPkceChallenge(providerId: "salesforce" | "x", state: string): string {
  return b64url(createHash("sha256").update(providerPkceVerifier(providerId, state), "ascii").digest());
}
export function salesforcePkceVerifier(state: string): string {
  return providerPkceVerifier("salesforce", state);
}
export function salesforcePkceChallenge(state: string): string {
  return providerPkceChallenge("salesforce", state);
}
export function xPkceVerifier(state: string): string {
  return providerPkceVerifier("x", state);
}
export function xPkceChallenge(state: string): string {
  return providerPkceChallenge("x", state);
}

export function safeOrigin(candidate: string | undefined): string {
  const configured = process.env["APP_ORIGIN"];
  if (configured) return configured.replace(/\/$/, "");
  if (!candidate) throw new Error("Missing application origin for the OAuth redirect.");
  const url = new URL(candidate);
  const ok = url.protocol === "https:" && (url.hostname.endsWith(".lovable.app") || url.hostname.endsWith(".lovable.dev"));
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (!ok && !local) throw new Error("Unsupported application origin for the OAuth redirect.");
  return url.origin;
}
export const callbackPath = "/api/public/integrations/callback";
export function buildAuthorizeUrl(provider: IntegrationProvider, args: { state: string; origin: string }): string {
  const url = new URL(provider.authorizeUrl);
  const clientParam = provider.id === "tiktok" ? "client_key" : "client_id";
  url.searchParams.set(clientParam, process.env[provider.clientIdEnv]!);
  url.searchParams.set("redirect_uri", `${args.origin}${callbackPath}`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", args.state);
  if (provider.scopes.length) {
    const separator = provider.id === "tiktok" || provider.id === "threads" ? "," : " ";
    url.searchParams.set("scope", provider.scopes.join(separator));
  }
  if (provider.id === "salesforce" || provider.id === "x") {
    url.searchParams.set("code_challenge", providerPkceChallenge(provider.id, args.state));
    url.searchParams.set("code_challenge_method", "S256");
  }
  for (const [key, value] of Object.entries(provider.authorizeParams ?? {})) if (value !== "") url.searchParams.set(key, value);
  return url.toString();
}

export type TokenSet = {
  accessToken: string;
  refreshToken: string | null;
  tokenType: string;
  scopes: string[];
  expiresAt: string | null;
  providerConfig: ProviderConfig;
};
export function normaliseSalesforceInstanceUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    if (host !== "salesforce.com" && !host.endsWith(".salesforce.com")) return null;
    return url.origin;
  } catch { return null; }
}
function providerConfigFromPayload(provider: IntegrationProvider, payload: Record<string, any>): ProviderConfig {
  if (provider.id === "salesforce") {
    const instanceUrl = normaliseSalesforceInstanceUrl(payload["instance_url"]);
    return instanceUrl ? { instance_url: instanceUrl } : {};
  }
  if (provider.id === "notion") {
    const result: ProviderConfig = {};
    if (typeof payload["workspace_id"] === "string") result["workspace_id"] = payload["workspace_id"].slice(0, 200);
    if (typeof payload["workspace_name"] === "string") result["workspace_name"] = payload["workspace_name"].slice(0, 300);
    return result;
  }
  if (provider.id === "tiktok") {
    const openId = typeof payload["open_id"] === "string" ? payload["open_id"].trim().slice(0, 200) : "";
    return openId ? { open_id: openId } : {};
  }
  if (provider.id === "threads") {
    const userId = typeof payload["user_id"] === "string" || typeof payload["user_id"] === "number"
      ? String(payload["user_id"]).trim().slice(0, 200)
      : "";
    return userId ? { user_id: userId } : {};
  }
  return {};
}

/**
 * Normalises provider grant reporting without trusting browser input.
 * HubSpot returns `scopes` as an array, while most providers return a singular
 * `scope` string. Some successful exchanges do not echo scopes, so the exact
 * scopes Blackstar requested are the effective grant only for those providers.
 */
export function grantedScopesFromTokenPayload(
  provider: IntegrationProvider,
  payload: Record<string, any>,
): string[] {
  const flat = payload["authed_user"]?.access_token ? payload["authed_user"] : payload;
  const arrayScopes = Array.isArray(flat["scopes"])
    ? flat["scopes"]
    : Array.isArray(payload["scopes"])
      ? payload["scopes"]
      : null;
  if (arrayScopes) {
    const scopes = arrayScopes
      .filter((value: unknown): value is string => typeof value === "string")
      .map((value: string) => value.trim())
      .filter(Boolean);
    if (scopes.length) return scopes;
  }

  const stringScopes = String(flat["scope"] ?? payload["scope"] ?? "")
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter(Boolean);
  if (stringScopes.length) return stringScopes;

  return provider.id === "asana" || provider.id === "salesforce" || provider.id === "threads"
    ? [...provider.scopes]
    : [];
}

function parseTokenPayload(provider: IntegrationProvider, payload: Record<string, any>): Omit<TokenSet, "providerConfig"> {
  const flat = payload["authed_user"]?.access_token ? payload["authed_user"] : payload;
  const accessToken = flat["access_token"];
  if (!accessToken) throw new Error(payload["error_description"] ?? payload["error"] ?? "No access token returned.");
  const expiresIn = Number(flat["expires_in"] ?? payload["expires_in"] ?? 0);
  return {
    accessToken,
    refreshToken: flat["refresh_token"] ?? payload["refresh_token"] ?? null,
    tokenType: flat["token_type"] ?? "Bearer",
    scopes: grantedScopesFromTokenPayload(provider, payload),
    expiresAt: expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
  };
}
async function parseResponse(response: Response): Promise<Record<string, any>> {
  const text = await response.text();
  let payload: Record<string, any> = {};
  try { payload = JSON.parse(text); } catch { throw new Error(`Provider returned an unreadable token response (${response.status}).`); }
  if (!response.ok) throw new Error(payload["error_description"] ?? payload["message"] ?? payload["error"] ?? `Token exchange failed (${response.status}).`);
  return payload;
}
async function postForm(url: string, body: URLSearchParams): Promise<Record<string, any>> {
  return parseResponse(await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" }, body }));
}
async function postBasicForm(provider: IntegrationProvider, body: URLSearchParams): Promise<Record<string, any>> {
  const clientId = process.env[provider.clientIdEnv]!;
  const clientSecret = process.env[provider.clientSecretEnv]!;
  const authorization = Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64");
  return parseResponse(await fetch(provider.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Authorization: `Basic ${authorization}`,
    },
    body,
  }));
}
async function postNotionToken(provider: IntegrationProvider, body: Record<string, string>): Promise<Record<string, any>> {
  const clientId = process.env[provider.clientIdEnv]!;
  const clientSecret = process.env[provider.clientSecretEnv]!;
  return parseResponse(await fetch(provider.tokenUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64")}`,
      "Notion-Version": NOTION_VERSION,
    },
    body: JSON.stringify(body),
  }));
}
async function exchangeThreadsCode(provider: IntegrationProvider, args: { code: string; origin: string }): Promise<Record<string, any>> {
  const url = new URL(provider.tokenUrl);
  url.searchParams.set("client_id", process.env[provider.clientIdEnv]!);
  url.searchParams.set("client_secret", process.env[provider.clientSecretEnv]!);
  url.searchParams.set("code", args.code);
  url.searchParams.set("grant_type", "authorization_code");
  url.searchParams.set("redirect_uri", `${args.origin}${callbackPath}`);
  const short = await parseResponse(await fetch(url, { method: "POST", headers: { Accept: "application/json" } }));
  const shortToken = typeof short["access_token"] === "string" ? short["access_token"] : "";
  if (!shortToken) throw new Error("Threads did not return a short-lived access token.");

  const exchangeUrl = new URL(`${THREADS_API}/access_token`);
  exchangeUrl.searchParams.set("grant_type", "th_exchange_token");
  exchangeUrl.searchParams.set("client_secret", process.env[provider.clientSecretEnv]!);
  const long = await parseResponse(await fetch(exchangeUrl, {
    headers: { Accept: "application/json", Authorization: `Bearer ${shortToken}` },
  }));
  return { ...long, user_id: short["user_id"] };
}
async function refreshThreadsToken(provider: IntegrationProvider, accessToken: string): Promise<Record<string, any>> {
  const url = new URL(`${THREADS_API}/refresh_access_token`);
  url.searchParams.set("grant_type", "th_refresh_token");
  return parseResponse(await fetch(url, {
    headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
  }));
}

export async function exchangeCode(
  provider: IntegrationProvider,
  args: { code: string; origin: string; state?: string },
): Promise<TokenSet> {
  let payload: Record<string, any>;
  if (provider.id === "notion") {
    payload = await postNotionToken(provider, { grant_type: "authorization_code", code: args.code, redirect_uri: `${args.origin}${callbackPath}` });
  } else if (provider.id === "pinterest") {
    payload = await postBasicForm(provider, new URLSearchParams({
      grant_type: "authorization_code",
      code: args.code,
      redirect_uri: `${args.origin}${callbackPath}`,
      continuous_refresh: "true",
    }));
  } else if (provider.id === "tiktok") {
    payload = await postForm(provider.tokenUrl, new URLSearchParams({
      client_key: process.env[provider.clientIdEnv]!,
      client_secret: process.env[provider.clientSecretEnv]!,
      code: args.code,
      grant_type: "authorization_code",
      redirect_uri: `${args.origin}${callbackPath}`,
    }));
  } else if (provider.id === "x") {
    if (!args.state) throw new Error("X authorization state is required to complete PKCE.");
    payload = await postBasicForm(provider, new URLSearchParams({
      grant_type: "authorization_code",
      code: args.code,
      redirect_uri: `${args.origin}${callbackPath}`,
      code_verifier: xPkceVerifier(args.state),
    }));
  } else if (provider.id === "threads") {
    payload = await exchangeThreadsCode(provider, args);
  } else {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: args.code,
      redirect_uri: `${args.origin}${callbackPath}`,
      client_id: process.env[provider.clientIdEnv]!,
      client_secret: process.env[provider.clientSecretEnv]!,
    });
    if (provider.id === "salesforce") {
      if (!args.state) throw new Error("Salesforce authorization state is required to complete PKCE.");
      body.set("code_verifier", salesforcePkceVerifier(args.state));
    }
    payload = await postForm(provider.tokenUrl, body);
  }
  const parsed = { ...parseTokenPayload(provider, payload), providerConfig: providerConfigFromPayload(provider, payload) };
  if (provider.id === "threads") return { ...parsed, refreshToken: parsed.accessToken };
  return parsed;
}
export async function refreshTokens(provider: IntegrationProvider, refreshToken: string): Promise<TokenSet> {
  const payload = provider.id === "notion"
    ? await postNotionToken(provider, { grant_type: "refresh_token", refresh_token: refreshToken })
    : provider.id === "pinterest"
      ? await postBasicForm(provider, new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }))
      : provider.id === "tiktok"
        ? await postForm(provider.tokenUrl, new URLSearchParams({
            client_key: process.env[provider.clientIdEnv]!,
            client_secret: process.env[provider.clientSecretEnv]!,
            grant_type: "refresh_token",
            refresh_token: refreshToken,
          }))
        : provider.id === "x"
          ? await postBasicForm(provider, new URLSearchParams({
              grant_type: "refresh_token",
              refresh_token: refreshToken,
            }))
          : provider.id === "threads"
            ? await refreshThreadsToken(provider, refreshToken)
            : await postForm(provider.tokenUrl, new URLSearchParams({
                grant_type: "refresh_token", refresh_token: refreshToken,
                client_id: process.env[provider.clientIdEnv]!, client_secret: process.env[provider.clientSecretEnv]!,
              }));
  const next = { ...parseTokenPayload(provider, payload), providerConfig: providerConfigFromPayload(provider, payload) };
  if (provider.id === "threads") return { ...next, refreshToken: next.accessToken };
  return { ...next, refreshToken: next.refreshToken ?? refreshToken };
}
export async function fetchAccountLabel(provider: IntegrationProvider, accessToken: string): Promise<string | null> {
  if (!provider.identity) return null;
  try {
    const response = await fetch(provider.identity.url, { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } });
    if (!response.ok) return null;
    const payload = (await response.json()) as Record<string, unknown>;
    const identityPayload = provider.id === "x" && payload["data"] && typeof payload["data"] === "object" && !Array.isArray(payload["data"])
      ? payload["data"] as Record<string, unknown>
      : payload;
    for (const key of provider.identity.labelKeys) {
      const value = identityPayload[key];
      if (typeof value === "string" && value) return value.slice(0, 120);
    }
  } catch { /* cosmetic */ }
  return null;
}
export async function getIntegrationProviderConfig(userId: string, providerId: string): Promise<ProviderConfig> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row } = await supabaseAdmin.from("integrations").select("config").eq("user_id", userId).eq("provider", providerId).eq("status", "connected").maybeSingle();
  const config = row?.config;
  if (!config || typeof config !== "object" || Array.isArray(config)) return {};
  const result: ProviderConfig = {};
  for (const [key, value] of Object.entries(config as Record<string, unknown>).slice(0, 20)) if (typeof value === "string") result[key.slice(0, 100)] = value.slice(0, 1000);
  return result;
}
export async function getIntegrationAccessToken(userId: string, providerId: string): Promise<string | null> {
  const provider = findProvider(providerId);
  if (!provider) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row } = await supabaseAdmin.from("integration_credentials")
    .select("id,access_token_ciphertext,refresh_token_ciphertext,expires_at").eq("user_id", userId).eq("provider", providerId).maybeSingle();
  if (!row) return null;
  const fresh = !row.expires_at || new Date(row.expires_at).getTime() - 60_000 > Date.now();
  if (fresh) return decryptToken(row.access_token_ciphertext);
  if (!row.refresh_token_ciphertext || !providerConfigured(provider)) return null;
  try {
    const next = await refreshTokens(provider, decryptToken(row.refresh_token_ciphertext));
    await supabaseAdmin.from("integration_credentials").update({
      access_token_ciphertext: encryptToken(next.accessToken),
      refresh_token_ciphertext: next.refreshToken ? encryptToken(next.refreshToken) : null,
      expires_at: next.expiresAt,
      updated_at: new Date().toISOString(),
    }).eq("id", row.id);
    if (Object.keys(next.providerConfig).length) {
      const existing = await getIntegrationProviderConfig(userId, providerId);
      await supabaseAdmin.from("integrations").update({ config: { ...existing, ...next.providerConfig } }).eq("user_id", userId).eq("provider", providerId);
    }
    return next.accessToken;
  } catch {
    await supabaseAdmin.from("integrations").update({ status: "error", last_error: "Access expired — reconnect required." }).eq("user_id", userId).eq("provider", providerId);
    return null;
  }
}
