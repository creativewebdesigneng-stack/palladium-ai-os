import { describe, expect, it, vi } from 'vitest';
import { createFakeSupabase } from '@/lib/runtime/__tests__/fake-supabase';

vi.mock('@/lib/runtime/tools.server', () => ({
  TOOL_MANIFEST: [{ slug: 'browser' }, { slug: 'connected_service' }],
}));
vi.mock('@/lib/platform/audit.server', () => ({
  writeAudit: vi.fn(), writeAuditRequired: vi.fn().mockResolvedValue('connector-intent'),
}));
import { writeAuditRequired } from '@/lib/platform/audit.server';
import { changeOwnedAgentConnectors, listOwnedAgentConnectorChoices } from './agent-connectors.server';

const seed = () => createFakeSupabase({
  personal_agents: [{
    id: 'agent', user_id: 'owner', updated_at: 'before',
    allowed_tools: ['browser'], allowed_providers: [],
    requires_approval: true, model_provider: 'groq',
  }],
  tools: [{ slug: 'connected_service', is_active: true }],
  integrations: [
    { id: 'native', user_id: 'owner', provider: 'google', status: 'connected', account_label: 'Google Account' },
    { id: 'nango', user_id: 'owner', provider: 'nango_github', status: 'connected', config: { connection_id: 'active' } },
    { id: 'missing', user_id: 'owner', provider: 'nango_slack', status: 'connected', config: {} },
    { id: 'other', user_id: 'other', provider: 'hubspot', status: 'connected' },
    { id: 'disconnected', user_id: 'owner', provider: 'notion', status: 'disconnected' },
  ],
});
const args = (sb: any) => ({
  sb, userId: 'owner', id: 'agent', providers: ['google', 'github'], expectedUpdatedAt: 'before',
});

describe('existing-agent connection assignment', () => {
  it('lists only real native and Nango connections belonging to this user', async () => {
    const choices = await listOwnedAgentConnectorChoices({ sb: seed(), userId: 'owner' });
    expect(choices.find(row => row.id === 'google')).toMatchObject({ connected: true, transport: 'native' });
    expect(choices.find(row => row.id === 'github')).toMatchObject({ connected: true, transport: 'nango' });
    expect(choices.find(row => row.id === 'slack')?.connected).toBe(false);
    expect(choices.find(row => row.id === 'hubspot')?.connected).toBe(false);
    expect(choices.find(row => row.id === 'notion')?.connected).toBe(false);
    expect(choices.some(row => row.id === 'other')).toBe(false);
  });

  it('saves only connected providers and retains existing browser approval policy', async () => {
    const sb = seed();
    const row = await changeOwnedAgentConnectors(args(sb));
    expect(row.allowed_providers).toEqual(['google', 'github']);
    expect(row.allowed_tools).toEqual(['browser', 'connected_service']);
    expect(row.requires_approval).toBe(true);
    expect(row.model_provider).toBe('groq');
    expect(sb.tables['integrations']).toHaveLength(5);
  });

  it('allows a connected GitHub App installation without a Nango connection', async () => {
    const sb = seed();
    sb.tables['integrations'] = [];
    const result = await changeOwnedAgentConnectors({
      ...args(sb), providers: ['github'], githubInstallation: true,
    });
    expect(result.allowed_providers).toEqual(['github']);
  });

  it('rejects disconnected, bogus, and missing Nango tokens', async () => {
    const sb = seed();
    for (const providers of [['slack'], ['notion'], ['arbitrary-provider']]) {
      await expect(changeOwnedAgentConnectors({ ...args(sb), providers })).rejects.toThrow('Connect or reconnect');
    }
    expect(sb.tables['personal_agents']?.[0]?.['allowed_providers']).toEqual([]);
  });

  it('rejects stale updates and another user', async () => {
    const sb = seed();
    await expect(changeOwnedAgentConnectors({ ...args(sb), userId: 'other' })).rejects.toThrow('not found');
    await expect(changeOwnedAgentConnectors({ ...args(sb), expectedUpdatedAt: 'stale' })).rejects.toThrow('changed');
  });

  it('refuses to enable a connector when connected_service tool is unavailable', async () => {
    const sb = seed();
    sb.tables['tools'] = [];
    await expect(changeOwnedAgentConnectors(args(sb))).rejects.toThrow('disabled');
  });

  it('does not save tools or providers if the required audit cannot be recorded', async () => {
    const sb = seed();
    vi.mocked(writeAuditRequired).mockRejectedValueOnce(new Error('audit unavailable'));
    await expect(changeOwnedAgentConnectors(args(sb))).rejects.toThrow('audit unavailable');
    expect(sb.tables['personal_agents']?.[0]?.['allowed_providers']).toEqual([]);
    expect(sb.tables['personal_agents']?.[0]?.['allowed_tools']).toEqual(['browser']);
  });
});
