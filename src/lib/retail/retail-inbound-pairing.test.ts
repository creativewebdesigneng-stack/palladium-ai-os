import { describe, expect, it } from 'vitest';
import { createRetailInboundPairingToken } from './retail-inbound-pairing.server';

describe('Retail inbound voice pairing', () => {
  it('creates a high-entropy one-time Friendly Name proof without exposing the stored hash', () => {
    const first = createRetailInboundPairingToken();
    const second = createRetailInboundPairingToken();

    expect(first.token).toMatch(/^[0-9a-f]{36}$/);
    expect(first.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(first.expectedFriendlyName).toBe(`BLACKSTAR-${first.token}`);
    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).not.toBe(second.tokenHash);
  });
});
