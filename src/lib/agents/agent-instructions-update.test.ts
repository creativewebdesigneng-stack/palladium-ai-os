import { describe, it, expect, vi } from 'vitest';
import { createFakeSupabase } from '@/lib/runtime/__tests__/fake-supabase';
vi.mock('@/lib/platform/audit.server', () => ({ writeAudit: vi.fn(), writeAuditRequired: vi.fn().mockResolvedValue('intent') }));
import { writeAuditRequired } from '@/lib/platform/audit.server';
import { changeOwnedAgentInstructions } from './agent-instructions-update.server';
const seed = () => createFakeSupabase({ personal_agents: [{
  id: 'agent', user_id: 'owner', updated_at: 'before', instructions: 'Do not use tools.',
  allowed_tools: ['browser'], model: 'groq', requires_approval: true, memory_enabled: false,
  preferences: { keep: true },
}], tool_permissions: [{ tool: 'browser', allowed_domains: ['httpbingo.org'], requires_approval: true }] });
const args = (sb: any) => ({ sb, userId: 'owner', id: 'agent', instructions: 'Use assigned tools for authorised QA tasks.', expectedUpdatedAt: 'before' });
describe('existing agent instruction editing', () => {
  it('changes instructions while preserving tools, model, memory and approval policy', async () => {
    const sb = seed(); const row = await changeOwnedAgentInstructions(args(sb));
    expect(row.instructions).toBe(args(sb).instructions);
    expect(row.allowed_tools).toEqual(['browser']); expect(row.model).toBe('groq');
    expect(row.requires_approval).toBe(true); expect(row.memory_enabled).toBe(false);
    expect(row.preferences).toEqual({ keep: true });
    expect(sb.tables['tool_permissions']?.[0]?.['allowed_domains']).toEqual(['httpbingo.org']);
  });
  it('rejects another owner and stale edits without changing instructions', async () => {
    const sb = seed();
    await expect(changeOwnedAgentInstructions({ ...args(sb), userId: 'other' })).rejects.toThrow('not found');
    await expect(changeOwnedAgentInstructions({ ...args(sb), expectedUpdatedAt: 'stale' })).rejects.toThrow('changed');
    expect(sb.tables['personal_agents']?.[0]?.['instructions']).toBe('Do not use tools.');
  });
  it('does not mutate instructions when required audit fails', async () => {
    vi.mocked(writeAuditRequired).mockRejectedValueOnce(new Error('audit unavailable'));
    const sb = seed(); await expect(changeOwnedAgentInstructions(args(sb))).rejects.toThrow('audit unavailable');
    expect(sb.tables['personal_agents']?.[0]?.['instructions']).toBe('Do not use tools.');
  });
  it('allows clearing standing instructions without clearing tool assignments', async () => {
    const sb = seed(); const row = await changeOwnedAgentInstructions({ ...args(sb), instructions: '' });
    expect(row.instructions).toBeNull(); expect(row.allowed_tools).toEqual(['browser']);
  });
});
