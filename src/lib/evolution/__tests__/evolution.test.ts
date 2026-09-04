import { describe, expect, it } from "vitest";
import { evaluateEvolutionCandidate } from "../evolution";

const baseline = {
  successRate: 0.8,
  qualityScore: 0.8,
  avgCostMicros: 100_000,
  avgLatencyMs: 1_000,
  sampleSize: 100,
};

describe("Blackstar evolution", () => {
  it("proposes promotion for measured improvement but still requires approval", () => {
    const result = evaluateEvolutionCandidate(baseline, {
      successRate: 0.9,
      qualityScore: 0.9,
      avgCostMicros: 90_000,
      avgLatencyMs: 900,
      sampleSize: 40,
    });
    expect(result.status).toBe("promote");
    expect(result.requiresApproval).toBe(true);
  });

  it("rejects reliability regressions", () => {
    const result = evaluateEvolutionCandidate(baseline, {
      ...baseline,
      successRate: 0.7,
      sampleSize: 40,
    });
    expect(result.status).toBe("reject");
    expect(result.reasons).toContain("success_rate_regression");
  });

  it("requires review when evidence is too thin", () => {
    const result = evaluateEvolutionCandidate(baseline, {
      successRate: 0.95,
      qualityScore: 0.95,
      avgCostMicros: 80_000,
      avgLatencyMs: 800,
      sampleSize: 4,
    });
    expect(result.status).toBe("review");
    expect(result.reasons).toContain("insufficient_candidate_evidence");
  });

  it("rejects invalid metrics", () => {
    expect(() => evaluateEvolutionCandidate(baseline, { ...baseline, successRate: 2 })).toThrow("EVOLUTION_INVALID_METRICS");
  });
});
