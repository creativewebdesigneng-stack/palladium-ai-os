import { describe, expect, it, vi } from 'vitest';
import { createFakeSupabase } from '@/lib/runtime/__tests__/fake-supabase';

vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => {
    const fn = { middleware: () => fn, inputValidator: () => fn, handler: (handler: unknown) => handler };
    return fn;
  },
}));
vi.mock('@/integrations/supabase/auth-middleware', () => ({ requireSupabaseAuth: {} }));
vi.mock('@/lib/platform/audit.server', () => ({ writeAudit: vi.fn() }));
vi.mock('@/lib/platform/entitlements.server', () => ({
  getEntitlements: vi.fn().mockResolvedValue({ planCode: 'builder' }),
}));
vi.mock('@/lib/mission/browser-agent', () => ({ browserProviderStatus: vi.fn() }));
vi.mock('@/lib/runtime/tools.server', () => ({
  TOOL_MANIFEST: ['web_search', 'web_fetch', 'http_request'].map(slug => ({ slug })),
  resolveGrantedTools: vi.fn(), executeTool: vi.fn(),
}));
import { getGovernedReadEvidence } from './tools.functions';

const taskId = '11111111-1111-4111-8111-111111111111';
const task = { id: taskId, user_id: 'owner', agent_id: 'qa-agent', status: 'succeeded' };
const specs = {
  web_search: {
    input: { query: 'public report', limit: 5 },
    output: { query: 'public report', results: [{ title: 'Report', url: 'https://example.org/report', snippet: 'Public data' }] },
    route: 'web_search_http',
  },
  web_fetch: {
    input: { url: 'https://httpbingo.org/html' },
    output: { url: 'https://httpbingo.org/html', text: 'Public HTML page' },
    route: 'public_https_fetch',
  },
  http_request: {
    input: { url: 'https://httpbingo.org/html', method: 'GET' },
    output: { ok: true, status: 200, body: 'Public GET response' },
    route: 'public_https_get',
  },
} as const;
type Name = keyof typeof specs;

function fixture(tool: Name = 'web_fetch', overrides: Record<string, unknown> = {}) {
  const spec = specs[tool];
  const content = JSON.stringify(spec.output);
  return createFakeSupabase({
    agent_tasks: [{ ...task, ...(overrides['task'] as object || {}) }],
    tools: [{ slug: tool, is_active: overrides['active'] !== false }],
    tool_executions: [{
      user_id: 'owner', agent_id: 'qa-agent', agent_task_id: taskId,
      tool, status: 'succeeded', input: spec.input, output: spec.output,
    }],
    approval_requests: [{
      user_id: 'owner', agent_id: 'qa-agent', action_type: 'agent_tool_task',
      status: 'approved', execution_status: 'succeeded',
      details: { agent_task_id: taskId, tool, input: spec.input },
      execution_result: {
        agent_task_id: taskId, provider: spec.route, simulated: false,
        task_status: 'succeeded',
        tool_evidence: { format: 'json', content, characters: content.length, truncated: false },
      },
      ...(overrides['approval'] as object || {}),
    }],
  });
}

const check = getGovernedReadEvidence as unknown as (args: {
  context: { supabase: ReturnType<typeof createFakeSupabase>; userId: string };
  data: { taskId: string; tool: string };
}) => Promise<any>;
function invoke(sb: ReturnType<typeof createFakeSupabase>, tool = 'web_fetch', userId = 'owner') {
  return check({ data: { taskId, tool }, context: { supabase: sb, userId } });
}

describe('owner-scoped network QA verification endpoint', () => {
  it.each(Object.keys(specs) as Name[])('reports real matching %s receipt without returning its original payload', async tool => {
    const sb = fixture(tool);
    const result = await invoke(sb, tool);
    expect(result).toEqual({
      taskId, tool, taskStatus: 'succeeded', evidenceState: 'network_verified',
      verified: true, attempts: 1, approvalPending: false,
    });
    expect(JSON.stringify(result)).not.toContain('Public HTML');
    expect(JSON.stringify(result)).not.toContain('httpbingo.org');
    expect(sb.tables['tool_executions']).toHaveLength(1);
    expect(sb.tables['approval_requests']).toHaveLength(1);
  });

  it('never reads another owner’s task even if the task ID is known', async () => {
    await expect(invoke(fixture(), 'web_fetch', 'foreign-user')).rejects.toThrow('not available');
  });

  it('requires the original agent task to succeed before certification', async () => {
    const sb = fixture('web_fetch', { task: { status: 'waiting_for_approval' } });
    const result = await invoke(sb);
    expect(result).toMatchObject({ verified: false, taskStatus: 'waiting_for_approval' });
  });

  it('returns pending for an unexecuted approval and no successful tool run', async () => {
    const sb = fixture();
    sb.tables['tool_executions'] = [];
    Object.assign(sb.tables['approval_requests']![0]!, {
      status: 'pending', execution_status: null, execution_result: null,
    });
    const result = await invoke(sb);
    expect(result).toMatchObject({ verified: false, approvalPending: true, attempts: 0, evidenceState: 'not_tested' });
  });

  it('refuses a receipt from another agent, a simulated result or disabled catalogue', async () => {
    for (const kind of ['foreign_agent', 'simulated', 'disabled'] as const) {
      const sb = fixture('web_fetch', kind === 'disabled' ? { active: false } : {});
      if (kind === 'foreign_agent') sb.tables['approval_requests']![0]!['agent_id'] = 'another-agent';
      if (kind === 'simulated') sb.tables['tool_executions']![0]!['output'] = { simulated: true };
      const result = await invoke(sb);
      expect(result.verified).toBe(false);
    }
  });

  it('does not infer evidence from a mismatched approved request', async () => {
    const sb = fixture();
    sb.tables['approval_requests']![0]!['details']['input'] = { url: 'https://another.example/path' };
    expect((await invoke(sb)).verified).toBe(false);
  });
});
