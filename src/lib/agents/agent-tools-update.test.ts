import { describe, it, expect, vi } from 'vitest';
import { createFakeSupabase } from '@/lib/runtime/__tests__/fake-supabase';
vi.mock('@/lib/runtime/tools.server', () => ({ TOOL_MANIFEST: [{ slug: 'browser' }, { slug: 'browser_task' }] }));
vi.mock('@/lib/platform/audit.server', () => ({ writeAudit: vi.fn(), writeAuditRequired: vi.fn().mockResolvedValue('intent') }));
import { writeAuditRequired } from '@/lib/platform/audit.server';
import { changeOwnedAgentTools } from './agent-tools-update.server';
const seed = () => createFakeSupabase({ personal_agents: [{ id: 'agent', user_id: 'owner', updated_at: 'before', allowed_tools: [], model: 'groq', requires_approval: true, preferences: { keep: true } }], tools: [{ slug: 'browser', is_active: true }, { slug: 'placeholder', is_active: true }], tool_permissions: [{ tool: 'browser', allowed_domains: ['httpbingo.org'], requires_approval: true }] });
const args = (sb: any) => ({ sb, userId: 'owner', id: 'agent', tools: ['browser'], expectedUpdatedAt: 'before' });
describe('existing agent tool selection', () => {
  it('saves executable assignments without rewriting model, preferences or policy', async () => {
    const sb = seed(); const row = await changeOwnedAgentTools(args(sb));
    expect(row.allowed_tools).toEqual(['browser']); expect(row.model).toBe('groq'); expect(row.preferences).toEqual({ keep: true }); expect(row.requires_approval).toBe(true);
    expect(sb.tables['tool_permissions']?.[0]?.['allowed_domains']).toEqual(['httpbingo.org']);
  });
  it('rejects another owner and stale configuration', async () => {
    const sb = seed();
    await expect(changeOwnedAgentTools({ ...args(sb), userId: 'other' })).rejects.toThrow('not found');
    await expect(changeOwnedAgentTools({ ...args(sb), expectedUpdatedAt: 'stale' })).rejects.toThrow('changed');
    expect(sb.tables['personal_agents']?.[0]?.['allowed_tools']).toEqual([]);
  });
  it('rejects catalogue placeholders', async () => {
    const sb = seed(); await expect(changeOwnedAgentTools({ ...args(sb), tools: ['placeholder'] })).rejects.toThrow('executable');
  });
  it('does not mutate assignments if required audit fails', async () => {
    vi.mocked(writeAuditRequired).mockRejectedValueOnce(new Error('audit unavailable'));
    const sb = seed(); await expect(changeOwnedAgentTools(args(sb))).rejects.toThrow('audit unavailable');
    expect(sb.tables['personal_agents']?.[0]?.['allowed_tools']).toEqual([]);
  });
});
