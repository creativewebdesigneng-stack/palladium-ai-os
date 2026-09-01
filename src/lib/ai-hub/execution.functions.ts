import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { executeWorkflow } from '@/lib/runtime/workforce.server'
import { executeAgentTask } from '@/lib/runtime/agent-task-execution.server'
import { createAiHubApprovalGate } from './approval.server'
import { AiHubExecutionGateway } from './execution'
import type { AiHubOrchestrationPlan } from './orchestrator'
import { createPalladiumAiHubRegistry } from './registry'

type Sb = { from: (table: string) => any }
type Input = { resourceId: string; goal: string; approvalRequestId?: string }

function validate(input: unknown): Input {
  const row = input && typeof input === 'object' ? input as Record<string, unknown> : {}
  const resourceId = String(row['resourceId'] ?? '').trim()
  const goal = String(row['goal'] ?? '').trim()
  const approvalRequestId = String(row['approvalRequestId'] ?? '').trim()
  if (!resourceId) throw new Error('Choose a workflow to run.')
  if (!goal) throw new Error('Give the workflow an objective.')
  if (goal.length > 8000) throw new Error('The objective is too long.')
  return { resourceId, goal, ...(approvalRequestId ? { approvalRequestId } : {}) }
}

export const executeAiHubWorkflow = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(validate)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb
    const { data: workflow, error } = await sb
      .from('workflows')
      .select('id,name,org_id,status')
      .eq('id', data.resourceId)
      .eq('user_id', context.userId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!workflow) throw new Error('Workflow not found or you do not have access to it.')
    if (workflow.status !== 'active') throw new Error('Activate this workflow before running it from the Hub.')

    const plan: AiHubOrchestrationPlan = {
      workloadId: `workflow:${workflow.id}`,
      discovery: [],
      requiresApproval: true,
      executionBoundary: 'palladium-policy-gateway',
      route: {
        workloadId: `workflow:${workflow.id}`,
        capability: {
          id: workflow.id,
          kind: 'workflow',
          providerId: 'palladium-workflows',
          name: workflow.name,
          capabilities: ['workflow-execution'],
          deploymentTargets: ['palladium-cloud'],
        },
        reason: 'The operator selected this workflow from the authenticated AI Hub inventory.',
        policyChecks: ['tenant-isolation', 'approval-required'],
      },
    }

    const gateway = new AiHubExecutionGateway(
      createPalladiumAiHubRegistry(),
      createAiHubApprovalGate(sb),
    )
    gateway.registerAdapter('workflows', async () => {
      await executeWorkflow({
        sb,
        userId: context.userId,
        workflowId: workflow.id,
        input: data.goal,
        trigger: 'ai-hub',
      })
      return { status: 'completed', adapter: 'workflows' }
    })

    const result = await gateway.execute(plan, {
      tenantId: workflow.org_id ?? context.userId,
      approvalOrgId: workflow.org_id ?? null,
      actorId: context.userId,
      input: data.goal,
      ...(data.approvalRequestId ? { approvalRequestId: data.approvalRequestId } : {}),
    })
    if (result.status === 'waiting_for_approval') {
      return { status: result.status, adapter: result.adapter, approvalRequestId: result.approvalRequestId ?? '' }
    }
    if (result.status === 'failed') {
      return { status: result.status, adapter: result.adapter, error: result.error ?? 'AI Hub execution failed' }
    }
    return { status: result.status, adapter: result.adapter }
  })

export const executeAiHubAgent = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(validate)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb
    const { data: agent, error } = await sb
      .from('personal_agents')
      .select('id,name,org_id,status')
      .eq('id', data.resourceId)
      .eq('user_id', context.userId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!agent) throw new Error('Agent not found or you do not have access to it.')
    if (agent.status !== 'active') throw new Error('Activate this agent before running it from the Hub.')

    const plan: AiHubOrchestrationPlan = {
      workloadId: `agent:${agent.id}`,
      discovery: [], requiresApproval: true, executionBoundary: 'palladium-policy-gateway',
      route: {
        workloadId: `agent:${agent.id}`,
        capability: { id: agent.id, kind: 'agent', providerId: 'palladium-agent-runtime', name: agent.name, capabilities: ['agent-execution'], deploymentTargets: ['palladium-cloud'] },
        reason: 'The operator selected this agent from the authenticated AI Hub inventory.',
        policyChecks: ['tenant-isolation', 'approval-required'],
      },
    }
    const gateway = new AiHubExecutionGateway(createPalladiumAiHubRegistry(), createAiHubApprovalGate(sb))
    gateway.registerAdapter('agent-runtime', async () => {
      await executeAgentTask({ sb, userId: context.userId, agentId: agent.id, input: data.goal })
      return { status: 'completed', adapter: 'agent-runtime' }
    })
    const result = await gateway.execute(plan, {
      tenantId: agent.org_id ?? context.userId,
      approvalOrgId: agent.org_id ?? null,
      actorId: context.userId,
      input: data.goal,
      ...(data.approvalRequestId ? { approvalRequestId: data.approvalRequestId } : {}),
    })
    if (result.status === 'waiting_for_approval') return { status: result.status, adapter: result.adapter, approvalRequestId: result.approvalRequestId ?? '' }
    if (result.status === 'failed') return { status: result.status, adapter: result.adapter, error: result.error ?? 'AI Hub execution failed' }
    return { status: result.status, adapter: result.adapter }
  })
