import dns from "node:dns/promises";
import net from "node:net";

export const MAX_BODY_BYTES = 256 * 1024;
export const MAX_SESSIONS = 20;
export const SESSION_TTL_MS = 15 * 60_000;
export const MAX_TEXT_CHARS = 20_000;

export function cleanAllowedDomains(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((v) => String(v).trim().toLowerCase().replace(/^www\./, "")).filter(Boolean))].slice(0, 50);
}

export function domainAllowed(host, allowedDomains) {
  const clean = String(host || "").toLowerCase().replace(/^www\./, "");
  return allowedDomains.some((domain) => clean === domain || clean.endsWith(`.${domain}`));
}

export function isPrivateIp(ip) {
  if (!net.isIP(ip)) return true;
  if (ip === "::1" || ip === "0:0:0:0:0:0:0:1") return true;
  if (ip.startsWith("fe80:") || ip.startsWith("fc") || ip.startsWith("fd")) return true;
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  return false;
}

export async function assertPublicHttpUrl(rawUrl, allowedDomains, { requireAllowedDomain = true } = {}) {
  let url;
  try { url = new URL(rawUrl); } catch { throw new Error("Invalid URL"); }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Only http(s) URLs are allowed");
  const host = url.hostname.toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("Private or local hosts are not allowed");
  }
  if (requireAllowedDomain && !domainAllowed(host, allowedDomains)) {
    throw new Error("URL is outside the session domain allow-list");
  }
  const addresses = await dns.lookup(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateIp(address))) {
    throw new Error("URL resolves to a private or unsafe network address");
  }
  return url;
}

export function bearerAuthorised(headers, expectedToken) {
  if (!expectedToken) return false;
  const header = String(headers.authorization || headers.Authorization || "");
  return header === `Bearer ${expectedToken}`;
}

export function safeSelector(value) {
  const selector = String(value || "").trim();
  if (!selector || selector.length > 1000) throw new Error("A valid selector is required");
  return selector;
}

export function safeText(value, max = 20_000) {
  return String(value ?? "").slice(0, max);
}
