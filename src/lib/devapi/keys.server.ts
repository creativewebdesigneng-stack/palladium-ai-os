/**
 * API key material helpers.
 *
 * Raw keys never touch the database. We persist only a SHA-256 hash plus a
 * non-secret prefix/last-four so the UI can identify a key without revealing
 * it. The full key is returned exactly once, at creation time.
 */

const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function randomString(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type GeneratedKey = {
  raw: string;
  hash: string;
  prefix: string;
  lastFour: string;
};

/** Mints a new API key. `raw` must be shown once and never stored. */
export async function generateApiKey(environment: "live" | "test"): Promise<GeneratedKey> {
  const body = randomString(40);
  const prefixTag = `pk_${environment}_${randomString(4)}`;
  const raw = `${prefixTag}_${body}`;
  return {
    raw,
    hash: await sha256Hex(raw),
    prefix: prefixTag,
    lastFour: raw.slice(-4),
  };
}

/** Mints a webhook signing secret (shown once, stored hashed + encrypted-at-rest via hash only). */
export async function generateWebhookSecret(): Promise<{
  raw: string;
  hash: string;
  prefix: string;
}> {
  const raw = `whsec_${randomString(40)}`;
  return { raw, hash: await sha256Hex(raw), prefix: raw.slice(0, 11) };
}

export function maskKey(prefix: string, lastFour: string | null): string {
  return `${prefix}${"•".repeat(12)}${lastFour ?? ""}`;
}

/** Constant-time comparison for hex digests of equal length. */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** HMAC-SHA256 signature (hex) used for webhook delivery authentication. */
export async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
