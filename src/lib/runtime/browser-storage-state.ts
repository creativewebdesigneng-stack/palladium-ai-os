import crypto from "node:crypto";

export type BrowserStorageCookie = {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "Strict" | "Lax" | "None";
};

export type BrowserStorageOrigin = {
  origin: string;
  localStorage: Array<{ name: string; value: string }>;
};

export type BrowserStorageState = {
  cookies: BrowserStorageCookie[];
  origins: BrowserStorageOrigin[];
};

const MAX_STATE_BYTES = 256 * 1024;
const MAX_COOKIES = 200;
const MAX_ORIGINS = 50;
const MAX_LOCAL_STORAGE_PER_ORIGIN = 200;
const MAX_VALUE_CHARS = 16_000;

function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/^\./, "").replace(/^www\./, "");
}

function allowedHost(host: string, allowedDomains: string[]) {
  const normalized = normalizeDomain(host);
  return allowedDomains.some((entry) => {
    const allowed = normalizeDomain(entry);
    return normalized === allowed || normalized.endsWith(`.${allowed}`);
  });
}

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.slice(0, max) : "";
}

export function browserProfileScopeKey(allowedDomains: string[]) {
  const normalized = [...new Set(allowedDomains.map(normalizeDomain).filter(Boolean))].sort();
  return crypto.createHash("sha256").update(normalized.join("\n")).digest("hex");
}

export function sanitizeBrowserStorageState(value: unknown, allowedDomains: string[]): BrowserStorageState {
  const input = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const rawCookies = Array.isArray(input["cookies"]) ? input["cookies"] : [];
  const rawOrigins = Array.isArray(input["origins"]) ? input["origins"] : [];

  const cookies: BrowserStorageCookie[] = [];
  for (const item of rawCookies.slice(0, MAX_COOKIES)) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const domain = normalizeDomain(cleanText(row["domain"], 253));
    const name = cleanText(row["name"], 500);
    const cookieValue = cleanText(row["value"], MAX_VALUE_CHARS);
    if (!domain || !name || !allowedHost(domain, allowedDomains)) continue;
    const sameSite = row["sameSite"] === "Strict" || row["sameSite"] === "None" ? row["sameSite"] : "Lax";
    cookies.push({
      name,
      value: cookieValue,
      domain: cleanText(row["domain"], 253) || domain,
      path: cleanText(row["path"], 1000) || "/",
      expires: Number.isFinite(Number(row["expires"])) ? Number(row["expires"]) : -1,
      httpOnly: row["httpOnly"] === true,
      secure: row["secure"] === true,
      sameSite,
    });
  }

  const origins: BrowserStorageOrigin[] = [];
  for (const item of rawOrigins.slice(0, MAX_ORIGINS)) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const origin = cleanText(row["origin"], 2000);
    let parsed: URL;
    try { parsed = new URL(origin); } catch { continue; }
    if (!/^https?:$/.test(parsed.protocol) || !allowedHost(parsed.hostname, allowedDomains)) continue;
    const rawStorage = Array.isArray(row["localStorage"]) ? row["localStorage"] : [];
    const localStorage = rawStorage.slice(0, MAX_LOCAL_STORAGE_PER_ORIGIN).flatMap((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
      const storage = entry as Record<string, unknown>;
      const name = cleanText(storage["name"], 1000);
      if (!name) return [];
      return [{ name, value: cleanText(storage["value"], MAX_VALUE_CHARS) }];
    });
    origins.push({ origin: parsed.origin, localStorage });
  }

  const state = { cookies, origins };
  if (Buffer.byteLength(JSON.stringify(state), "utf8") > MAX_STATE_BYTES) {
    throw new Error("Browser session state exceeds the 256 KB persistence limit.");
  }
  return state;
}
