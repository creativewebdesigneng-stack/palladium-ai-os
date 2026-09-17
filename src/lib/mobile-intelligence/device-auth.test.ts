import { describe, expect, it } from 'vitest';
import { assertDeviceMatchesRequest, isDeviceChallengeFresh } from './device-auth';

describe('mobile device authentication', () => {
  it('accepts a fresh sufficiently random challenge', () => {
    expect(isDeviceChallengeFresh({ deviceId: 'd', nonce: 'x'.repeat(32), expiresAt: '2026-09-17T18:10:00.000Z' }, new Date('2026-09-17T18:00:00.000Z'))).toBe(true);
  });
  it('rejects identity substitution', () => {
    expect(() => assertDeviceMatchesRequest('device-a', 'device-b')).toThrow('Mobile device identity mismatch');
  });
});
