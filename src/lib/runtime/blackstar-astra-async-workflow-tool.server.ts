import type { ToolDef } from './model-gateway.server'
import type { ToolContext } from './tools.server'
import { queueWorkflowRun } from './workflow-queue.server'

const MAX_OBJECTIVE_CHARS = 12_000

export const BLACKSTAR_ASTRA_ASYNC_WORKFLOW_TOOL_DEF: ToolDef = {
  name: 'astra_async_workflow',
  description:
    'Queue an existing active Blackstar workflow as durable background work. The workflow must already belong to the authenticated operator; its existing step policy, approvals, entitlements, agent scope and worker recovery remain authoritative.',
  parameters: {
    type: 'object',
    properties: {
      workflow_id: {
        type: 'string',
        description: 'Opaque id of an existing active workflow owned by the authenticated operator.',
      },
      objective: {
        type: 'string',
        description: 'Bounded objective for the durable workflow run.',
      },
    },
    required: ['workflow_id', 'objective'],
  },
}

function text(value: unknown, max: number) {
  return (typeof value === 'string' ? value.trim() : '').slice(0, max)
}

/**
 * Hands long-running work to Blackstar's existing durable workflow queue.
 * This helper creates no workflow, grants no tools and bypasses no approvals.
 */
export async function runBlackstarAstraAsyncWorkflowTool(
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<unknown> {
  const workflowId = text(input['workflow_id'], 160)
  const objective = text(input['objective'], MAX_OBJECTIVE_CHARS)
  if (!workflowId) return { error: 'workflow_id is required.' }
  if (!objective) return { error: 'objective is required.' }

  const queued = await queueWorkflowRun({
    sb: ctx.sb,
    userId: ctx.userId,
    workflowId,
    input: objective,
    trigger: 'blackstar_astra_async_tool',
  })

  return {
    queued: true,
    workflow_run_id: queued.run.id,
    status: queued.run.status,
    queued_at: queued.run.queued_at,
    durable: true,
    execution_authority: 'existing_workflow_policy',
    note: 'The background workflow will continue through Blackstar worker/checkpoint infrastructure. Existing workflow approvals and agent/tool boundaries still apply.',
  }
}
