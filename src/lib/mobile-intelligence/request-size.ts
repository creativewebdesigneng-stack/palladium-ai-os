export const MAX_MOBILE_REQUEST_BYTES = 256 * 1024;

export function assertMobileRequestSize(input: unknown, maxBytes = MAX_MOBILE_REQUEST_BYTES): void {
  const bytes = new TextEncoder().encode(JSON.stringify(input)).byteLength;
  if (bytes > maxBytes) throw new Error('Mobile request payload too large');
}
