import { describe, expect, it } from 'vitest';
import { rowToMobileCapabilities } from './device-store';

describe('mobile device store', () => {
  it('maps persisted device capabilities without exposing ownership metadata', () => {
    const result = rowToMobileCapabilities({ id: 'd', user_id: 'u', display_name: 'Phone', platform: 'android', os_version: '16',
      native_intelligence_available: true, native_provider: 'gemini-nano', capabilities: ['summarize'], app_actions_available: false,
      paired_at: '2026-09-17T17:00:00.000Z' });
    expect(result).toEqual({ platform: 'android', osVersion: '16', nativeIntelligenceAvailable: true,
      nativeProvider: 'gemini-nano', capabilities: ['summarize'], appActionsAvailable: false });
  });
});
