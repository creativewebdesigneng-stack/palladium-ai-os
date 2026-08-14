/**
 * Outbound webhooks are user-configured, so they must never be allowed to
 * target loopback, private networks, or cloud metadata endpoints. This check
 * is intentionally shared by configuration and delivery paths: old rows are
 * protected too, not only newly-created subscriptions.
 *
 * DNS rebinding must additionally be prevented by the deployment's outbound
 * firewall / egress proxy. URL validation can reject literal private IPs, but
 * cannot safely resolve DNS in every supported edge runtime.
 */
function isPrivateIpv4(host: string): boolean {
  const octets = host.split(".").map(Number);
  if (
    octets.length !== 4 ||
    octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false;
  }
  const [a, b] = octets;
  if (a === undefined || b === undefined) return false;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function isPrivateIpv6(host: string): boolean {
  const value = host.replace(/^\[|\]$/g, "").toLowerCase();
  return (
    value === "::1" ||
    value === "::" ||
    value.startsWith("fc") ||
    value.startsWith("fd") ||
    value.startsWith("fe8") ||
    value.startsWith("fe9") ||
    value.startsWith("fea") ||
    value.startsWith("feb")
  );
}

/** Returns a canonical, safe delivery URL or throws a client-safe error. */
export function validateWebhookUrl(raw: string): string {
  if (raw.trim().length > 500) throw new Error("Webhook URLs must be 500 characters or fewer.");
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error("Webhook URL must be a valid HTTPS URL.");
  }

  if (url.protocol !== "https:") throw new Error("Webhook URLs must use HTTPS.");
  if (url.username || url.password) throw new Error("Webhook URLs cannot include credentials.");

  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (
    !host ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    isPrivateIpv4(host) ||
    isPrivateIpv6(host)
  ) {
    throw new Error("Webhook URLs cannot target local or private network addresses.");
  }

  url.hostname = host;
  return url.toString();
}
