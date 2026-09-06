import type { GeneralIntelligenceAssessment } from '@/lib/agents/general-intelligence-kernel'

export type BlackstarAstraReasoningEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max'

export type BlackstarAstraReasoningControl = {
  version: 1
  effort: BlackstarAstraReasoningEffort
  verification_passes: number
  planner_round_budget: number
  rationale: string[]
}

const clamp01 = (value: number) => Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), 1)

/**
 * Converts the bounded General Intelligence assessment into an explicit compute
 * budget for Blackstar Astra-class reasoning. This is compute policy only: it
 * cannot add tools, permissions, approvals, identities or execution authority.
 */
export function selectBlackstarAstraReasoningControl(
  assessment: GeneralIntelligenceAssessment,
): BlackstarAstraReasoningControl {
  const novelty = clamp01(assessment.novelty)
  const ambiguity = clamp01(assessment.ambiguity)
  const risk = clamp01(assessment.risk)
  const uncertainty = 1 - clamp01(assessment.confidence)
  const crossDomain = assessment.goal.domains.length >= 2

  const pressure = Math.max(
    novelty,
    ambiguity,
    risk,
    uncertainty,
    crossDomain ? 0.7 : 0,
    assessment.collective_intelligence_recommended ? 0.75 : 0,
  )

  let effort: BlackstarAstraReasoningEffort = 'low'
  if (pressure >= 0.9) effort = 'max'
  else if (pressure >= 0.8) effort = 'xhigh'
  else if (pressure >= 0.65) effort = 'high'
  else if (pressure >= 0.4) effort = 'medium'

  const rationale: string[] = []
  if (novelty >= 0.65) rationale.push('high novelty')
  if (ambiguity >= 0.65) rationale.push('high ambiguity')
  if (risk >= 0.65) rationale.push('high risk')
  if (uncertainty >= 0.45) rationale.push('low confidence')
  if (crossDomain) rationale.push('cross-domain objective')
  if (assessment.collective_intelligence_recommended) rationale.push('collective coverage recommended')
  if (!rationale.length) rationale.push('routine bounded objective')

  const budgets: Record<BlackstarAstraReasoningEffort, [number, number]> = {
    low: [1, 4],
    medium: [1, 6],
    high: [2, 8],
    xhigh: [2, 10],
    max: [3, 10],
  }
  const [verification_passes, planner_round_budget] = budgets[effort]

  return {
    version: 1,
    effort,
    verification_passes,
    planner_round_budget,
    rationale,
  }
}

export function renderBlackstarAstraReasoningControl(control: BlackstarAstraReasoningControl): string {
  return [
    'BLACKSTAR ASTRA ADAPTIVE REASONING',
    `Reasoning effort: ${control.effort}`,
    `Verification passes requested: ${control.verification_passes}`,
    `Planner round budget: ${control.planner_round_budget}`,
    `Reason: ${control.rationale.join(' | ')}`,
    'Boundary: reasoning effort changes compute/verification depth only. It never grants tools, approvals, permissions, identity, delegation or execution authority.',
    'Do not reveal hidden chain-of-thought. Return conclusions, concise rationale and verifiable evidence only.',
  ].join('\n')
}
