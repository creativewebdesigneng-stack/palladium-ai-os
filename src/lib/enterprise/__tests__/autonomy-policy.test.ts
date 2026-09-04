import { describe, expect, it } from "vitest";
import { evaluateEnterpriseAutonomy } from "../autonomy-policy";

const policy = {
  maxConcurrentRuns: 10,
  maxDailySpendMicros: 1_000_000,
  requireApprovalForExternalWrites: true,
  requireApprovalForFinancialActions: true,
  allowedProviders: ["openai", "anthropic"],
  allowedCapabilities: ["research", "support"],
};

describe("enterprise autonomy policy", () => {
  it("allows bounded read-only work", () => {
    expect(evaluateEnterpriseAutonomy(policy, {
      activeRuns: 2,
      dailySpendMicros: 100_000,
      estimatedCostMicros: 50_000,
      provider: "openai",
      capability: "research",
      externalWrite: false,
      financialAction: false,
    })).toEqual({ allowed: true, requiresApproval: false, blockers: [] });
  });

  it("requires approval for external writes without treating approval as execution", () => {
    const result = evaluateEnterpriseAutonomy(policy, {
      activeRuns: 2,
      dailySpendMicros: 100_000,
      estimatedCostMicros: 50_000,
      provider: "openai",
      capability: "support",
      externalWrite: true,
      financialAction: false,
    });
    expect(result.allowed).toBe(true);
    expect(result.requiresApproval).toBe(true);
  });

  it("blocks spend and provider policy violations", () => {
    const result = evaluateEnterpriseAutonomy(policy, {
      activeRuns: 1,
      dailySpendMicros: 990_000,
      estimatedCostMicros: 20_000,
      provider: "unknown",
      capability: "research",
      externalWrite: false,
      financialAction: false,
    });
    expect(result.allowed).toBe(false);
    expect(result.blockers).toEqual(["daily_spend_limit_exceeded", "provider_not_allowed"]);
  });
});
