import { describe, expect, it } from 'vitest';
import { toMobileAuditRecord } from './audit';

describe('mobile audit records', () => {
  it('does not copy request input into audit metadata', () => {
    const audit = toMobileAuditRecord({
      request: { requestId: 'r', deviceId: 'd', capability: 'summarize', risk: 'low', input: { secret: 'never-log-me' } },
      decision: { target: 'device', requiresApproval: false, reason: 'local', capability: 'summarize' },
      createdAt: '2026-09-17T17:00:00.000Z', auditVersion: 1,
    });
    expect(JSON.stringify(audit)).not.toContain('never-log-me');
  });
});
