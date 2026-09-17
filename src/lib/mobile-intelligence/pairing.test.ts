import { describe, expect, it } from 'vitest';
import { canUsePairedDevice, revokePairedDevice } from './pairing';

const paired = {
  id: 'device-1', userId: 'user-1', displayName: 'Phone', pairedAt: '2026-09-17T17:00:00.000Z',
  capabilities: { platform: 'ios' as const, osVersion: '26', nativeIntelligenceAvailable: true,
    nativeProvider: 'apple-foundation-models' as const, capabilities: ['summarize' as const], appActionsAvailable: false },
};

describe('mobile pairing', () => {
  it('allows an active paired device', () => expect(canUsePairedDevice(paired)).toBe(true));
  it('revokes a paired device', () => {
    const revoked = revokePairedDevice(paired, new Date('2026-09-17T18:00:00.000Z'));
    expect(canUsePairedDevice(revoked)).toBe(false);
    expect(revoked.revokedAt).toBe('2026-09-17T18:00:00.000Z');
  });
});
