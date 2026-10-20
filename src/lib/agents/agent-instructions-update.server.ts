import { writeAudit, writeAuditRequired } from '@/lib/platform/audit.server';
type Sb = { from: (table: string) => any };

/** Patch only the standing instructions; retain grants, model and memory policy. */
export async function changeOwnedAgentInstructions(args: {
  sb: Sb; userId: string; id: string; instructions: string; expectedUpdatedAt: string;
}) {
  const { data: current, error } = await args.sb.from('personal_agents').select('id,updated_at')
    .eq('id', args.id).eq('user_id', args.userId).maybeSingle();
  if (error) throw new Error('Could not load agent configuration.');
  if (!current) throw new Error('Agent not found.');
  if (current.updated_at !== args.expectedUpdatedAt) throw new Error('Agent configuration changed. Refresh before saving instructions.');
  const requestAuditId = await writeAuditRequired({
    userId: args.userId, agentId: args.id, targetType: 'personal_agent', targetId: args.id,
    action: 'agent.instructions_change_requested', status: 'success',
    metadata: { expectedUpdatedAt: args.expectedUpdatedAt },
  });
  const { data: updated, error: saveError } = await args.sb.from('personal_agents')
    .update({ instructions: args.instructions || null, updated_at: new Date().toISOString() })
    .eq('id', args.id).eq('user_id', args.userId).eq('updated_at', args.expectedUpdatedAt)
    .select('*').maybeSingle();
  if (saveError) throw new Error('Could not save instructions. Refresh to check current configuration.');
  if (!updated) throw new Error('Agent configuration changed. Refresh before saving instructions.');
  await writeAudit({
    userId: args.userId, agentId: args.id, targetType: 'personal_agent', targetId: args.id,
    action: 'agent.instructions_changed', status: 'success', metadata: { requestAuditId },
  });
  return updated;
}
