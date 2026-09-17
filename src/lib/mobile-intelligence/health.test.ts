import { describe, expect, it } from 'vitest';
import { assessMobileBridgeHealth } from './health';

describe('mobile bridge health', () => {
  it('is ready through Astra when native AI is unavailable', () => {
    expect(assessMobileBridgeHealth({ platform: 'android', osVersion: '16', nativeIntelligenceAvailable: false,
      capabilities: [], appActionsAvailable: false }, true)).toMatchObject({ ready: true, nativeReady: false, astraFallbackReady: true });
  });
  it('reports unavailable when no governed execution path exists', () => {
    expect(assessMobileBridgeHealth({ platform: 'ios', osVersion: '26', nativeIntelligenceAvailable: false,
      capabilities: [], appActionsAvailable: false }, false).ready).toBe(false);
  });
});
