import { describe, expect, it } from 'vitest';
import { toMobileTelemetry } from './telemetry';

describe('mobile telemetry', () => {
  it('contains no request input or device identity', () => {
    const event = toMobileTelemetry({ request: { requestId: 'r', deviceId: 'private-device', capability: 'rewrite', risk: 'low', input: 'private-text' },
      decision: { target: 'device', requiresApproval: false, reason: 'local', capability: 'rewrite' }, createdAt: '2026-09-17T17:00:00.000Z', auditVersion: 1 });
    expect(JSON.stringify(event)).not.toContain('private-text');
    expect(JSON.stringify(event)).not.toContain('private-device');
  });
});
