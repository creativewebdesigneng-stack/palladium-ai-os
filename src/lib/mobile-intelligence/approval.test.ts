import { describe, expect, it } from 'vitest';
import { assessMobileApproval } from './approval';

const envelope = {
  request: { requestId: 'r', deviceId: 'd', capability: 'app_action' as const, risk: 'high' as const, input: {} },
  decision: { target: 'hybrid' as const, requiresApproval: true, reason: 'approval', capability: 'app_action' as const },
  createdAt: '2026-09-17T17:00:00.000Z', auditVersion: 1 as const,
};

describe('mobile approval boundary', () => {
  it('pauses consequential execution until approval', () => {
    expect(assessMobileApproval(envelope)).toMatchObject({ allowedToExecute: false, needsApprovalRequest: true });
  });
  it('allows execution after approval', () => {
    expect(assessMobileApproval(envelope, true)).toMatchObject({ allowedToExecute: true, needsApprovalRequest: false });
  });
});
