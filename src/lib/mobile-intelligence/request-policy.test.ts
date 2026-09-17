import { describe, expect, it } from 'vitest';
import { assertMobileRequestAllowed } from './request-policy';

const request = { requestId: 'r1', deviceId: 'd1', capability: 'summarize' as const, risk: 'low' as const, input: 'x' };

describe('mobile request admission', () => {
  it('accepts a fresh authenticated request', () => {
    expect(() => assertMobileRequestAllowed({ protocolVersion: 1, authenticatedDeviceId: 'd1', request,
      rateWindow: { count: 1, windowStartedAt: '2026-09-17T17:00:00.000Z' }, recentRequests: [], now: new Date('2026-09-17T17:00:10.000Z') })).not.toThrow();
  });
  it('rejects replayed requests', () => {
    expect(() => assertMobileRequestAllowed({ protocolVersion: 1, authenticatedDeviceId: 'd1', request,
      rateWindow: { count: 1, windowStartedAt: '2026-09-17T17:00:00.000Z' }, recentRequests: [{ requestId: 'r1', seenAt: '2026-09-17T17:00:01.000Z' }], now: new Date('2026-09-17T17:00:10.000Z') })).toThrow('Mobile request replay detected');
  });
});
