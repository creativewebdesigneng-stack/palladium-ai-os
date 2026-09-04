export type CounterfactualRisk = 'low' | 'medium' | 'high'

export interface CounterfactualScenario {
  id: string
  label: string
  expectedOutcome: number
  confidence: number
  cost: number
  risk: CounterfactualRisk
  reversible: boolean
  assumptions?: string[]
}

export interface CounterfactualPolicy {
  minConfidence?: number
  maxCost?: number
  allowedRisk?: CounterfactualRisk[]
  requireReversible?: boolean
  requireApprovalFor?: CounterfactualRisk[]
}

export interface CounterfactualResult extends CounterfactualScenario {
  score: number
  allowed: boolean
  requiresApproval: boolean
  reasons: string[]
}

const riskPenalty: Record<CounterfactualRisk, number> = {
  low: 0.05,
  medium: 0.2,
  high: 0.45,
}

export function evaluateCounterfactual(
  scenario: CounterfactualScenario,
  policy: CounterfactualPolicy = {},
): CounterfactualResult {
  const minConfidence = policy.minConfidence ?? 0.65
  const maxCost = policy.maxCost ?? Number.POSITIVE_INFINITY
  const allowedRisk = policy.allowedRisk ?? ['low', 'medium']
  const requireReversible = policy.requireReversible ?? true
  const approvalRisks = policy.requireApprovalFor ?? ['medium']
  const reasons: string[] = []

  if (scenario.confidence < minConfidence) reasons.push('confidence_below_policy')
  if (scenario.cost > maxCost) reasons.push('cost_above_policy')
  if (!allowedRisk.includes(scenario.risk)) reasons.push('risk_not_allowed')
  if (requireReversible && !scenario.reversible) reasons.push('irreversible_change_blocked')

  const normalizedCost = Number.isFinite(maxCost) && maxCost > 0
    ? Math.min(1, scenario.cost / maxCost)
    : 0
  const score = scenario.expectedOutcome * scenario.confidence
    - riskPenalty[scenario.risk]
    - normalizedCost * 0.15

  const allowed = reasons.length === 0
  return {
    ...scenario,
    score,
    allowed,
    requiresApproval: allowed && approvalRisks.includes(scenario.risk),
    reasons,
  }
}

export function rankCounterfactuals(
  scenarios: CounterfactualScenario[],
  policy: CounterfactualPolicy = {},
): CounterfactualResult[] {
  return scenarios
    .map((scenario) => evaluateCounterfactual(scenario, policy))
    .sort((a, b) => {
      if (a.allowed !== b.allowed) return a.allowed ? -1 : 1
      return b.score - a.score
    })
}

export function selectCounterfactual(
  scenarios: CounterfactualScenario[],
  policy: CounterfactualPolicy = {},
): CounterfactualResult | null {
  return rankCounterfactuals(scenarios, policy).find((scenario) => scenario.allowed) ?? null
}
