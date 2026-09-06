import type { VerificationDecision } from '@/lib/agents/agent-planner'
import type { BlackstarAstraReasoningControl } from './blackstar-astra-reasoning'

export const BLACKSTAR_ASTRA_PLANNER_HARD_MAX_ROUNDS = 10
export const BLACKSTAR_ASTRA_VERIFICATION_HARD_MAX_PASSES = 3

export type BlackstarAstraPlannerPolicy = {
  model_round_budget: number
  verification_passes: number
}

export function resolveBlackstarAstraPlannerPolicy(
  control?: BlackstarAstraReasoningControl | null,
): BlackstarAstraPlannerPolicy {
  return {
    model_round_budget: Math.min(
      Math.max(Math.round(control?.planner_round_budget ?? BLACKSTAR_ASTRA_PLANNER_HARD_MAX_ROUNDS), 1),
      BLACKSTAR_ASTRA_PLANNER_HARD_MAX_ROUNDS,
    ),
    verification_passes: Math.min(
      Math.max(Math.round(control?.verification_passes ?? 1), 1),
      BLACKSTAR_ASTRA_VERIFICATION_HARD_MAX_PASSES,
    ),
  }
}

/**
 * Fail-closed consensus for repeated verifier passes. Every requested pass must
 * independently approve the candidate. Evidence is combined, the weakest score
 * wins, and escalation takes precedence over re-plan.
 */
export function combineBlackstarAstraVerificationDecisions(
  decisions: VerificationDecision[],
): VerificationDecision {
  if (!decisions.length) {
    return {
      passed: false,
      score: 0,
      issues: ['No verification decision was produced'],
      evidence: [],
      next_action: 'replan',
      revised_steps: [],
    }
  }

  const passed = decisions.every((decision) => decision.passed)
  const score = Math.min(...decisions.map((decision) => decision.score))
  const issues = [...new Set(decisions.flatMap((decision) => decision.issues))]
  const evidence = [...new Set(decisions.flatMap((decision) => decision.evidence))]
  const next_action = decisions.some((decision) => decision.next_action === 'escalate')
    ? 'escalate'
    : passed && decisions.every((decision) => decision.next_action === 'complete')
      ? 'complete'
      : 'replan'
  const revised_steps = decisions.flatMap((decision) => decision.revised_steps ?? [])

  return { passed, score, issues, evidence, next_action, revised_steps }
}
