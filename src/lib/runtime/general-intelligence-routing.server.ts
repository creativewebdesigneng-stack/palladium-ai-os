import type { GeneralIntelligenceAssessment } from '@/lib/agents/general-intelligence-kernel'
import type { OrchestratorPlan } from '@/lib/agents/agent-orchestrator'
import { executeAgentTask } from './agent-task-execution.server'
import {
  COLLECTIVE_PROPOSAL_INSTRUCTION,
  renderCollectiveConsensusEvidence,
  resolveGeneralIntelligenceCollective,
  type GeneralIntelligenceCollectiveResult,
} from './general-intelligence-collective.server'
import {
  executeGeneralIntelligenceOrchestration,
  type GeneralIntelligenceOrchestrationResult,
} from './general-intelligence-orchestration.server'

type Sb = { from: (table: string) => any }
type ExecuteTask = typeof executeAgentTask

type RoutedGeneralIntelligenceResult = {
  status: 'completed' | 'waiting_for_approval' | 'escalated' | 'failed'
  mode: GeneralIntelligenceAssessment['mode']
  output?: string
  orchestration?: GeneralIntelligenceOrchestrationResult
  collective?: GeneralIntelligenceCollectiveResult
  synthesis_agent_id?: string
  reason?: string
}

function completedEvidence(orchestration: GeneralIntelligenceOrchestrationResult): string {
  return orchestration.results
    .filter((result) => result.status === 'completed' && result.output)
    .map((result) => `- ${result.assignment_id} (${result.agent_id}): ${result.output}`)
    .join('\n')
}

function synthesisInput(args: {
  assessment: GeneralIntelligenceAssessment
  orchestration: GeneralIntelligenceOrchestrationResult
  collective?: GeneralIntelligenceCollectiveResult
}): string {
  return [
    'BLACKSTAR AUTHORISED MULTI-AGENT SYNTHESIS',
    `Objective: ${args.assessment.goal.objective}`,
    `Mode: ${args.assessment.mode}`,
    '',
    args.collective ? renderCollectiveConsensusEvidence(args.collective) : [
      'VERIFIED DELEGATION OUTPUTS',
      completedEvidence(args.orchestration) || '- none',
    ].join('\n'),
    '',
    'Produce one bounded final answer from this evidence. Reconcile overlaps, explicitly surface material conflicts or uncertainty, and do not invent agreement, evidence, permissions, tool results, or facts that are not supported above. Independently verify any claim that must be relied on for the final answer. Preserve all approval and safety boundaries.',
  ].join('\n')
}

function withCollective<T extends object>(value: T, collective: GeneralIntelligenceCollectiveResult | undefined): T & { collective?: GeneralIntelligenceCollectiveResult } {
  return collective ? { ...value, collective } : value
}

/**
 * Turns a General Intelligence Kernel assessment into an execution decision.
 * Direct work uses the existing single-agent runtime. Delegate and collective
 * work use the existing authorised orchestration executor and, after successful
 * completion, an explicitly authorised synthesis agent through that same runtime.
 * Collective mode additionally reuses Blackstar's existing trusted consensus
 * resolver; consensus remains advisory and never creates execution authority.
 */
