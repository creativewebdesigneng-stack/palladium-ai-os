export interface DeviceChallenge {
  deviceId: string;
  nonce: string;
  expiresAt: string;
}

export function isDeviceChallengeFresh(challenge: DeviceChallenge, now = new Date()): boolean {
  const expires = Date.parse(challenge.expiresAt);
  return Number.isFinite(expires) && expires > now.getTime() && challenge.nonce.length >= 32;
}

export function assertDeviceMatchesRequest(authenticatedDeviceId: string, requestedDeviceId: string): void {
  if (!authenticatedDeviceId || authenticatedDeviceId !== requestedDeviceId) {
    throw new Error('Mobile device identity mismatch');
  }
}
