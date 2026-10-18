import { describe, it, expect, vi } from 'vitest';
import { createFakeSupabase } from '../runtime/__tests__/fake-supabase';
vi.mock('@tanstack/react-start', () => ({ createServerFn: () => { const q = { middleware: () => q, inputValidator: () => q, handler: (fn: unknown) => fn }; return q; } }));
vi.mock('@/integrations/supabase/auth-middleware', () => ({ requireSupabaseAuth: {} }));
vi.mock('@/lib/runtime/tools.server', () => ({ TOOL_MANIFEST: [], executeTool: vi.fn(), resolveGrantedTools: vi.fn() }));
vi.mock('@/lib/mission/browser-agent', () => ({ browserProviderStatus: vi.fn() }));
vi.mock('@/lib/platform/audit.server', () => ({ writeAudit: vi.fn() }));
vi.mock('@/lib/platform/entitlements.server', () => ({ getEntitlements: vi.fn().mockResolvedValue({ planCode: 'builder' }) }));
import { saveToolPermission, getToolFramework } from './tools.functions';
const save = saveToolPermission as unknown as (args: any) => Promise<any>;
const load = getToolFramework as unknown as (args: any) => Promise<any>;
const seed = () => createFakeSupabase({ tools: [{ slug: 'browser', is_active: true }], personal_agents: [{ id: 'agent', user_id: 'owner' }], tool_permissions: [
  { id: 'other', user_id: 'other', agent_id: 'agent', tool: 'browser', enabled: false },
  { id: 'own', user_id: 'owner', agent_id: 'agent', tool: 'browser', enabled: true, allowed_domains: ['old.example'] },
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
    sb.from = ((name: string) => name === 'tool_permissions' ? { select: async () => ({ error: { code: '42501' }, data: null }) } : from(name)) as typeof sb.from;
    await expect(load({ context: { supabase: sb, userId: 'owner' } })).rejects.toThrow('configuration and permissions');
  });
});
