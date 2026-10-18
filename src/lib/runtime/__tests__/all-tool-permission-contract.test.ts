import { describe, expect, it, vi } from 'vitest';
import { createFakeSupabase } from './fake-supabase';
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: createFakeSupabase() }));
import { executeTool, resolveGrantedTools, TOOL_SLUGS } from '../tools.server';
const db = () => createFakeSupabase({ tools: TOOL_SLUGS.map(slug => ({ slug, is_active: true, min_plan: null, requires_approval: false })), tool_permissions: [], tool_executions: [] });
const extensions = ['skill_script', 'social_ops', 'html_studio', 'agent_workspace', 'seo_ops', 'app_studio', 'voxel_studio', 'three_d_studio', 'game_foundry', 'cinema_studio', 'short_video', 'astra_vision', 'astra_async_workflow', 'astra_orchestrate'];
describe('every registered agent tool', () => {
  it.each([
    ['calculator', { expression: '37 * 19 + 5' }, { value: 708 }],
    ['data_analysis', { values: [2, 4, 6, 8] }, { count: 4, sum: 20, mean: 5, min: 2, max: 8, median: 5 }],
  ] as const)('%s executes the real implementation for known inputs', async (tool, input, expected) => {
    const sb = db(); const resolved = await resolveGrantedTools(sb, { id: 'agent', allowed_tools: [tool], requires_approval: false }, 'enterprise');
    const result = await executeTool(tool, { ...input }, { sb, userId: 'owner', agentId: 'agent', taskId: 'task', orgId: null }, resolved.grants);
    expect(result).toMatchObject({ ok: true, output: expected });
    expect(sb.tables['tool_executions']).toEqual([expect.objectContaining({ tool, status: 'succeeded' })]);
  });
  it('current_time returns the actual execution time', async () => {
    const sb = db(); const resolved = await resolveGrantedTools(sb, { id: 'agent', allowed_tools: ['current_time'] }, 'enterprise');
    const before = Date.now();
    const result = await executeTool('current_time', {}, { sb, userId: 'owner', agentId: 'agent', taskId: 'task', orgId: null }, resolved.grants);
    expect(result.ok).toBe(true);
    const timestamp = Date.parse((result.output as { iso: string }).iso);
    expect(timestamp).toBeGreaterThanOrEqual(before); expect(timestamp).toBeLessThanOrEqual(Date.now());
  });
  it.each(TOOL_SLUGS)('%s cannot execute without a grant and records the denial', async tool => {
    const sb = db();
    const result = await executeTool(tool, {}, { sb, userId: 'owner', agentId: 'agent', taskId: 'task', orgId: null }, new Map());
    expect(result.ok).toBe(false);
    expect(sb.tables['tool_executions']).toEqual([expect.objectContaining({ tool, status: 'failed', agent_task_id: 'task' })]);
  });
  it.each(TOOL_SLUGS)('%s respects an explicit disabled assignment', async tool => {
    const sb = db(); sb.tables['tool_permissions']!.push({ tool, agent_id: 'agent', enabled: false });
    const resolved = await resolveGrantedTools(sb, { id: 'agent', allowed_tools: [tool] }, 'enterprise');
    expect(resolved.grants.has(tool)).toBe(false);
  });
  it.each(extensions)('%s preserves global approval, domain and spend policy and blocks before dispatch', async tool => {
    const sb = db(); sb.tables['tool_permissions']!.push({ tool, agent_id: 'agent', enabled: true, requires_approval: false, allowed_domains: ['httpbingo.org'], spend_cap: 0 });
    const resolved = await resolveGrantedTools(sb, { id: 'agent', allowed_tools: [tool], requires_approval: true }, 'enterprise');
    expect(resolved.grants.get(tool)).toMatchObject({ requiresApproval: true, allowedDomains: ['httpbingo.org'], spendCap: 0 });
    const result = await executeTool(tool, {}, { sb, userId: 'owner', agentId: 'agent', taskId: 'task', orgId: null }, resolved.grants);
    expect(result).toMatchObject({ ok: false, output: { requires_approval: true } });
    expect(sb.tables['tool_executions']).toEqual([expect.objectContaining({ tool, status: 'failed' })]);
  });
  it.each(extensions)('%s cannot override a catalogue approval requirement with a false permission', async tool => {
    const sb = db(); sb.tables['tools']!.find(row => row['slug'] === tool)!['requires_approval'] = true;
    sb.tables['tool_permissions']!.push({ tool, agent_id: 'agent', enabled: true, requires_approval: false });
    expect((await resolveGrantedTools(sb, { id: 'agent', allowed_tools: [tool], requires_approval: false }, 'enterprise')).grants.get(tool)?.requiresApproval).toBe(true);
  });
});
