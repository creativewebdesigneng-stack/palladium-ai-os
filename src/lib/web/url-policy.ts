import { isIP } from 'node:net';
import { isUnsafeNetworkAddress } from '@/lib/security/public-network.server';

export function isPublicHttpUrl(value: unknown) {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    if (url.username || url.password) return false;
    const host = url.hostname.toLowerCase().replace(/\.$/, '');
    if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return false;
    const address = host.replace(/^\[|\]$/g, '');
    if (isIP(address) && isUnsafeNetworkAddress(address)) return false;
    return true;
  } catch {
    return false;
  }
}

export function assertPublicHttpUrl(value: unknown, label = 'URL') {
  if (!isPublicHttpUrl(value)) throw new Error(`${label} must be a public HTTP(S) URL.`);
  return String(value);
}
