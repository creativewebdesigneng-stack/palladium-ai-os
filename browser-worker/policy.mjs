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
  const address = String(ip || "").trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (!net.isIP(address)) return true;
  if (net.isIPv4(address)) {
    const [a, b, c] = address.split(".").map(Number);
    // Deny local, shared/CGNAT, benchmarking, documentation, multicast and
    // special-purpose ranges, not only RFC1918. A browser must not be able
    // to visit those networks via a public-looking, rebinding hostname.
    return a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || (b === 0 && c === 0) || (b === 0 && c === 2) || (b === 88 && c === 99))) ||
      (a === 198 && ((b === 18 || b === 19) || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113) ||
      a >= 224;
  }
  // IPv4-mapped and NAT64 addresses can represent restricted IPv4 hosts.
  // Reject the family rather than trying to guess whether a mapped host is safe.
  if (address.includes("::ffff:") || address.startsWith("64:ff9b:")) return true;
  const segments = address.split(":");
  const first = Number.parseInt(segments[0] || "0", 16);
  if (address === "::" || address === "::1" || first === 0 ||
      (first >= 0xfc00 && first <= 0xfdff) ||
      (first >= 0xfe80 && first <= 0xfebf) ||
      (first >= 0xff00 && first <= 0xffff) ||
      address.startsWith("2001:db8:")) return true;
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
