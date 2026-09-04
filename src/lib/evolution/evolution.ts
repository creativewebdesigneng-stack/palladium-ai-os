export type EvolutionMetrics = {
  successRate: number;
  qualityScore: number;
  avgCostMicros: number;
  avgLatencyMs: number;
  sampleSize: number;
};

export type EvolutionDecision = {
  status: "promote" | "review" | "reject";
  score: number;
  reasons: string[];
  requiresApproval: true;
};

function assertMetrics(metrics: EvolutionMetrics) {
  if (!Number.isFinite(metrics.successRate) || metrics.successRate < 0 || metrics.successRate > 1) throw new Error("EVOLUTION_INVALID_METRICS");
  if (!Number.isFinite(metrics.qualityScore) || metrics.qualityScore < 0 || metrics.qualityScore > 1) throw new Error("EVOLUTION_INVALID_METRICS");
  if (!Number.isSafeInteger(metrics.avgCostMicros) || metrics.avgCostMicros < 0) throw new Error("EVOLUTION_INVALID_METRICS");
  if (!Number.isSafeInteger(metrics.avgLatencyMs) || metrics.avgLatencyMs < 0) throw new Error("EVOLUTION_INVALID_METRICS");
  if (!Number.isSafeInteger(metrics.sampleSize) || metrics.sampleSize < 1) throw new Error("EVOLUTION_INVALID_METRICS");
}

/**
 * Compares a candidate behaviour/policy configuration to the current baseline.
 * A positive result is only a promotion proposal: this function never mutates
 * code, permissions, prompts, policies or runtime configuration.
 */
export function evaluateEvolutionCandidate(baseline: EvolutionMetrics, candidate: EvolutionMetrics): EvolutionDecision {
  assertMetrics(baseline);
  assertMetrics(candidate);

  const reasons: string[] = [];
  const successDelta = candidate.successRate - baseline.successRate;
  const qualityDelta = candidate.qualityScore - baseline.qualityScore;
  const costDeltaRatio = baseline.avgCostMicros === 0
    ? (candidate.avgCostMicros === 0 ? 0 : 1)
    : (candidate.avgCostMicros - baseline.avgCostMicros) / baseline.avgCostMicros;
  const latencyDeltaRatio = baseline.avgLatencyMs === 0
    ? (candidate.avgLatencyMs === 0 ? 0 : 1)
    : (candidate.avgLatencyMs - baseline.avgLatencyMs) / baseline.avgLatencyMs;

  const reliabilityScore = successDelta * 0.45;
  const qualityScore = qualityDelta * 0.35;
  const costScore = -costDeltaRatio * 0.12;
  const latencyScore = -latencyDeltaRatio * 0.08;
  const score = reliabilityScore + qualityScore + costScore + latencyScore;

  if (candidate.sampleSize < Math.max(5, Math.ceil(baseline.sampleSize * 0.25))) reasons.push("insufficient_candidate_evidence");
  if (successDelta < -0.02) reasons.push("success_rate_regression");
  if (qualityDelta < -0.02) reasons.push("quality_regression");
  if (costDeltaRatio > 0.25) reasons.push("cost_regression");
  if (latencyDeltaRatio > 0.35) reasons.push("latency_regression");

  if (reasons.includes("success_rate_regression") || reasons.includes("quality_regression")) {
    return { status: "reject", score, reasons, requiresApproval: true };
  }

  if (reasons.length > 0 || score < 0.02) {
    return { status: "review", score, reasons: reasons.length ? reasons : ["improvement_not_material"], requiresApproval: true };
  }

  return { status: "promote", score, reasons: ["measured_improvement"], requiresApproval: true };
}
