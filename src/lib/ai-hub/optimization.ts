export type BlackstarOptimizationDirection = 'increase' | 'decrease'
export type BlackstarOptimizationRisk = 'low' | 'medium' | 'high'

export interface BlackstarOptimizationMetric {
  id: string
  current: number
  target: number
  direction: BlackstarOptimizationDirection
  weight?: number
}

export interface BlackstarOptimizationCandidate {
  id: string
  title: string
  expectedImpact: number
  confidence: number
  risk: BlackstarOptimizationRisk
  cost?: number
  reversible?: boolean
  affectedMetrics: string[]
}

export interface BlackstarOptimizationPolicy {
  maximumCandidates?: number
  maximumCost?: number
  minimumConfidence?: number
  allowedRisk?: Exclude<BlackstarOptimizationRisk, 'high'> | 'high'
  requireApprovalForMediumRisk?: boolean
  allowIrreversible?: boolean
}

export interface BlackstarOptimizationRecommendation {
  candidate: BlackstarOptimizationCandidate
  score: number
  requiresApproval: boolean
  reasons: string[]
}

export interface BlackstarOptimizationPlan {
  recommendations: BlackstarOptimizationRecommendation[]
  blockedCandidateIds: string[]
  requiresApproval: boolean
}

const riskRank: Record<BlackstarOptimizationRisk, number> = {
  low: 1,
  medium: 2,
  high: 3,
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

function metricGap(metric: BlackstarOptimizationMetric) {
  const scale = Math.max(Math.abs(metric.target), Math.abs(metric.current), 1)
  const raw = metric.direction === 'increase'
    ? (metric.target - metric.current) / scale
    : (metric.current - metric.target) / scale
  return clamp01(raw) * Math.max(0, metric.weight ?? 1)
}

export function buildBlackstarOptimizationPlan(
  metrics: BlackstarOptimizationMetric[],
  candidates: BlackstarOptimizationCandidate[],
  policy: BlackstarOptimizationPolicy = {},
): BlackstarOptimizationPlan {
  const metricById = new Map(metrics.map((metric) => [metric.id, metric]))
  const maximumCandidates = Math.max(1, Math.min(25, Math.floor(policy.maximumCandidates ?? 5)))
  const maximumCost = Math.max(0, policy.maximumCost ?? Number.POSITIVE_INFINITY)
  const minimumConfidence = clamp01(policy.minimumConfidence ?? 0.6)
  const allowedRisk = policy.allowedRisk ?? 'medium'
  const allowIrreversible = policy.allowIrreversible ?? false
  const requireMediumApproval = policy.requireApprovalForMediumRisk ?? true

  const blockedCandidateIds: string[] = []
  const recommendations: BlackstarOptimizationRecommendation[] = []

  for (const candidate of candidates) {
    const confidence = clamp01(candidate.confidence)
    if (confidence < minimumConfidence) {
      blockedCandidateIds.push(candidate.id)
      continue
    }
    if ((candidate.cost ?? 0) > maximumCost) {
      blockedCandidateIds.push(candidate.id)
      continue
    }
    if (riskRank[candidate.risk] > riskRank[allowedRisk]) {
      blockedCandidateIds.push(candidate.id)
      continue
    }
    if (candidate.reversible === false && !allowIrreversible) {
      blockedCandidateIds.push(candidate.id)
      continue
    }

    const affected = candidate.affectedMetrics
      .map((id) => metricById.get(id))
      .filter((metric): metric is BlackstarOptimizationMetric => Boolean(metric))

    if (affected.length === 0) {
      blockedCandidateIds.push(candidate.id)
      continue
    }

    const totalGap = affected.reduce((sum, metric) => sum + metricGap(metric), 0)
    const normalizedGap = totalGap / affected.length
    const impact = clamp01(candidate.expectedImpact)
    const riskPenalty = candidate.risk === 'low' ? 0 : candidate.risk === 'medium' ? 0.08 : 0.2
    const costPenalty = Number.isFinite(maximumCost) && maximumCost > 0
      ? Math.min(0.2, (candidate.cost ?? 0) / maximumCost * 0.2)
      : 0
    const score = Math.max(0, normalizedGap * 0.35 + impact * 0.35 + confidence * 0.3 - riskPenalty - costPenalty)
    const requiresApproval = candidate.risk === 'high' || (candidate.risk === 'medium' && requireMediumApproval)

    recommendations.push({
      candidate,
      score,
      requiresApproval,
      reasons: [
        `metric-gap:${normalizedGap.toFixed(3)}`,
        `expected-impact:${impact.toFixed(3)}`,
        `confidence:${confidence.toFixed(3)}`,
        `risk:${candidate.risk}`,
      ],
    })
  }

  recommendations.sort((a, b) => b.score - a.score || a.candidate.id.localeCompare(b.candidate.id))
  const selected = recommendations.slice(0, maximumCandidates)

  return {
    recommendations: selected,
    blockedCandidateIds,
    requiresApproval: selected.some((item) => item.requiresApproval),
  }
}
