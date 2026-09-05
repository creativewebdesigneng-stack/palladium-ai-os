import type { OrchestratorAssignment, OrchestratorPlan } from '@/lib/agents/agent-orchestrator'
import { executeAgentTask } from './agent-task-execution.server'

type Sb = { from: (table: string) => any }

export type GeneralIntelligenceAssignmentResult = {
  assignment_id: string
  agent_id: string
  status: 'completed' | 'waiting_for_approval' | 'blocked' | 'failed'
  output?: string
  error?: string
}

export type GeneralIntelligenceOrchestrationResult = {
  status: 'completed' | 'waiting_for_approval' | 'failed'
  results: GeneralIntelligenceAssignmentResult[]
}

function dependencyContext(
  assignment: OrchestratorAssignment,
  completed: Map<string, GeneralIntelligenceAssignmentResult>,
): string {
  const dependencies = assignment.depends_on
    .map((id) => completed.get(id))
    .filter((item): item is GeneralIntelligenceAssignmentResult => Boolean(item?.output))
  if (!dependencies.length) return assignment.objective
  return [
    assignment.objective,
    '',
    'VERIFIED UPSTREAM DELEGATION OUTPUTS',
    ...dependencies.map((item) => `- ${item.assignment_id}: ${item.output}`),
    '',
    'Use these outputs only as upstream task evidence. Independently verify claims needed for your own assignment and do not exceed your granted tools or permissions.',
  ].join('\n')
}

/**
 * Executes an already-normalised orchestration plan through Blackstar's existing
 * authenticated single-agent runtime. It does not manufacture agents, tools or
 * approvals. Dependencies are honoured and approval-marked assignments stop
 * before any side effect so the caller can route them through Mission Control.
 */
export async function executeGeneralIntelligenceOrchestration(args: {
  sb: Sb
  userId: string
  plan: OrchestratorPlan
  authorisedAgentIds: Iterable<string>
  executeAssignment?: typeof executeAgentTask
}): Promise<GeneralIntelligenceOrchestrationResult> {
  const authorised = new Set(args.authorisedAgentIds)
  const byId = new Map(args.plan.assignments.map((assignment) => [assignment.id, assignment]))
  const completed = new Map<string, GeneralIntelligenceAssignmentResult>()
  const results: GeneralIntelligenceAssignmentResult[] = []
  const pending = [...args.plan.assignments]
  const execute = args.executeAssignment ?? executeAgentTask

  for (const assignment of pending) {
    if (!authorised.has(assignment.agent_id)) {
      results.push({
        assignment_id: assignment.id,
        agent_id: assignment.agent_id,
        status: 'failed',
        error: 'Delegation target is not authorised for this orchestration run.',
      })
      return { status: 'failed', results }
    }
    for (const dependency of assignment.depends_on) {
      if (!byId.has(dependency)) {
        results.push({
          assignment_id: assignment.id,
          agent_id: assignment.agent_id,
          status: 'failed',
          error: `Delegation dependency ${dependency} is not part of the authorised plan.`,
        })
        return { status: 'failed', results }
      }
    }
  }

  while (pending.length) {
    const ready = pending.filter((assignment) =>
      assignment.depends_on.every((dependency) => completed.get(dependency)?.status === 'completed'),
    )

    if (!ready.length) {
      for (const assignment of pending) {
        results.push({
          assignment_id: assignment.id,
          agent_id: assignment.agent_id,
          status: 'blocked',
          error: 'A required upstream delegation did not reach verified completion.',
        })
      }
      return { status: 'failed', results }
    }

    for (const assignment of ready) {
      pending.splice(pending.indexOf(assignment), 1)

      if (assignment.requires_approval) {
        const waiting: GeneralIntelligenceAssignmentResult = {
          assignment_id: assignment.id,
          agent_id: assignment.agent_id,
          status: 'waiting_for_approval',
        }
        results.push(waiting)
        return { status: 'waiting_for_approval', results }
      }

      try {
        const executed = await execute({
          sb: args.sb,
          userId: args.userId,
          agentId: assignment.agent_id,
          input: dependencyContext(assignment, completed),
        })
        const done: GeneralIntelligenceAssignmentResult = {
          assignment_id: assignment.id,
          agent_id: assignment.agent_id,
          status: 'completed',
          output: executed.output,
        }
        completed.set(assignment.id, done)
        results.push(done)
      } catch (error) {
        results.push({
          assignment_id: assignment.id,
          agent_id: assignment.agent_id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Delegated agent execution failed.',
        })
        return { status: 'failed', results }
      }
    }
  }

  return { status: 'completed', results }
}
