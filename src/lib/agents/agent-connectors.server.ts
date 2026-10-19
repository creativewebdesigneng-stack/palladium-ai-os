import { writeAudit, writeAuditRequired } from '@/lib/platform/audit.server';
import { INTEGRATION_PROVIDERS } from '@/lib/integrations/providers';
import { NANGO_PROVIDERS } from '@/lib/integrations/nango-providers';
import { TOOL_MANIFEST } from '@/lib/runtime/tools.server';

type Sb = { from: (table: string) => any };
type Connection = { provider?: string; name?: string; status?: string; account_label?: string | null; config?: Record<string, unknown> | null };
export type AgentConnectorChoice = { id: string; name: string; connected: boolean; transport: string | null; accountLabel: string | null };

const providerId = (value: unknown) =>
  typeof value === 'string' ? value.trim().toLowerCase().replace(/^nango_/, '') : '';
const validId = (id: string) => /^[a-z0-9][a-z0-9._-]{0,79}$/.test(id);

/** Reuses the native OAuth and existing Nango registries; never returns tokens. */
export async function listOwnedAgentConnectorChoices(args: { sb: Sb; userId: string; githubInstallation?: boolean }) {
  const { data, error } = await args.sb.from('integrations')
    .select('provider,name,status,account_label,config')
    .eq('user_id', args.userId);
  if (error) throw new Error('Could not read your connected apps.');
  const choices = new Map<string, AgentConnectorChoice>();
  for (const provider of [...INTEGRATION_PROVIDERS, ...NANGO_PROVIDERS]) {
    const id = providerId(provider.id);
    if (validId(id) && !choices.has(id))
      choices.set(id, { id, name: provider.name, connected: false, transport: null, accountLabel: null });
  }

  for (const row of (data ?? []) as Connection[]) {
    const raw = String(row.provider ?? '');
    const id = providerId(raw);
    if (!validId(id)) continue;
    const nango = raw.startsWith('nango_');
    const connected = row.status === 'connected' && (!nango || Boolean(row.config?.['connection_id']));
    const old = choices.get(id);
    if (!old && !connected) continue;
    if (connected) {
      choices.set(id, {
        id, name: old?.name ?? (row.name || id),
        connected: true, transport: nango ? 'nango' : 'native',
        accountLabel: typeof row.account_label === 'string' ? row.account_label.slice(0, 160) : null,
      });
    }
  }
  if (args.githubInstallation) {
    choices.set('github', {
      id: 'github', name: 'GitHub', connected: true, transport: 'github_app',
      accountLabel: choices.get('github')?.accountLabel ?? null,
    });
  }
  return [...choices.values()].sort((a, b) => Number(b.connected) - Number(a.connected) || a.name.localeCompare(b.name));
}

export async function changeOwnedAgentConnectors(args: {
  sb: Sb; userId: string; id: string; providers: string[]; expectedUpdatedAt: string;
  githubInstallation?: boolean;
}) {
  const { data: agent, error: agentError } = await args.sb.from('personal_agents').select('*')
    .eq('id', args.id).eq('user_id', args.userId).maybeSingle();
  if (agentError || !agent) throw new Error('Agent not found or unavailable.');
  if (agent.updated_at !== args.expectedUpdatedAt)
    throw new Error('Agent was changed elsewhere. Refresh before saving connectors.');

  const providers = [...new Set(args.providers.map(providerId))];
  if (providers.some(id => !validId(id))) throw new Error('Invalid connector provider.');
  const choices = await listOwnedAgentConnectorChoices(args);
  const connected = new Set(choices.filter(c => c.connected).map(c => c.id));
  if (providers.some(id => !connected.has(id)))
    throw new Error('Connect or reconnect the selected app in Integrations before assigning it to an agent.');

  const previousTools = (agent.allowed_tools ?? []) as string[];
  const tools = providers.length && !previousTools.includes('connected_service')
    ? [...previousTools, 'connected_service'] : previousTools;
  if (tools.length > 30) throw new Error('Agent tool limit reached. Remove an unused tool before enabling connector access.');
  if (providers.length && !TOOL_MANIFEST.some(tool => tool.slug === 'connected_service'))
    throw new Error('Connected-service runtime is not installed.');
  if (providers.length) {
    const { data: catalogue, error } = await args.sb.from('tools').select('slug,is_active')
      .eq('slug', 'connected_service').maybeSingle();
    if (error || !catalogue?.is_active)
      throw new Error('Connected-service tool is disabled. Ask a workspace administrator to enable it.');
  }
  const requested = await writeAuditRequired({
    userId: args.userId, agentId: args.id, targetType: 'personal_agent', targetId: args.id,
    action: 'agent.connectors_change_requested', status: 'success',
    metadata: { previousProviders: agent.allowed_providers ?? [], providers },
  });
  const { data: updated, error: saveError } = await args.sb.from('personal_agents')
    .update({ allowed_providers: providers, allowed_tools: tools, updated_at: new Date().toISOString() })
    .eq('id', args.id).eq('user_id', args.userId)
    .eq('updated_at', args.expectedUpdatedAt).select('*').maybeSingle();
  if (saveError || !updated) throw new Error('Could not save agent connectors. Refresh and retry.');
  await writeAudit({
    userId: args.userId, agentId: args.id, targetType: 'personal_agent', targetId: args.id,
    action: 'agent.connectors_changed', status: 'success',
    metadata: { requestAuditId: requested, providers },
  });
  return updated;
}
