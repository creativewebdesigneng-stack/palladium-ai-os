import { describe, expect, it } from "vitest";
import {
  growthMetrics,
  maturitySummary,
  rankIndustryOpportunities,
  supplierRiskScore,
} from "./industry-calculations";

describe("industry deterministic calculations", () => {
  it("classifies maturity", () => {
    expect(maturitySummary({ a: 4, b: 4 }).level).toBe("Advanced");
    expect(maturitySummary({}).level).toBe("Unscored");
  });

  it("weights supplier risk deterministically", () => {
    expect(
      supplierRiskScore({
        criticality: 5,
        concentration: 4,
        financial: 3,
        delivery: 3,
        quality: 2,
        geo: 4,
      }),
    ).toBe(75);
  });

  it("calculates commercial scenario metrics", () => {
    expect(growthMetrics(1000, 700, 10000, 100, 160)).toEqual({
      margin: 300,
      marginPct: 30,
      marketShare: 10,
      roi: 60,
      paybackMonths: 7.5,
    });
  });

  it("ranks opportunities with the requested impact weight", () => {
    const ranked = rankIndustryOpportunities(3, [
      { name: "Low", type: "Growth", impact: 1, feasibility: 1, risk: 5 },
      { name: "High", type: "Growth", impact: 5, feasibility: 5, risk: 1 },
    ]);
    expect(ranked[0]?.name).toBe("High");
    expect(ranked[0]?.score).toBeGreaterThan(ranked[1]?.score ?? 0);
  });
});
