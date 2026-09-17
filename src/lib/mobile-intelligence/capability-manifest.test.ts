import { describe, expect, it } from 'vitest';
import { createCapabilityManifest } from './capability-manifest';

describe('mobile capability manifest', () => {
  it('normalizes and versions device capability exchange', () => {
    expect(createCapabilityManifest({ platform: 'ios', osVersion: '26', nativeIntelligenceAvailable: true,
      nativeProvider: 'apple-foundation-models', capabilities: ['rewrite', 'summarize', 'rewrite'], appActionsAvailable: false }))
      .toEqual({ schemaVersion: 1, platform: 'ios', provider: 'apple-foundation-models', capabilities: ['rewrite', 'summarize'], appActionsAvailable: false });
  });
});
