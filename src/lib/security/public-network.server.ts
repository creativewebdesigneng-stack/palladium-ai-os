import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type PublicLookupFn = (host: string) => Promise<Array<{ address: string; family: number }>>;

function isIpv4Private(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a = 0, b = 0, c = 0] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 192 && ((b === 0 && (c === 0 || c === 2)) || (b === 88 && c === 99))) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

export function isUnsafeNetworkAddress(address: string): boolean {
  const value = address.toLowerCase().replace(/^\[|\]$/g, "");
  if (!isIP(value)) return true;
  if (isIpv4Private(value)) return true;
  if (value === "::" || value === "::1") return true;
  if (/^(fc|fd)[0-9a-f]{2}:/i.test(value) || /^fe[89ab][0-9a-f]:/i.test(value)) return true;
  // Mapped IPv4, NAT64, multicast and reserved IPv6 must not become alternate
  // paths to private services or metadata endpoints.
  const first = Number.parseInt(value.split(':')[0] || '0',16);
  return value.includes('::ffff:') || value.startsWith('64:ff9b:') || first===0 ||
    first>=0xfe80 || first===0x2002 || value.startsWith('2001:db8:') ||
    value.startsWith('2001:0:') || value.startsWith('2001::');
}

/** Validate every DNS answer before dispatch; connection-time egress filtering is still required. */
export async function assertPublicNetworkEndpoint(endpoint: URL, lookupImpl: PublicLookupFn = host => lookup(host, { all: true, verbatim: true })): Promise<void> {
  const addresses = await lookupImpl(endpoint.hostname.replace(/^\[|\]$/g, ''));
  if (!addresses.length || addresses.some(item => isUnsafeNetworkAddress(item.address))) {
    throw new Error("Endpoint resolved to a private or unavailable network address.");
  }
}
