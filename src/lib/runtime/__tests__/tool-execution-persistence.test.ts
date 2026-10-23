import { describe, expect, it, vi } from 'vitest';
import { createFakeSupabase } from './fake-supabase';
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: createFakeSupabase() }));
import { executeTool } from '../tools.server';

// Real handlers, isolated database double. These are not live browser acceptance.
const cases = [
  ['calculator', { expression: '6 * 7' }],
  ['html_studio', { action: 'list_documents' }],
] as const;

describe('tool success requires durable execution evidence', () => {
  it.each(cases)('%s confirms the execution row and preserves task ownership', async (name, input) => {
    const sb = createFakeSupabase();
    const result = await executeTool(name, input, {
      sb, userId: 'owner', orgId: null, agentId: 'agent', taskId: 'task',
    }, new Map([[name, { slug: name, requiresApproval: false, allowedDomains: [], spendCap: null }]]));
    expect(result.ok).toBe(true);
    expect(sb.tables['tool_executions']).toEqual([expect.objectContaining({
      id: expect.any(String), user_id: 'owner', agent_id: 'agent', agent_task_id: 'task',
      tool: name, status: 'succeeded',
    })]);
  });

  for (const failure of ['database_error', 'missing_row', 'transport_error'] as const) {
    it.each(cases)(`%s fails closed on ${failure} without repeating the handler`, async (name, input) => {
      const db = createFakeSupabase();
      const handlerReads = vi.fn(db.from);
      const writes = vi.fn(() => ({
        select: () => ({ maybeSingle: async () => {
          if (failure === 'transport_error') throw new Error('private transport detail');
          return { data: null, error: failure === 'database_error' ? { message: 'private database detail' } : null };
        } }),
      }));
      const sb = { from: (table: string) => table === 'tool_executions' ? { insert: writes } : handlerReads(table) };
      const result = await executeTool(name, input, {
        sb, userId: 'owner', orgId: null, agentId: 'agent', taskId: 'task',
      }, new Map([[name, { slug: name, requiresApproval: false, allowedDomains: [], spendCap: null }]]));
      expect(result).toMatchObject({ ok: false, output: {
        code: 'TOOL_EXECUTION_EVIDENCE_UNCONFIRMED', execution_may_have_occurred: true, retry_safe: false,
      } });
      expect(writes).toHaveBeenCalledTimes(1);
      if (name === 'html_studio') expect(handlerReads).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(result)).not.toContain('private');
    });
  }
});
