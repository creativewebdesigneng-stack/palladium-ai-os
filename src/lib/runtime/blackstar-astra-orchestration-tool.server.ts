import type { ToolDef } from './model-gateway.server'
import type { ToolContext } from './tools.server'

const MAX_OBJECTIVE_CHARS = 12_000
const MAX_ASSIGNMENTS = 4
export const BLACKSTAR_ASTRA_DELEGATION_MARKER = '[BLACKSTAR_INTERNAL_ASTRA_ORCHESTRATION_DEPTH:1]'

export const BLACKSTAR_ASTRA_ORCHESTRATION_TOOL_DEF: ToolDef = {
  name: 'astra_orchestrate',
  description:
    'Delegate a bounded objective to Blackstar’s existing Orchestrator and Workforce engine. Blackstar selects only authorised active specialists and each delegated agent keeps its own tools, approvals, entitlements, memory scope and verification boundaries. Nested Astra orchestration is blocked.',
  parameters: {
    type: 'object',
    properties: {
      objective: {
        type: 'string',
        description: 'The bounded objective that benefits from multiple Blackstar specialists.',
      },
      workforce_id: {
        type: 'string',
        description: 'Optional opaque id of an existing active workforce accessible to the authenticated operator.',
      },
    },
    required: ['objective'],
  },
}

function text(value: unknown, max: number) {
  return (typeof value === 'string' ? value.trim() : '').slice(0, max)
}

async function nestedDelegation(ctx: ToolContext): Promise<boolean> {
  if (!ctx.taskId) return false
  const { data, error } = await ctx.sb
    .from('agent_tasks')
    .select('input')
    .eq('id', ctx.taskId)
    .eq('user_id', ctx.userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return typeof data?.input === 'string' && data.input.includes(BLACKSTAR_ASTRA_DELEGATION_MARKER)
}

function delegatedGoal(objective: string): string {
  return [
    objective,
    '',
    BLACKSTAR_ASTRA_DELEGATION_MARKER,
    'Internal Blackstar control metadata: this is already a delegated multi-agent run. Delegated child agents must not create another Astra orchestration tree. This control grants no tools, approvals, identity or execution authority.',
  ].join('\n')
}

/**
 * Bridges a granted Astra run into Blackstar's existing Orchestrator/Workforce
 * stack. The imports stay dynamic so the tool registry does not create a module
 * cycle with the agent runtime that workforce steps already reuse.
 */
export async function runBlackstarAstraOrchestrationTool(
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<unknown> {
  const objective = text(input['objective'], MAX_OBJECTIVE_CHARS)
  const workforceId = text(input['workforce_id'], 160) || null
  if (!objective) return { error: 'objective is required.' }
  if (await nestedDelegation(ctx)) {
    return {
      error: 'Nested Astra orchestration is not allowed. Complete this delegated assignment within the current agent boundary.',
      policy_code: 'ASTRA_ORCHESTRATION_DEPTH_LIMIT',
    }
  }

  const [{ planOrchestratedGoal }, { executeWorkflow }] = await Promise.all([
    import('./orchestrator.server'),
    import('./workforce.server'),
  ])

  const goal = delegatedGoal(objective)
  const prepared = await planOrchestratedGoal({
    sb: ctx.sb,
    userId: ctx.userId,
    goal,
    orgId: ctx.orgId,
    ...(workforceId ? { workforceId } : {}),
    maxAssignments: MAX_ASSIGNMENTS,
  })
  const execution = await executeWorkflow({
    sb: ctx.sb,
    userId: ctx.userId,
    workflowId: prepared.workflow.id,
    input: prepared.goal,
    trigger: 'blackstar_astra_orchestrator_tool',
  })

  const steps = (execution.steps ?? []).slice(0, MAX_ASSIGNMENTS).map((step: any) => ({
    step_id: String(step.step_id ?? '').slice(0, 160),
    name: String(step.name ?? '').slice(0, 180),
    agent_id: typeof step.agent_id === 'string' ? step.agent_id : null,
    status: String(step.status ?? '').slice(0, 80),
    output: typeof step.output === 'string' ? step.output.slice(0, 3_000) : '',
  }))
  const participatingAgentIds = [...new Set(
    steps.map((step) => step.agent_id).filter((id): id is string => Boolean(id)),
  )]

  return {
    orchestrated: true,
    workflow_id: prepared.workflow.id,
    workflow_name: prepared.workflow.name,
    status: String(execution.run?.status ?? 'unknown'),
    multi_agent: participatingAgentIds.length >= 2,
    participating_agent_ids: participatingAgentIds,
    output: typeof execution.output === 'string' ? execution.output.slice(0, 12_000) : '',
    steps,
    paused_for_approval: execution.paused === true,
    execution_authority: 'existing_blackstar_workforce_policy',
    note: 'The Orchestrator selected specialists and the existing Workforce engine executed them. Each child agent retained its own tools, approvals, entitlements, memory and verification scope; no authority was inherited from the calling Astra run.',
  }
}
