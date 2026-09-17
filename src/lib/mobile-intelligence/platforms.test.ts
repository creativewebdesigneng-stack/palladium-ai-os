import { describe, expect, it } from 'vitest';
import { normalizeMobilePlatformReport, supportsNativeAppActions } from './platforms';

describe('mobile platform adapters', () => {
  it('normalizes Apple native intelligence capability reports', () => {
    const device = normalizeMobilePlatformReport({
      platform: 'ios', osVersion: '26', nativeIntelligenceAvailable: true,
      capabilities: ['summarize', 'summarize', 'app_action'], appActionsAvailable: true,
    });
    expect(device.nativeProvider).toBe('apple-foundation-models');
    expect(device.capabilities).toEqual(['summarize', 'app_action']);
    expect(supportsNativeAppActions(device)).toBe(true);
  });

  it('does not advertise Android native intelligence when unavailable', () => {
    const device = normalizeMobilePlatformReport({
      platform: 'android', osVersion: '16', nativeIntelligenceAvailable: false,
    });
    expect(device.nativeProvider).toBeUndefined();
    expect(device.capabilities).toEqual([]);
  });
});
