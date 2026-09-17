import { describe, expect, it } from 'vitest';
import { mobileIntelligenceRequestSchema, mobilePlatformReportSchema } from './validation';

describe('mobile intelligence validation', () => {
  it('accepts a capability-detected iOS report', () => {
    expect(mobilePlatformReportSchema.parse({
      platform: 'ios', osVersion: '26', nativeIntelligenceAvailable: true,
      capabilities: ['summarize'], appActionsAvailable: false,
    }).platform).toBe('ios');
  });

  it('rejects unknown capabilities and unbounded identifiers', () => {
    expect(() => mobilePlatformReportSchema.parse({
      platform: 'android', osVersion: '16', nativeIntelligenceAvailable: true, capabilities: ['root_device'],
    })).toThrow();
    expect(() => mobileIntelligenceRequestSchema.parse({
      requestId: 'x'.repeat(129), deviceId: 'd', capability: 'rewrite', risk: 'low', input: 'x',
    })).toThrow();
  });
});
