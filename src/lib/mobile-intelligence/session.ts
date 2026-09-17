export interface MobileDeviceSession {
  deviceId: string;
  issuedAt: string;
  expiresAt: string;
  revokedAt?: string;
}

export function isMobileSessionActive(session: MobileDeviceSession, now = new Date()): boolean {
  if (session.revokedAt) return false;
  const expiry = Date.parse(session.expiresAt);
  return Number.isFinite(expiry) && expiry > now.getTime();
}
