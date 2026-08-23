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
export function createState(input: {
  userId: string;
  provider: string;
  origin: string;
  codeVerifier?: string;
}): string {
  const payload = b64url(
    JSON.stringify({
      userId: input.userId,
      provider: input.provider,
      origin: input.origin,
      ...(input.codeVerifier ? { v: input.codeVerifier } : {}),
      ts: Date.now(),
      n: randomBytes(8).toString("hex"),
    }),
  );
  return `${payload}.${sign(payload)}`;
}
export function verifyState(
  state: string,
): { userId: string; provider: string; origin: string; codeVerifier: string | null } | null {
  const [payload, signature] = state.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
    if (typeof parsed?.ts !== "number" || Date.now() - parsed.ts > STATE_TTL_MS) return null;
    if (typeof parsed.userId !== "string" || typeof parsed.provider !== "string") return null;
    return {
      userId: parsed.userId,
      provider: parsed.provider,
      origin: String(parsed.origin ?? ""),
      codeVerifier: typeof parsed.v === "string" && parsed.v ? parsed.v : null,
    };
  } catch { return null; }
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

/**
 * Salesforce External Client Apps mandate PKCE (RFC 7636) on the Web Server
 * flow. Other providers keep their existing plain authorization-code behavior.
 */
export function providerRequiresPkce(provider: IntegrationProvider): boolean {
  return provider.id === "salesforce";
}
/** RFC 7636 §4.1 code verifier: 43-128 chars of unreserved base64url entropy. */
export function generateCodeVerifier(): string {
  return b64url(randomBytes(48));
}
/** RFC 7636 §4.2 S256 challenge. */
export function deriveCodeChallenge(codeVerifier: string): string {
  return b64url(createHash("sha256").update(codeVerifier).digest());
}

export function buildAuthorizeUrl(
  provider: IntegrationProvider,
  args: { state: string; origin: string; codeVerifier?: string },
): string {
  const url = new URL(provider.authorizeUrl);
  url.searchParams.set("client_id", process.env[provider.clientIdEnv]!);
  url.searchParams.set("redirect_uri", `${args.origin}${callbackPath}`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", args.state);
  if (provider.scopes.length) url.searchParams.set("scope", provider.scopes.join(" "));
  for (const [key, value] of Object.entries(provider.authorizeParams ?? {})) if (value !== "") url.searchParams.set(key, value);
  if (args.codeVerifier) {
    url.searchParams.set("code_challenge", deriveCodeChallenge(args.codeVerifier));
    url.searchParams.set("code_challenge_method", "S256");
  }
  return url.toString();
}

/**
 * Mints the signed state and consent URL together so the PKCE verifier only
 * ever lives inside the HMAC-signed state — never in browser storage.
 */
export function createAuthorization(
  provider: IntegrationProvider,
  args: { userId: string; origin: string },
): { state: string; authorizeUrl: string } {
  const codeVerifier = providerRequiresPkce(provider) ? generateCodeVerifier() : undefined;
  const state = createState({
    userId: args.userId,
    provider: provider.id,
    origin: args.origin,
    ...(codeVerifier ? { codeVerifier } : {}),
  });
  return {
    state,
    authorizeUrl: buildAuthorizeUrl(provider, { state, origin: args.origin, ...(codeVerifier ? { codeVerifier } : {}) }),
  };
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
  return {};
}

/**
 * Normalises provider grant reporting without trusting browser input.
 * HubSpot returns `scopes` as an array, while most providers return a singular
 * `scope` string. Asana's successful code exchange does not include a scope
 * field, so the exact scopes PalladiumAI requested are the effective grant.
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

  return provider.id === "asana" ? [...provider.scopes] : [];
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
export async function exchangeCode(
  provider: IntegrationProvider,
  args: { code: string; origin: string; codeVerifier?: string | null },
): Promise<TokenSet> {
  if (providerRequiresPkce(provider) && !args.codeVerifier) {
    throw new Error(`${provider.name} requires PKCE: the authorization request could not be verified.`);
  }
  const form = new URLSearchParams({
    grant_type: "authorization_code", code: args.code, redirect_uri: `${args.origin}${callbackPath}`,
    // The External Client App is a confidential client: the secret stays server-side.
    client_id: process.env[provider.clientIdEnv]!, client_secret: process.env[provider.clientSecretEnv]!,
  });
  if (args.codeVerifier) form.set("code_verifier", args.codeVerifier);
  const payload = provider.id === "notion"
    ? await postNotionToken(provider, { grant_type: "authorization_code", code: args.code, redirect_uri: `${args.origin}${callbackPath}` })
    : await postForm(provider.tokenUrl, form);
  return { ...parseTokenPayload(provider, payload), providerConfig: providerConfigFromPayload(provider, payload) };
}

export async function refreshTokens(provider: IntegrationProvider, refreshToken: string): Promise<TokenSet> {
  const payload = provider.id === "notion"
    ? await postNotionToken(provider, { grant_type: "refresh_token", refresh_token: refreshToken })
    : await postForm(provider.tokenUrl, new URLSearchParams({
        grant_type: "refresh_token", refresh_token: refreshToken,
        client_id: process.env[provider.clientIdEnv]!, client_secret: process.env[provider.clientSecretEnv]!,
      }));
  const next = { ...parseTokenPayload(provider, payload), providerConfig: providerConfigFromPayload(provider, payload) };
  return { ...next, refreshToken: next.refreshToken ?? refreshToken };
}
export async function fetchAccountLabel(provider: IntegrationProvider, accessToken: string): Promise<string | null> {
  if (!provider.identity) return null;
  try {
    const response = await fetch(provider.identity.url, { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } });
    if (!response.ok) return null;
    const payload = (await response.json()) as Record<string, unknown>;
    for (const key of provider.identity.labelKeys) {
      const value = payload[key];
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
