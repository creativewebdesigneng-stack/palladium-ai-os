import type {
  AiHubCapabilityRef,
  AiHubRouteDecision,
  AiHubRoutingObjective,
  AiHubRoutingSignals,
  AiHubWorkload,
} from './contracts'

function satisfiesWorkload(capability: AiHubCapabilityRef, workload: AiHubWorkload) {
  const requirements = workload.requirements
  if (requirements.preferredKinds?.length && !requirements.preferredKinds.includes(capability.kind)) return false
  if (!requirements.capabilities.every((required) => capability.capabilities.includes(required))) return false
  if (requirements.requiredDeploymentTargets?.length && !requirements.requiredDeploymentTargets.some((target) => capability.deploymentTargets.includes(target))) return false
  if (requirements.requiredRegions?.length && !requirements.requiredRegions.some((region) => capability.regions?.includes(region))) return false
  if (requirements.requirePrivateExecution && !capability.deploymentTargets.some((target) => ['customer-cloud', 'on-prem', 'edge', 'device'].includes(target))) return false
  if (requirements.maxLatencyMs != null) {
    if (capability.estimatedLatencyMs == null || capability.estimatedLatencyMs > requirements.maxLatencyMs) return false
  }
  if (requirements.maxCostMinorUnits != null) {
    if (capability.estimatedCostMinorUnits == null || capability.estimatedCostMinorUnits > requirements.maxCostMinorUnits) return false
    if (requirements.currency && capability.currency !== requirements.currency) return false
  }
  return true
}

function finiteMetadataNumber(capability: AiHubCapabilityRef, key: string) {
  const raw = capability.metadata?.[key]
  const value = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() ? Number(raw) : Number.NaN
  return Number.isFinite(value) ? value : null
}

function inverseNormalise(value: number | undefined, values: Array<number | undefined>) {
  if (value == null || !Number.isFinite(value)) return 0.5
  const finite = values.filter((candidate): candidate is number => candidate != null && Number.isFinite(candidate))
  if (finite.length <= 1) return 0.5
  const min = Math.min(...finite)
  const max = Math.max(...finite)
  if (min === max) return 0.5
  return 1 - (value - min) / (max - min)
}

function reliabilitySignal(capability: AiHubCapabilityRef) {
  const runs = Math.max(0, finiteMetadataNumber(capability, 'recentRuns') ?? 0)
  const succeeded = Math.max(0, finiteMetadataNumber(capability, 'succeededRuns') ?? 0)
  const failed = Math.max(0, finiteMetadataNumber(capability, 'failedRuns') ?? 0)
  const observed = Math.max(runs, succeeded + failed)
  if (observed <= 0) return { score: 0.5, observedRuns: 0 }

  // Bayesian smoothing prevents tiny samples from looking perfectly reliable.
  const score = (succeeded + 2) / (observed + 4)
  return { score: Math.min(1, Math.max(0, score)), observedRuns: observed }
}

function qualitySignal(capability: AiHubCapabilityRef) {
  const average = finiteMetadataNumber(capability, 'evalAverageScore')
  const count = Math.max(0, finiteMetadataNumber(capability, 'evalCount') ?? 0)
  if (average == null || count <= 0) return { score: 0.5, evaluationCount: 0 }

  const normalised = Math.min(1, Math.max(0, average / 100))
  // Pull small evaluation samples toward neutral rather than over-trusting one score.
  const confidence = Math.min(1, count / 10)
  return {
    score: 0.5 + (normalised - 0.5) * confidence,
    evaluationCount: count,
  }
}

const OBJECTIVE_WEIGHTS: Record<AiHubRoutingObjective, { cost: number; latency: number; reliability: number; quality: number }> = {
  balanced: { cost: 0.3, latency: 0.2, reliability: 0.25, quality: 0.25 },
  'lowest-cost': { cost: 0.7, latency: 0.1, reliability: 0.1, quality: 0.1 },
  'lowest-latency': { cost: 0.1, latency: 0.7, reliability: 0.1, quality: 0.1 },
  'highest-reliability': { cost: 0.1, latency: 0.1, reliability: 0.65, quality: 0.15 },
  'highest-quality': { cost: 0.1, latency: 0.1, reliability: 0.15, quality: 0.65 },
}

function scoreCapability(
  capability: AiHubCapabilityRef,
  eligible: AiHubCapabilityRef[],
  objective: AiHubRoutingObjective,
): AiHubRoutingSignals {
  const costScore = inverseNormalise(capability.estimatedCostMinorUnits, eligible.map((candidate) => candidate.estimatedCostMinorUnits))
  const latencyScore = inverseNormalise(capability.estimatedLatencyMs, eligible.map((candidate) => candidate.estimatedLatencyMs))
  const reliability = reliabilitySignal(capability)
  const quality = qualitySignal(capability)
  const weights = OBJECTIVE_WEIGHTS[objective]
  const score =
    costScore * weights.cost +
    latencyScore * weights.latency +
    reliability.score * weights.reliability +
    quality.score * weights.quality

  return {
    objective,
    score,
    costScore,
    latencyScore,
    reliabilityScore: reliability.score,
    qualityScore: quality.score,
    observedRuns: reliability.observedRuns,
    evaluationCount: quality.evaluationCount,
  }
}

export function routeAiHubWorkload(workload: AiHubWorkload, capabilities: AiHubCapabilityRef[]): AiHubRouteDecision | null {
  const eligible = capabilities.filter((capability) => satisfiesWorkload(capability, workload))
  if (!eligible.length) return null

  const objective = workload.requirements.routingObjective ?? 'balanced'
  const selected = eligible
    .map((capability, index) => ({ capability, index, signals: scoreCapability(capability, eligible, objective) }))
    .sort((a, b) =>
      b.signals.score - a.signals.score ||
      (a.capability.estimatedCostMinorUnits ?? Number.POSITIVE_INFINITY) - (b.capability.estimatedCostMinorUnits ?? Number.POSITIVE_INFINITY) ||
      (a.capability.estimatedLatencyMs ?? Number.POSITIVE_INFINITY) - (b.capability.estimatedLatencyMs ?? Number.POSITIVE_INFINITY) ||
      a.index - b.index,
    )[0]
  if (!selected) return null

  const policyChecks = ['tenant-isolation', 'capability-match', 'deployment-policy', 'intelligence-routing']
  if (workload.requirements.requirePrivateExecution) policyChecks.push('private-execution')
  if (workload.requirements.maxLatencyMs != null) policyChecks.push('latency-budget')
  if (workload.requirements.maxCostMinorUnits != null) policyChecks.push('cost-budget')
  if (workload.requirements.requireHumanApproval) policyChecks.push('approval-required')
  if (selected.signals.observedRuns > 0) policyChecks.push('reliability-telemetry')
  if (selected.signals.evaluationCount > 0) policyChecks.push('evaluation-trust')

  return {
    workloadId: workload.id,
    capability: selected.capability,
    reason: `Blackstar Intelligence Router selected the highest-scoring eligible capability for the ${objective} objective after policy, cost, latency, reliability and evaluation-trust checks.`,
    policyChecks,
    routingSignals: selected.signals,
  }
}
