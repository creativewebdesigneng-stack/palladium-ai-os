import { describe, expect, it } from 'vitest';
import { routeMobileIntelligence } from './router';
import type { MobileDeviceCapabilities } from './contracts';

const ios: MobileDeviceCapabilities = {
  platform: 'ios',
  osVersion: '26',
  nativeIntelligenceAvailable: true,
  nativeProvider: 'apple-foundation-models',
  capabilities: ['summarize', 'rewrite', 'app_action'],
  appActionsAvailable: true,
};

describe('routeMobileIntelligence', () => {
  it('keeps supported low-risk work on device when requested', () => {
    expect(routeMobileIntelligence({
      requestId: 'r1', deviceId: 'd1', capability: 'summarize', risk: 'low', input: 'text', preferOnDevice: true,
    }, ios)).toMatchObject({ target: 'device', requiresApproval: false });
  });

  it('requires approval for app actions', () => {
    expect(routeMobileIntelligence({
      requestId: 'r2', deviceId: 'd1', capability: 'app_action', risk: 'medium', input: {},
    }, ios)).toMatchObject({ target: 'hybrid', requiresApproval: true });
  });

  it('falls back to Astra when the device lacks a capability', () => {
    expect(routeMobileIntelligence({
      requestId: 'r3', deviceId: 'd1', capability: 'image_understanding', risk: 'low', input: {}, preferOnDevice: true,
    }, ios)).toMatchObject({ target: 'astra', requiresApproval: false });
  });
});
