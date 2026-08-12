/**
 * OAuth plumbing for third-party integrations. Server-only.
 *
 * Rules this file enforces:
 *  - PalladiumAI never stores a third-party password. Only OAuth tokens.
 *  - Tokens are encrypted (AES-256-GCM) before they touch the database and are
 *    written to `integration_credentials`, which no browser role can read.
 *  - The OAuth `state` value is HMAC-signed and short-lived, so a callback
 *    cannot be replayed or pointed at another user's account.
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

/** Is this provider usable, i.e. has the operator supplied OAuth client credentials? */
export function providerConfigured(provider: IntegrationProvider): boolean {
  return Boolean(process.env[provider.clientIdEnv] && process.env[provider.clientSecretEnv]);
}

const b64url = (v: Buffer | string) =>
  Buffer.from(v as never)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

function sign(payload: string): string {
  return b64url(createHmac("sha256", stateSecret()).update(payload).digest());
}

export function createState(input: { userId: string; provider: string; origin: string }): string {
  const payload = b64url(
    JSON.stringify({ ...input, ts: Date.now(), n: randomBytes(8).toString("hex") }),
  );
  return `${payload}.${sign(payload)}`;
}

export function verifyState(
  state: string,
): { userId: string; provider: string; origin: string } | null {
  const [payload, signature] = state.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
    if (typeof parsed?.ts !== "number" || Date.now() - parsed.ts > STATE_TTL_MS) return null;
    if (typeof parsed.userId !== "string" || typeof parsed.provider !== "string") return null;
    return {
      userId: parsed.userId,
      provider: parsed.provider,
      origin: String(parsed.origin ?? ""),
    };
  } catch {
    return null;
  }
}

/** Only same-app origins may be used as an OAuth return target. */
export function safeOrigin(candidate: string | undefined): string {
  const configured = process.env["APP_ORIGIN"];
  if (configured) return configured.replace(/\/$/, "");
  if (!candidate) throw new Error("Missing application origin for the OAuth redirect.");
  const url = new URL(candidate);
  const ok =
    url.protocol === "https:" &&
    (url.hostname.endsWith(".lovable.app") || url.hostname.endsWith(".lovable.dev"));
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (!ok && !local) throw new Error("Unsupported application origin for the OAuth redirect.");
  return url.origin;
}

export const callbackPath = "/api/public/integrations/callback";

export function buildAuthorizeUrl(
  provider: IntegrationProvider,
  args: { state: string; origin: string },
): string {
  const url = new URL(provider.authorizeUrl);
  url.searchParams.set("client_id", process.env[provider.clientIdEnv]!);
  url.searchParams.set("redirect_uri", `${args.origin}${callbackPath}`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", args.state);
  if (provider.scopes.length) url.searchParams.set("scope", provider.scopes.join(" "));
  for (const [key, value] of Object.entries(provider.authorizeParams ?? {})) {
    if (value !== "") url.searchParams.set(key, value);
  }
  return url.toString();
}

export type TokenSet = {
  accessToken: string;
  refreshToken: string | null;
  tokenType: string;
  scopes: string[];
  expiresAt: string | null;
};

function parseTokenPayload(payload: Record<string, any>): TokenSet {
  // Slack nests the user grant; everything else is flat.
  const flat = payload["authed_user"]?.access_token ? payload["authed_user"] : payload;
  const accessToken = flat["access_token"];
  if (!accessToken)
    throw new Error(
      payload["error_description"] ?? payload["error"] ?? "No access token returned.",
    );
  const expiresIn = Number(flat["expires_in"] ?? payload["expires_in"] ?? 0);
  return {
    accessToken,
    refreshToken: flat["refresh_token"] ?? payload["refresh_token"] ?? null,
    tokenType: flat["token_type"] ?? "Bearer",
    scopes: String(flat["scope"] ?? payload["scope"] ?? "")
      .split(/[\s,]+/)
      .filter(Boolean),
    expiresAt: expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
  };
}

async function postForm(url: string, body: URLSearchParams): Promise<Record<string, any>> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
  });
  const text = await response.text();
  let payload: Record<string, any> = {};
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`Provider returned an unreadable token response (${response.status}).`);
  }
  if (!response.ok)
    throw new Error(
      payload["error_description"] ??
        payload["error"] ??
        `Token exchange failed (${response.status}).`,
    );
  return payload;
}

export async function exchangeCode(
  provider: IntegrationProvider,
  args: { code: string; origin: string },
): Promise<TokenSet> {
  return parseTokenPayload(
    await postForm(
      provider.tokenUrl,
      new URLSearchParams({
        grant_type: "authorization_code",
        code: args.code,
        redirect_uri: `${args.origin}${callbackPath}`,
        client_id: process.env[provider.clientIdEnv]!,
        client_secret: process.env[provider.clientSecretEnv]!,
      }),
    ),
  );
}

export async function refreshTokens(
  provider: IntegrationProvider,
  refreshToken: string,
): Promise<TokenSet> {
  const next = parseTokenPayload(
    await postForm(
      provider.tokenUrl,
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: process.env[provider.clientIdEnv]!,
        client_secret: process.env[provider.clientSecretEnv]!,
      }),
    ),
  );
  return { ...next, refreshToken: next.refreshToken ?? refreshToken };
}

/** Best-effort friendly label for the connected account. Never fatal. */
export async function fetchAccountLabel(
  provider: IntegrationProvider,
  accessToken: string,
): Promise<string | null> {
  if (!provider.identity) return null;
  try {
    const response = await fetch(provider.identity.url, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as Record<string, unknown>;
    for (const key of provider.identity.labelKeys) {
      const value = payload[key];
      if (typeof value === "string" && value) return value.slice(0, 120);
    }
  } catch {
    /* labelling is cosmetic */
  }
  return null;
}

/**
 * Returns a usable access token for a user's provider connection, refreshing it
 * when expired. Used by tools — never exposed to the browser.
 */
export async function getIntegrationAccessToken(
  userId: string,
  providerId: string,
): Promise<string | null> {
  const provider = findProvider(providerId);
  if (!provider) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row } = await supabaseAdmin
    .from("integration_credentials")
    .select("id,access_token_ciphertext,refresh_token_ciphertext,expires_at")
    .eq("user_id", userId)
    .eq("provider", providerId)
    .maybeSingle();
  if (!row) return null;

  const fresh = !row.expires_at || new Date(row.expires_at).getTime() - 60_000 > Date.now();
  if (fresh) return decryptToken(row.access_token_ciphertext);
  if (!row.refresh_token_ciphertext || !providerConfigured(provider)) return null;

  try {
    const next = await refreshTokens(provider, decryptToken(row.refresh_token_ciphertext));
    await supabaseAdmin
      .from("integration_credentials")
      .update({
        access_token_ciphertext: encryptToken(next.accessToken),
        refresh_token_ciphertext: next.refreshToken ? encryptToken(next.refreshToken) : null,
        expires_at: next.expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    return next.accessToken;
  } catch {
    await supabaseAdmin
      .from("integrations")
      .update({ status: "error", last_error: "Access expired — reconnect required." })
      .eq("user_id", userId)
      .eq("provider", providerId);
    return null;
  }
}
