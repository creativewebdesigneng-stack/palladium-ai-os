import { describe, expect, it } from 'vitest';
import { assessNativeProvider } from './provider-policy';

describe('native provider policy', () => {
  it('uses capability-detected providers without platform lock-in', () => {
    expect(assessNativeProvider({ platform: 'android', osVersion: '16', nativeIntelligenceAvailable: true,
      nativeProvider: 'other', capabilities: [], appActionsAvailable: false })).toMatchObject({ provider: 'other', usable: true });
  });
  it('does not invent a provider when native intelligence is unavailable', () => {
    expect(assessNativeProvider({ platform: 'ios', osVersion: '26', nativeIntelligenceAvailable: false,
      capabilities: [], appActionsAvailable: false }).usable).toBe(false);
  });
});
