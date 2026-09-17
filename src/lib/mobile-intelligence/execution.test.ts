import { describe, expect, it } from 'vitest';
import { prepareMobileExecution } from './execution';

const device = { platform: 'ios' as const, osVersion: '26', nativeIntelligenceAvailable: true,
  nativeProvider: 'apple-foundation-models' as const, capabilities: ['camera_context' as const, 'app_action' as const], appActionsAvailable: true };

describe('prepareMobileExecution', () => {
  it('blocks sensitive context transfer without consent', () => {
    const result = prepareMobileExecution({ requestId: 'r1', deviceId: 'd', capability: 'camera_context', risk: 'low', input: {} }, device);
    expect(result.executable).toBe(false);
    expect(result.transfer.allowed).toBe(false);
  });
  it('blocks consequential action until approval', () => {
    const result = prepareMobileExecution({ requestId: 'r2', deviceId: 'd', capability: 'app_action', risk: 'high', input: {} }, device);
    expect(result.executable).toBe(false);
    expect(result.approval.needsApprovalRequest).toBe(true);
  });
});
