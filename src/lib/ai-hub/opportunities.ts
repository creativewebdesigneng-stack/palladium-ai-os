export type BlackstarOpportunitySignalKind =
  | 'growth'
  | 'cost'
  | 'risk'
  | 'customer'
  | 'operations'
  | 'market'

export type BlackstarOpportunityActionRisk = 'low' | 'medium' | 'high'

export interface BlackstarOpportunitySignal {
  id: string
  kind: BlackstarOpportunitySignalKind
  title: string
  summary: string
  confidence: number
  impact: number
  urgency: number
  evidence?: string[]
}

export interface BlackstarOpportunityPolicy {
  minimumConfidence?: number
  minimumScore?: number
  maximumRecommendations?: number
  allowedKinds?: BlackstarOpportunitySignalKind[]
  autoActionRisk?: BlackstarOpportunityActionRisk
}

export interface BlackstarOpportunityRecommendation {
  signalId: string
  kind: BlackstarOpportunitySignalKind
  title: string
  summary: string
  score: number
  confidence: number
  evidence: string[]
  recommendedAction: string
  actionRisk: BlackstarOpportunityActionRisk
  requiresApproval: boolean
  policyChecks: string[]
}

const RISK_ORDER: Record<BlackstarOpportunityActionRisk, number> = {
  low: 0,
  medium: 1,
  high: 2,
}

function clamp(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function inferRisk(signal: BlackstarOpportunitySignal): BlackstarOpportunityActionRisk {
  // Opportunity impact measures potential value/consequence, not execution risk.
  // Keep the action boundary tied to the class of governed action so a high-impact
  // growth signal is not automatically treated as a dangerous operation.
  if (signal.kind === 'risk') return 'high'
  if (signal.kind === 'cost' || signal.kind === 'operations') return 'medium'
  return 'low'
}

function recommendedAction(signal: BlackstarOpportunitySignal) {
  switch (signal.kind) {
    case 'growth':
      return `Create a governed growth experiment for: ${signal.title}`
    case 'cost':
      return `Analyse and propose a bounded cost-optimisation plan for: ${signal.title}`
    case 'risk':
      return `Open a governed risk-mitigation mission for: ${signal.title}`
    case 'customer':
      return `Create a customer-response and retention plan for: ${signal.title}`
    case 'operations':
      return `Create an operational improvement mission for: ${signal.title}`
    case 'market':
      return `Validate the market opportunity and propose next actions for: ${signal.title}`
  }
}

export function rankBlackstarOpportunities(
  signals: BlackstarOpportunitySignal[],
  policy: BlackstarOpportunityPolicy = {},
): BlackstarOpportunityRecommendation[] {
  const minimumConfidence = clamp(policy.minimumConfidence ?? 0.6)
  const minimumScore = clamp(policy.minimumScore ?? 0.55)
  const maximumRecommendations = Math.max(1, Math.min(20, Math.floor(policy.maximumRecommendations ?? 10)))
  const autoActionRisk = policy.autoActionRisk ?? 'low'
  const allowedKinds = policy.allowedKinds?.length ? new Set(policy.allowedKinds) : null

  return signals
    .filter((signal) => signal.id.trim() && signal.title.trim() && signal.summary.trim())
    .filter((signal) => !allowedKinds || allowedKinds.has(signal.kind))
    .map((signal) => {
      const confidence = clamp(signal.confidence)
      const impact = clamp(signal.impact)
      const urgency = clamp(signal.urgency)
      const score = Number((confidence * 0.4 + impact * 0.4 + urgency * 0.2).toFixed(4))
      const actionRisk = inferRisk({ ...signal, confidence, impact, urgency })
      const requiresApproval = RISK_ORDER[actionRisk] > RISK_ORDER[autoActionRisk]

      return {
        signalId: signal.id,
        kind: signal.kind,
        title: signal.title,
        summary: signal.summary,
        score,
        confidence,
        evidence: unique(signal.evidence ?? []),
        recommendedAction: recommendedAction(signal),
        actionRisk,
        requiresApproval,
        policyChecks: [
          'signal-validity',
          'confidence-threshold',
          'opportunity-score',
          'action-risk-boundary',
          'approval-gate',
        ],
      } satisfies BlackstarOpportunityRecommendation
    })
    .filter((opportunity) => opportunity.confidence >= minimumConfidence && opportunity.score >= minimumScore)
    .sort((a, b) => b.score - a.score || b.confidence - a.confidence || a.signalId.localeCompare(b.signalId))
    .slice(0, maximumRecommendations)
}
