import { describe, expect, it } from "vitest";
import { simulateAgentPlan } from "../agent-simulation";

const policy = { maxCostMicros: 1_000_000, maxRiskScore: 20, approvalRisk: "high" as const };

describe("Blackstar simulation", () => {
  it("passes a low-risk read-only plan", () => {
    expect(simulateAgentPlan([
      { id: "reason", action: "reasoning", risk: "low", estimatedCostMicros: 10_000 },
      { id: "lookup", action: "tool_read", risk: "medium", estimatedCostMicros: 20_000 },
    ], policy)).toMatchObject({ status: "pass", projectedCostMicros: 30_000, riskScore: 4, executableSteps: 2 });
  });

  it("never executes side-effecting steps during simulation", () => {
    const result = simulateAgentPlan([
      { id: "publish", action: "external_write", risk: "high", estimatedCostMicros: 50_000 },
      { id: "pay", action: "financial", risk: "critical", estimatedCostMicros: 100_000 },
    ], policy);
    expect(result.status).toBe("needs_approval");
    expect(result.suppressedSideEffectStepIds).toEqual(["publish", "pay"]);
    expect(result.executableSteps).toBe(0);
    expect(result.findings).toContain("SIDE_EFFECTS_SUPPRESSED");
  });

  it("blocks plans that exceed cost or risk policy", () => {
    const result = simulateAgentPlan([
      { id: "expensive", action: "model", risk: "critical", estimatedCostMicros: 1_000_001 },
      { id: "risky", action: "tool_write", risk: "critical", estimatedCostMicros: 1 },
      { id: "risky-2", action: "tool_write", risk: "critical", estimatedCostMicros: 1 },
    ], policy);
    expect(result.status).toBe("blocked");
    expect(result.findings).toContain("PROJECTED_COST_EXCEEDS_POLICY");
    expect(result.findings).toContain("PROJECTED_RISK_EXCEEDS_POLICY");
  });

  it("rejects duplicate step identities", () => {
    expect(() => simulateAgentPlan([
      { id: "same", action: "reasoning", risk: "low", estimatedCostMicros: 0 },
      { id: "same", action: "model", risk: "low", estimatedCostMicros: 0 },
    ], policy)).toThrow("SIMULATION_INVALID_STEP");
  });
});
