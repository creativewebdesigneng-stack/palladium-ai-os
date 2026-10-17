import { AGENT_MODEL_CHOICES } from './agent-model-selection';
import { isModelProviderConfigured } from '@/lib/runtime/model-providers.server';
import { listUserModelProviderCredentials } from '@/lib/runtime/model-provider-credentials.server';
import { writeAudit, writeAuditRequired } from '@/lib/platform/audit.server';

type Sb = { from: (table: string) => any };

/** A narrow owner-scoped update: never re-save tools or authority from a stale UI. */
export async function changeOwnedAgentModel(args: {
  sb: Sb; userId: string; id: string; choice: string; expectedUpdatedAt: string;
}) {
  const selected = Object.hasOwn(AGENT_MODEL_CHOICES, args.choice) ? AGENT_MODEL_CHOICES[args.choice] : undefined;
  if (!selected || args.choice === 'llama') throw new Error('Select a supported model choice.');
  const { data: current, error: readError } = await args.sb.from('personal_agents')
    .select('id,model_provider,model,updated_at').eq('id', args.id).eq('user_id', args.userId).maybeSingle();
  if (readError) throw new Error('Could not load agent configuration.');
  if (!current) throw new Error('Agent not found.');
  if (current.updated_at !== args.expectedUpdatedAt) throw new Error('Agent configuration changed. Refresh before changing its model.');

  const configured = isModelProviderConfigured(selected.provider);
  const personal = configured ? [] : await listUserModelProviderCredentials(args.userId);
  if (!configured && !personal.some(row => row.enabled && row.provider === selected.provider)) {
    throw new Error('That model provider is not connected. Review Runtime Models first.');
  }
  // This receipt records an intent, not a completed change, including if CAS fails.
  const requestAuditId = await writeAuditRequired({
    userId: args.userId, agentId: args.id, targetType: 'personal_agent', targetId: args.id,
    action: 'agent.model_change_requested', status: 'success',
    metadata: { previousProvider: current.model_provider, previousModel: current.model,
      provider: selected.provider, model: selected.model, expectedUpdatedAt: args.expectedUpdatedAt },
  });
  const { data: updated, error } = await args.sb.from('personal_agents')
    .update({ model_provider: selected.provider, model: selected.model, updated_at: new Date().toISOString() })
    .eq('id', args.id).eq('user_id', args.userId).eq('updated_at', args.expectedUpdatedAt)
    .select('*').maybeSingle();
  if (error) throw new Error('Could not save the agent model. Refresh to check its current configuration.');
  if (!updated) throw new Error('Agent configuration changed. Refresh before changing its model.');
  await writeAudit({ userId: args.userId, agentId: args.id, targetType: 'personal_agent', targetId: args.id,
    action: 'agent.model_changed', status: 'success',
    metadata: { requestAuditId, provider: selected.provider, model: selected.model } });
  return updated;
}
