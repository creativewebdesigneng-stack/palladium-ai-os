import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { executeWorkflow } from '@/lib/runtime/workforce.server'
import { executeAgentTask } from '@/lib/runtime/agent-task-execution.server'
import { callExternalMcpTool, listExternalMcpTools } from '@/lib/mcp/external-mcp.server'
import { createAiHubApprovalGate } from './approval.server'
import { AiHubExecutionGateway } from './execution'
import type { AiHubOrchestrationPlan } from './orchestrator'
import type { AiHubDeploymentTarget } from './contracts'
import { createPalladiumAiHubRegistry } from './registry'

type Sb = { from: (table: string) => any }
type Input = { resourceId: string; goal: string; approvalRequestId?: string }

function selectedPlacement(workloadId: string, capabilityId: string, deploymentTarget: AiHubDeploymentTarget) {
  return {
    workloadId,
    capabilityId,
    deploymentTarget,
    privateExecution: deploymentTarget === 'customer-cloud' || deploymentTarget === 'on-prem' || deploymentTarget === 'edge' || deploymentTarget === 'device',
    reason: `Operator-selected AI Hub resource is placed on ${deploymentTarget} through the Blackstar Agent Cloud boundary.`,
    policyChecks: ['tenant-isolation', 'capability-placement', 'deployment-target'],
  }
}

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

    const workloadId = `workflow:${workflow.id}`
    const plan: AiHubOrchestrationPlan = {
      workloadId,
      discovery: [],
      requiresApproval: true,
      executionBoundary: 'palladium-policy-gateway',
      placement: selectedPlacement(workloadId, workflow.id, 'palladium-cloud'),
      route: {
        workloadId,
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

    const workloadId = `agent:${agent.id}`
    const plan: AiHubOrchestrationPlan = {
      workloadId,
      discovery: [], requiresApproval: true, executionBoundary: 'palladium-policy-gateway',
      placement: selectedPlacement(workloadId, agent.id, 'palladium-cloud'),
      route: {
        workloadId,
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

type McpInput = { resourceId: string; inputJson: string; approvalRequestId?: string }

function validateMcp(input: unknown): McpInput {
  const row = input && typeof input === 'object' ? input as Record<string, unknown> : {}
  const resourceId = String(row['resourceId'] ?? '').trim()
  const inputJson = String(row['inputJson'] ?? '{}').trim()
  const approvalRequestId = String(row['approvalRequestId'] ?? '').trim()
  if (!resourceId.includes(':')) throw new Error('Choose an external MCP tool.')
  if (inputJson.length > 20_000) throw new Error('MCP tool input is too large.')
  return { resourceId, inputJson, ...(approvalRequestId ? { approvalRequestId } : {}) }
}

export const executeAiHubExternalMcp = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateMcp)
  .handler(async ({ data, context }) => {
    const separator = data.resourceId.indexOf(':')
    const serverId = data.resourceId.slice(0, separator)
    const toolName = data.resourceId.slice(separator + 1)
    let toolInput: Record<string, unknown>
    try {
      const parsed = JSON.parse(data.inputJson)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error()
      toolInput = parsed as Record<string, unknown>
    } catch {
      throw new Error('MCP tool input must be a JSON object.')
    }

    const sb = context.supabase as unknown as Sb
    const { data: server, error } = await sb
      .from('external_mcp_servers')
      .select('id,name,org_id,enabled,requires_approval')
      .eq('id', serverId)
      .eq('user_id', context.userId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!server || !server.enabled) throw new Error('External MCP server is not available.')
    const discovered = await listExternalMcpTools({ sb, userId: context.userId, serverId })
    if (!discovered.tools.some((tool) => tool.name === toolName)) throw new Error('That MCP tool is not available.')

    const providerId = `external-mcp:${server.id}`
    const workloadId = `external-mcp:${server.id}:${toolName}`
    const capabilityId = `${server.id}:${toolName}`
    const plan: AiHubOrchestrationPlan = {
      workloadId,
      discovery: [], requiresApproval: true, executionBoundary: 'palladium-policy-gateway',
      placement: selectedPlacement(workloadId, capabilityId, 'provider-cloud'),
      route: {
        workloadId,
        capability: { id: capabilityId, kind: 'tool', providerId, name: `${server.name}: ${toolName}`, capabilities: [toolName], deploymentTargets: ['provider-cloud'] },
        reason: 'The operator selected this configured external MCP tool from the authenticated AI Hub inventory.',
        policyChecks: ['tenant-isolation', 'external-mcp-allowlist', 'approval-required'],
      },
    }
    const registry = createPalladiumAiHubRegistry()
    registry.registerProvider({ id: providerId, name: server.name, capabilityKinds: ['tool'], deploymentTargets: ['provider-cloud'], adapter: 'mcp', enabled: true })
    const gateway = new AiHubExecutionGateway(registry, createAiHubApprovalGate(sb))
    gateway.registerAdapter('mcp', async () => {
      await callExternalMcpTool({ sb, userId: context.userId, serverId, toolName, input: toolInput, approved: true })
      return { status: 'completed', adapter: 'mcp' }
    })
    const result = await gateway.execute(plan, {
      tenantId: server.org_id ?? context.userId,
      approvalOrgId: server.org_id ?? null,
      actorId: context.userId,
      ...(data.approvalRequestId ? { approvalRequestId: data.approvalRequestId } : {}),
    })
    if (result.status === 'waiting_for_approval') return { status: result.status, adapter: result.adapter, approvalRequestId: result.approvalRequestId ?? '' }
    if (result.status === 'failed') return { status: result.status, adapter: result.adapter, error: result.error ?? 'MCP tool execution failed' }
    return { status: result.status, adapter: result.adapter }
  })
