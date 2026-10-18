import { TOOL_MANIFEST } from '@/lib/runtime/tools.server';
import { writeAudit, writeAuditRequired } from '@/lib/platform/audit.server';
type Sb = { from: (table: string) => any };
export async function changeOwnedAgentTools(args: { sb: Sb; userId: string; id: string; tools: string[]; expectedUpdatedAt: string }) {
  const { data: current, error: readError } = await args.sb.from('personal_agents').select('*')
    .eq('id', args.id).eq('user_id', args.userId).maybeSingle();
  if (readError) throw new Error('Could not load agent configuration.');
  if (!current) throw new Error('Agent not found.');
  if (current.updated_at !== args.expectedUpdatedAt) throw new Error('Agent configuration changed. Refresh before saving tools.');
  const tools = [...new Set(args.tools)];
  const { data: catalogue, error } = await args.sb.from('tools').select('slug,is_active').eq('is_active', true);
  if (error) throw new Error('Could not load the executable tool catalogue.');
  const executable = new Set(TOOL_MANIFEST.map(row => row.slug));
  // Retain retired assignments, but never newly assign inactive or unknown tools.
  if (tools.some(tool => !(current.allowed_tools ?? []).includes(tool) &&
      (!executable.has(tool) || !catalogue?.some((row: any) => row.slug === tool)))) {
    throw new Error('Select an active executable tool.');
  }
  const requestAuditId = await writeAuditRequired({ userId: args.userId, agentId: args.id,
    targetType: 'personal_agent', targetId: args.id, action: 'agent.tools_change_requested', status: 'success',
    metadata: { previousTools: current.allowed_tools ?? [], tools, expectedUpdatedAt: args.expectedUpdatedAt } });
  const { data: updated, error: saveError } = await args.sb.from('personal_agents')
    .update({ allowed_tools: tools, updated_at: new Date().toISOString() })
    .eq('id', args.id).eq('user_id', args.userId).eq('updated_at', args.expectedUpdatedAt).select('*').maybeSingle();
  if (saveError) throw new Error('Could not save tools. Refresh to check current configuration.');
  if (!updated) throw new Error('Agent configuration changed. Refresh before saving tools.');
  await writeAudit({ userId: args.userId, agentId: args.id, targetType: 'personal_agent', targetId: args.id,
    action: 'agent.tools_changed', status: 'success', metadata: { requestAuditId, tools } });
  return updated;
}
