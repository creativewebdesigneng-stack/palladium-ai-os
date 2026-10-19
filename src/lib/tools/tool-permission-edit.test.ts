import { describe, it, expect, vi } from 'vitest';
import { createFakeSupabase } from '../runtime/__tests__/fake-supabase';
vi.mock('@tanstack/react-start', () => ({ createServerFn: () => { const q = { middleware: () => q, inputValidator: () => q, handler: (fn: unknown) => fn }; return q; } }));
vi.mock('@/integrations/supabase/auth-middleware', () => ({ requireSupabaseAuth: {} }));
vi.mock('@/lib/runtime/tools.server', () => ({ TOOL_MANIFEST: [], executeTool: vi.fn(), resolveGrantedTools: vi.fn() }));
vi.mock('@/lib/mission/browser-agent', () => ({ browserProviderStatus: vi.fn() }));
vi.mock('@/lib/platform/audit.server', () => ({ writeAudit: vi.fn() }));
vi.mock('@/lib/platform/entitlements.server', () => ({ getEntitlements: vi.fn().mockResolvedValue({ planCode: 'builder' }) }));
import { saveToolPermission, getToolFramework, listToolExecutions } from './tools.functions';
const save = saveToolPermission as unknown as (args: any) => Promise<any>;
const load = getToolFramework as unknown as (args: any) => Promise<any>;
const seed = () => createFakeSupabase({ tools: [{ slug: 'browser', is_active: true }], personal_agents: [{ id: 'agent', user_id: 'owner' }], tool_permissions: [
  { id: 'other', user_id: 'other', agent_id: 'agent', tool: 'browser', enabled: false },
  { id: 'own', user_id: 'owner', agent_id: 'agent', tool: 'browser', enabled: true, requires_approval: true, allowed_domains: ['old.example'], spend_cap: 200 },
  { id: 'global', user_id: 'owner', agent_id: null, tool: 'browser', enabled: false },
] });
const call = (sb: unknown, data: unknown) => save({ context: { supabase: sb, userId: 'owner' }, data });
describe('existing tool permission editor API', () => {
  it('updates only the owner agent policy without an undefined null filter', async () => {
    const sb = seed(); const result = await call(sb, { agentId: 'agent', tool: 'browser', allowedDomains: ['https://httpbingo.org/html'], requiresApproval: true });
    expect(result.id).toBe('own'); expect(result.allowed_domains).toEqual(['httpbingo.org']); expect(result.requires_approval).toBe(true);
    expect(sb.tables['tool_permissions']?.find(r => r['id'] === 'other')?.['enabled']).toBe(false);
    expect(sb.tables['tool_permissions']?.find(r => r['id'] === 'global')?.['enabled']).toBe(false);
  });
  it('preserves approval, allowed domains, and spend cap when only enabled is changed', async () => {
    const sb = seed();
    const result = await call(sb, { agentId: 'agent', tool: 'browser', enabled: false });
    expect(result).toMatchObject({
      id: 'own', enabled: false, requires_approval: true,
      allowed_domains: ['old.example'], spend_cap: 200,
    });
    expect(sb.tables['tool_permissions']?.find(r => r['id'] === 'other')?.['enabled']).toBe(false);
  });
  it('changes only spend cap without silently weakening operator approval', async () => {
    const sb = seed();
    const result = await call(sb, { agentId: 'agent', tool: 'browser', spendCap: 25 });
    expect(result).toMatchObject({
      id: 'own', enabled: true, requires_approval: true,
      allowed_domains: ['old.example'], spend_cap: 25,
    });
  });
  it('defaults new permissions to tool policy approval instead of approval=false', async () => {
    const sb = seed();
    sb.tables['tool_permissions'] = [];
    sb.tables['tools']![0]!['requires_approval'] = true;
    const inserted = await call(sb, { tool: 'browser', enabled: true });
    expect(inserted).toMatchObject({
      requires_approval: true, enabled: true, allowed_domains: [], spend_cap: null,
    });
  });
  it.each([
    { allowedDomains: ['https://user:password@example.org/private'] },
    { allowedDomains: ['*.example.org'] },
    { allowedDomains: Array(51).fill('example.org') },
    { spendCap: -1 },
    { spendCap: Infinity },
  ])('rejects invalid policy updates instead of truncating unsafe values', async data => {
    const sb = seed();
    await expect(call(sb, { agentId: 'agent', tool: 'browser', ...data })).rejects.toThrow();
    expect(sb.tables['tool_permissions']?.find(r => r['id'] === 'own')?.['requires_approval']).toBe(true);
    expect(sb.tables['tool_permissions']?.find(r => r['id'] === 'own')?.['allowed_domains']).toEqual(['old.example']);
  });
  it('returns only the current user policy and agents even if the query adapter can see others', async () => {
    const sb = seed();
    const result = await load({ context: { supabase: sb, userId: 'owner' } });
    expect(result.permissions.map((row: any) => row.id)).toEqual(['own', 'global']);
    expect(result.agents.map((row: any) => row.id)).toEqual(['agent']);
  });
  it('reads tool execution history only for its owner and rejects unbounded limits', async () => {
    const sb = seed();
    sb.tables['tool_executions'] = [
      { id: 'own-run', user_id: 'owner', tool: 'browser', status: 'succeeded' },
      { id: 'other-run', user_id: 'other', tool: 'browser', status: 'succeeded' },
    ];
    const history = listToolExecutions as unknown as (args: any) => Promise<any>;
    const result = await history({ context: { supabase: sb, userId: 'owner' }, data: { limit: 50 } });
    expect(result.map((row: any) => row.id)).toEqual(['own-run']);
    await expect(history({ context: { supabase: sb, userId: 'owner' }, data: { limit: -1 } })).rejects.toThrow('limit');
  });

  it('keeps account-wide and per-agent policies separate', async () => {
    const result = await call(seed(), { tool: 'browser', enabled: true }); expect(result.id).toBe('global');
  });
  it('rejects a different owner even when a row is visible', async () => {
    const sb = seed(); sb.tables['personal_agents']![0]!['user_id'] = 'other';
    await expect(call(sb, { agentId: 'agent', tool: 'browser' })).rejects.toThrow('not available');
  });
  it('does not insert after a permission lookup failure', async () => {
    const sb = seed(); const from = sb.from; const insert = vi.fn();
    sb.from = ((name: string) => name === 'tool_permissions' ? (() => { const q: any = { select: () => q, eq: () => q, is: () => q, maybeSingle: async () => ({ error: { code: '42501' }, data: null }), insert }; return q; })() : from(name)) as typeof sb.from;
    await expect(call(sb, { agentId: 'agent', tool: 'browser' })).rejects.toThrow('existing tool permission'); expect(insert).not.toHaveBeenCalled();
  });
  it('reports failed permission reads instead of returning empty policy defaults', async () => {
    const sb = seed(); const from = sb.from;
    sb.from = ((name: string) => name === 'tool_permissions' ? { select: () => ({ eq: async () => ({ error: { code: '42501' }, data: null }) }) } : from(name)) as typeof sb.from;
    await expect(load({ context: { supabase: sb, userId: 'owner' } })).rejects.toThrow('configuration and permissions');
  });
});
