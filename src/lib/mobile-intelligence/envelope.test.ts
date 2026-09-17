import { describe, expect, it } from 'vitest';
import { createMobileExecutionEnvelope } from './envelope';

const device = {
  platform: 'android' as const,
  osVersion: '16',
  nativeIntelligenceAvailable: true,
  nativeProvider: 'gemini-nano' as const,
  capabilities: ['rewrite' as const],
  appActionsAvailable: false,
};

describe('createMobileExecutionEnvelope', () => {
  it('pins the routing decision and audit version', () => {
    const envelope = createMobileExecutionEnvelope({
      requestId: 'r1', deviceId: 'd1', capability: 'rewrite', risk: 'low', input: 'text', preferOnDevice: true,
    }, device, new Date('2026-09-17T17:00:00.000Z'));
    expect(envelope.auditVersion).toBe(1);
    expect(envelope.createdAt).toBe('2026-09-17T17:00:00.000Z');
    expect(envelope.decision.target).toBe('device');
  });
});
