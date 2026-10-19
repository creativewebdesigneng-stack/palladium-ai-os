import { describe, expect, it, vi } from 'vitest';
import { createFakeSupabase } from '@/lib/runtime/__tests__/fake-supabase';
vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => { const chain = { middleware: () => chain, inputValidator: () => chain, handler: (handler: unknown) => handler }; return chain; },
}));
vi.mock('@/integrations/supabase/auth-middleware', () => ({ requireSupabaseAuth: {} }));
vi.mock('@/lib/platform/audit.server', () => ({ writeAudit: vi.fn() }));
vi.mock('@/lib/platform/entitlements.server', () => ({
  getEntitlements: vi.fn().mockResolvedValue({ planCode: 'builder' }),
}));
vi.mock('@/lib/mission/browser-agent', () => ({ browserProviderStatus: vi.fn() }));
const mocked = vi.hoisted(() => ({ granted: vi.fn(), execute: vi.fn() }));
vi.mock('@/lib/runtime/tools.server', () => ({
  TOOL_MANIFEST: [], resolveGrantedTools: mocked.granted, executeTool: mocked.execute,
}));
import { runToolManually } from './tools.functions';

const invoke = runToolManually as unknown as (args: {
  data: { agentId: string; tool: string; input: Record<string, unknown> };
  context: { supabase: ReturnType<typeof createFakeSupabase>; userId: string };
}) => Promise<any>;
const seed = () => createFakeSupabase({
  personal_agents: [{
    id: 'agent', user_id: 'owner', name: 'QA Agent', allowed_tools: ['email_send'],
    allowed_providers: ['google'], requires_approval: true, status: 'active',
  }],
  approval_requests: [],
});
describe('manual agent tool invocation approval boundary', () => {
  it('refuses tools needing a resumable human decision instead of queueing phantom approvals', async () => {
    const sb = seed();
    mocked.granted.mockResolvedValueOnce({
      grants: new Map([['email_send', { requiresApproval: true }]]),
    });
    await expect(invoke({
      data: { agentId: 'agent', tool: 'email_send', input: { recipient: 'nobody@example.invalid' } },
      context: { supabase: sb, userId: 'owner' },
    })).rejects.toThrow('cannot be run from the manual tester');
    expect(sb.tables['approval_requests']).toHaveLength(0);
    expect(mocked.execute).not.toHaveBeenCalled();
  });

  it('requires an agent belonging to the authenticated caller', async () => {
    const sb = seed();
    await expect(invoke({
      data: { agentId: 'agent', tool: 'email_send', input: {} },
      context: { supabase: sb, userId: 'other' },
    })).rejects.toThrow('not available');
  });

  it('recognises integration_action queued with a pending receipt as awaiting approval', async () => {
    const sb = seed();
    mocked.granted.mockResolvedValueOnce({
      grants: new Map([['integration_action', { requiresApproval: true }]]),
    });
    mocked.execute.mockResolvedValueOnce({
      ok: true,
      output: {
        queued: true, approval_request_id: 'immutable-approval', status: 'pending',
        provider: 'google', action: 'calendar_create',
      },
    });
    const result = await invoke({
      data: { agentId: 'agent', tool: 'integration_action', input: {
        provider: 'google', action: 'calendar_create', input: {},
      } },
      context: { supabase: sb, userId: 'owner' },
    });
    expect(result.status).toBe('awaiting_approval');
    expect(result.approvalRequestId).toBe('immutable-approval');
    expect(sb.tables['approval_requests']).toHaveLength(0);
  });

  it('reports a real self-queued connector approval as pending, not tool succeeded', async () => {
    const sb = seed();
    mocked.granted.mockResolvedValueOnce({
      grants: new Map([['nango_action', { requiresApproval: true }]]),
    });
    mocked.execute.mockResolvedValueOnce({
      ok: true,
      output: { approval_request_id: 'approved-later', status: 'awaiting_approval', requires_approval: true },
    });
    const result = await invoke({
      data: { agentId: 'agent', tool: 'nango_action', input: { provider: 'google', action: 'calendar_create' } },
      context: { supabase: sb, userId: 'owner' },
    });
    expect(result.status).toBe('awaiting_approval');
    expect(result.approvalRequestId).toBe('approved-later');
    expect(sb.tables['approval_requests']).toHaveLength(0);
  });
});