export async function executeAssessedGeneralIntelligence(args: {
  sb: Sb
  userId: string
  assessment: GeneralIntelligenceAssessment
  authorisedAgentIds: Iterable<string>
  plan?: OrchestratorPlan
  synthesisAgentId?: string
  executeTask?: ExecuteTask
  executeOrchestration?: typeof executeGeneralIntelligenceOrchestration
  resolveCollective?: typeof resolveGeneralIntelligenceCollective
}): Promise<RoutedGeneralIntelligenceResult> {
  const authorised = new Set(args.authorisedAgentIds)
  const execute = args.executeTask ?? executeAgentTask
  const orchestrate = args.executeOrchestration ?? executeGeneralIntelligenceOrchestration
  const resolveCollective = args.resolveCollective ?? resolveGeneralIntelligenceCollective

  if (args.assessment.mode === 'escalate') {
    return { status: 'escalated', mode: 'escalate', reason: args.assessment.reasons.join(' ') }
  }
  if (args.assessment.requires_approval) {
    return { status: 'waiting_for_approval', mode: args.assessment.mode, reason: 'The General Intelligence assessment requires approval before execution.' }
  }

  const selected = args.assessment.selected_agent_ids.filter((agentId) => authorised.has(agentId))
  if (!selected.length) return { status: 'failed', mode: args.assessment.mode, reason: 'No selected General Intelligence agent is authorised for this execution.' }

  if (args.assessment.mode === 'direct') {
    try {
      const executed = await execute({ sb: args.sb, userId: args.userId, agentId: selected[0]!, input: args.assessment.goal.objective })
      return { status: 'completed', mode: 'direct', output: executed.output }
    } catch (error) {
      return { status: 'failed', mode: 'direct', reason: error instanceof Error ? error.message : 'Direct General Intelligence execution failed.' }
    }
  }

  if (!args.plan) return { status: 'failed', mode: args.assessment.mode, reason: 'Delegate and collective modes require a normalised authorised orchestration plan.' }

  const allowedForRun = new Set(selected)
  for (const assignment of args.plan.assignments) {
    if (!allowedForRun.has(assignment.agent_id)) {
      return { status: 'failed', mode: args.assessment.mode, reason: `Plan assignment ${assignment.id} targets an agent not selected by the General Intelligence assessment.` }
    }
  }

  const executeAssignment: ExecuteTask = args.assessment.mode === 'collective'
    ? ((taskArgs) => execute({ ...taskArgs, input: `${taskArgs.input}\n${COLLECTIVE_PROPOSAL_INSTRUCTION}` })) as ExecuteTask
    : execute

  const orchestration = await orchestrate({ sb: args.sb, userId: args.userId, plan: args.plan, authorisedAgentIds: selected, executeAssignment })
  if (orchestration.status !== 'completed') {
    return {
      status: orchestration.status === 'waiting_for_approval' ? 'waiting_for_approval' : 'failed',
      mode: args.assessment.mode,
      orchestration,
      reason: orchestration.status === 'waiting_for_approval'
        ? 'An authorised delegated assignment requires approval before continuing.'
        : 'One or more authorised delegated assignments did not complete successfully.',
    }
  }

  let collective: GeneralIntelligenceCollectiveResult | undefined
  if (args.assessment.mode === 'collective') {
    try {
      collective = await resolveCollective({ sb: args.sb, userId: args.userId, orchestration })
    } catch (error) {
      return { status: 'failed', mode: 'collective', orchestration, reason: error instanceof Error ? error.message : 'Collective consensus resolution failed.' }
    }
  }

  const synthesisAgentId = args.synthesisAgentId ?? selected[0]!
  if (!authorised.has(synthesisAgentId) || !selected.includes(synthesisAgentId)) {
    return withCollective({ status: 'failed' as const, mode: args.assessment.mode, orchestration, reason: 'The synthesis agent is not authorised and selected for this General Intelligence run.' }, collective)
  }

  try {
    const inputArgs = collective
      ? { assessment: args.assessment, orchestration, collective }
      : { assessment: args.assessment, orchestration }
    const synthesis = await execute({ sb: args.sb, userId: args.userId, agentId: synthesisAgentId, input: synthesisInput(inputArgs) })
    return withCollective({ status: 'completed' as const, mode: args.assessment.mode, output: synthesis.output, orchestration, synthesis_agent_id: synthesisAgentId }, collective)
  } catch (error) {
    return withCollective({ status: 'failed' as const, mode: args.assessment.mode, orchestration, synthesis_agent_id: synthesisAgentId, reason: error instanceof Error ? error.message : 'General Intelligence synthesis failed.' }, collective)
  }
}
