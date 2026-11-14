export type SupplierRiskInput = {
  criticality: number;
  concentration: number;
  financial: number;
  delivery: number;
  quality: number;
  geo: number;
};

export type IndustryOpportunity = {
  name: string;
  type: string;
  impact: number;
  feasibility: number;
  risk: number;
};

export function maturitySummary(scores: Record<string, number>) {
  const values = Object.values(scores).filter(Number.isFinite);
  if (!values.length) return { average: 0, level: "Unscored" };
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const level =
    average < 2
      ? "Foundational"
      : average < 3
        ? "Developing"
        : average < 4
          ? "Established"
          : average < 4.6
            ? "Advanced"
            : "Leading";
  return { average, level };
}

export function supplierRiskScore(input: SupplierRiskInput) {
  return Math.round(
    (input.criticality * 0.25 +
      input.concentration * 0.2 +
      input.financial * 0.15 +
      input.delivery * 0.15 +
      input.quality * 0.1 +
      input.geo * 0.15) *
      20,
  );
}

export function growthMetrics(
  revenue: number,
  cost: number,
  market: number,
  investment: number,
  benefit: number,
) {
  return {
    margin: revenue - cost,
    marginPct: revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0,
    marketShare: market > 0 ? (revenue / market) * 100 : 0,
    roi: investment > 0 ? ((benefit - investment) / investment) * 100 : 0,
    paybackMonths: benefit > 0 ? (investment / benefit) * 12 : 0,
  };
}

export function rankIndustryOpportunities(
  impactWeight: number,
  ideas: readonly IndustryOpportunity[],
) {
  const weight = Number.isFinite(impactWeight) ? impactWeight : 1;
  return ideas
    .map((idea) => ({
      ...idea,
      score: Math.round(
        ((idea.impact * weight + idea.feasibility * 3 + (6 - idea.risk) * 2) / (weight + 5)) * 20,
      ),
    }))
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name));
}
