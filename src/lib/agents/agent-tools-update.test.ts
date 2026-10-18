import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeSupabase } from '../runtime/__tests__/fake-supabase';
vi.mock('@/lib/runtime/tools.server', () => ({ TOOL_MANIFEST: [{ slug: 'browser_task' }, { slug: 'web_fetch' }] }));
vi.mock('@/lib/platform/audit.server', () => ({ writeAudit: vi.fn(), writeAuditRequired: vi.fn(async () => 'audit') }));
import { changeOwnedAgentTools } from './agent-tools-update.server';
import { writeAuditRequired } from '@/lib/platform/audit.server';
const agent = { id: 'a', user_id: 'owner', updated_at: 'old', allowed_tools: ['legacy'], model: 'groq', requires_approval: true, preferences: { identity: 'keep' } };
function setup() { return createFakeSupabase({ personal_agents: [agent], tools: [{ slug: 'browser_task', is_active: true }, { slug: 'web_fetch', is_active: true }], tool_permissions: [{ user_id: 'owner', agent_id: 'a', tool: 'browser_task', enabled: true, allowed_domains: ['httpbingo.org'] }] }); }
function change(sb: any, tools = ['legacy', 'browser_task'], userId = 'owner') { return changeOwnedAgentTools({ sb, tools, id: 'a', userId, expectedUpdatedAt: 'old' }); }
beforeEach(() => vi.clearAllMocks());
describe('owner-scoped existing agent tool editing', () => {
  it('persists assignments and preserves unrelated configuration and legacy tools', async () => {
    const sb = setup(); const updated = await change(sb);
    expect(updated.allowed_tools).toEqual(['legacy', 'browser_task']);
    expect(updated).toMatchObject({ model: 'groq', requires_approval: true, preferences: { identity: 'keep' } });
    expect(writeAuditRequired).toHaveBeenCalled();
  });
  it('rejects cross-owner and stale writes', async () => {
    const sb = setup(); await expect(change(sb, [], 'other')).rejects.toThrow('load');
    sb.tables['personal_agents']![0]!['updated_at'] = 'new'; await expect(change(sb)).rejects.toThrow('changed');
    expect(sb.tables['personal_agents']![0]!['allowed_tools']).toEqual(['legacy']);
  });
  it('does not assign missing or disabled executable tools', async () => {
    const sb = setup(); await expect(change(sb, ['unknown'])).rejects.toThrow('catalogue');
    sb.tables['tools']![0]!['is_active'] = false; await expect(change(sb)).rejects.toThrow('catalogue');
  });
  it.each([{ rows: [] }, { rows: [{ user_id: 'owner', agent_id: 'a', tool: 'browser_task', enabled: false, allowed_domains: ['httpbingo.org'] }] }, { rows: [{ user_id: 'owner', agent_id: 'a', tool: 'browser_task', enabled: true, allowed_domains: [] }] }])('requires a saved bounded browser policy', async ({ rows }) => {
    const sb = setup(); sb.tables['tool_permissions'] = rows as any;
    await expect(change(sb)).rejects.toThrow('domain restriction');
    expect(sb.tables['personal_agents']![0]!['allowed_tools']).toEqual(['legacy']);
  });
  it('fails closed when required audit cannot be saved', async () => {
    const sb = setup(); vi.mocked(writeAuditRequired).mockRejectedValueOnce(new Error('audit unavailable'));
    await expect(change(sb)).rejects.toThrow('audit unavailable');
    expect(sb.tables['personal_agents']![0]!['allowed_tools']).toEqual(['legacy']);
  });
  it('can remove all assignments without altering policy records', async () => {
    const sb = setup(); await change(sb, []);
    expect(sb.tables['personal_agents']![0]!['allowed_tools']).toEqual([]);
    expect(sb.tables['tool_permissions']).toHaveLength(1);
  });
});
