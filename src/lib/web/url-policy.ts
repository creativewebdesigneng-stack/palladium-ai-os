const PRIVATE_HOST = /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$)/i;

export function isPublicHttpUrl(value: unknown) {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    const host = url.hostname.toLowerCase();
    if (!host || PRIVATE_HOST.test(host) || host.endsWith('.local') || host.endsWith('.internal')) return false;
    return true;
  } catch {
    return false;
  }
}

export function assertPublicHttpUrl(value: unknown, label = 'URL') {
  if (!isPublicHttpUrl(value)) throw new Error(`${label} must be a public HTTP(S) URL.`);
  return String(value);
}
