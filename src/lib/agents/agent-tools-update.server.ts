import { TOOL_MANIFEST } from '@/lib/runtime/tools.server';
import { writeAudit, writeAuditRequired } from '@/lib/platform/audit.server';

type Sb = { from: (table: string) => any };

export async function changeOwnedAgentTools(args: {
  sb: Sb; userId: string; id: string; tools: string[]; expectedUpdatedAt: string;
}) {
  const { data: agent, error: readError } = await args.sb.from('personal_agents')
    .select('id,allowed_tools,updated_at').eq('id', args.id).eq('user_id', args.userId).maybeSingle();
  if (readError || !agent) throw new Error('Could not load your agent.');
  if (agent.updated_at !== args.expectedUpdatedAt) throw new Error('Agent changed. Refresh before saving tools.');
  const tools = [...new Set(args.tools)];
  const added = tools.filter(tool => !(agent.allowed_tools ?? []).includes(tool));
  if (added.length) {
    const { data: rows, error } = await args.sb.from('tools').select('slug,is_active').in('slug', added);
    const executable = new Set(TOOL_MANIFEST.map(tool => tool.slug));
    if (error || added.some(tool => !executable.has(tool) || !rows?.some((row: any) => row.slug === tool && row.is_active === true))) {
      throw new Error('Select active executable tools from the catalogue.');
    }
  }
  // A new browser assignment requires an explicit bounded policy, saved through
  // the existing permission service. The runtime still enforces plan/approval.
  for (const tool of added.filter(tool => tool === 'browser' || tool === 'browser_task')) {
    const { data: policy, error } = await args.sb.from('tool_permissions')
      .select('enabled,allowed_domains').eq('user_id', args.userId).eq('agent_id', args.id).eq('tool', tool).maybeSingle();
    if (error || !policy?.enabled || !policy.allowed_domains?.length) throw new Error('Save a browser domain restriction before enabling this tool.');
  }
  const requestAuditId = await writeAuditRequired({ userId: args.userId, agentId: args.id,
    targetType: 'personal_agent', targetId: args.id, action: 'agent.tools_change_requested', status: 'success',
    metadata: { previousTools: agent.allowed_tools ?? [], tools, expectedUpdatedAt: args.expectedUpdatedAt } });
  const { data: updated, error } = await args.sb.from('personal_agents')
    .update({ allowed_tools: tools, updated_at: new Date().toISOString() })
    .eq('id', args.id).eq('user_id', args.userId).eq('updated_at', args.expectedUpdatedAt).select('*').maybeSingle();
  if (error || !updated) throw new Error('Could not save tools. Refresh to check the current agent configuration.');
  await writeAudit({ userId: args.userId, agentId: args.id, targetType: 'personal_agent', targetId: args.id,
    action: 'agent.tools_changed', status: 'success', metadata: { requestAuditId, tools } });
  return updated;
}
