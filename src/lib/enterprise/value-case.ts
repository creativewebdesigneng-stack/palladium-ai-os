/**
 * Buyer-specific, structural enterprise value model.
 *
 * No default buyer assumptions or fabricated proof: inputs must come from
 * discovery and be independently validated before a commercial proposal.
 * This does not authorise checkout, execution, certification or contracting.
 */
import type { EnterpriseOffer } from "./high-value-offers";

export type EnterpriseValueInputs = {
  monthlyWorkflowVolume: number;
  minutesSavedPerWorkflow: number;
  loadedHourlyCostGbp: number;
  adoptionPercent: number;
  realizedSavingsPercent: number;
  annualOperatingCostGbp: number;
};

export type EnterpriseValueEvidence = {
  customerBaselineVerified: boolean;
  savingsPilotVerified: boolean;
  customerSponsorConfirmed: boolean;
  systemAndDataAccessReviewed: boolean;
  securityPrivacyReviewed: boolean;
  deliveryCapacityConfirmed: boolean;
};

export const ENTERPRISE_EVIDENCE_REQUIREMENTS: readonly {
  key: keyof EnterpriseValueEvidence;
  label: string;
}[] = [
  { key: "customerBaselineVerified", label: "Customer baseline and loaded costs independently checked" },
  { key: "savingsPilotVerified", label: "Observed pilot time savings and quality independently checked" },
  { key: "customerSponsorConfirmed", label: "Economic buyer, sponsor and budget confirmed" },
  { key: "systemAndDataAccessReviewed", label: "System integrations and source-data access technically reviewed" },
  { key: "securityPrivacyReviewed", label: "Security, privacy and legal review completed where required" },
  { key: "deliveryCapacityConfirmed", label: "Delivery staff, support, dependencies and operating costs validated" },
] as const;

export type EnterpriseValueResult = {
  annualGrossProductivityValueGbp: number;
  annualNetOperatingValueGbp: number;
  threeYearNetValueAfterProgrammeGbp: number;
  threeYearBenefitCostRatio: number;
  simplePaybackMonths: number | null;
  readyForIndependentProposalReview: boolean;
  unverifiedRequirements: string[];
  status: "missing-baseline" | "needs-evidence" | "economics-not-supported" | "candidate-for-review";
};

function validate(value: number, label: string, limit: number): number {
  if (!Number.isFinite(value) || value < 0 || value > limit) {
    throw new RangeError(`Invalid ${label}; enter a finite non-negative number within the displayed range.`);
  }
  return value;
}

export function evaluateEnterpriseValueCase(
  offer: Pick<EnterpriseOffer, "priceGbp">,
  input: EnterpriseValueInputs,
  evidence: EnterpriseValueEvidence,
): EnterpriseValueResult {
  const volume = validate(input.monthlyWorkflowVolume, "monthly workflow volume", 100_000_000);
  const minutes = validate(input.minutesSavedPerWorkflow, "minutes per workflow", 1_440);
  const loadedHourlyCost = validate(input.loadedHourlyCostGbp, "loaded hourly cost", 10_000);
  const adoption = validate(input.adoptionPercent, "adoption percentage", 100) / 100;
  const realized = validate(input.realizedSavingsPercent, "realised percentage", 100) / 100;
  const operatingCost = validate(input.annualOperatingCostGbp, "annual operating cost", 10_000_000_000);
  const programmeCost = validate(offer.priceGbp, "programme fee", 10_000_000_000);
  if (programmeCost <= 0) throw new RangeError("Programme fee must be positive.");
  const annualGrossProductivityValueGbp =
    volume * 12 * (minutes / 60) * loadedHourlyCost * adoption * realized;
  const annualNetOperatingValueGbp = annualGrossProductivityValueGbp - operatingCost;
  const threeYearNetValueAfterProgrammeGbp = 3 * annualNetOperatingValueGbp - programmeCost;
  const threeYearBenefitCostRatio =
    3 * annualGrossProductivityValueGbp / (programmeCost + 3 * operatingCost);
  const simplePaybackMonths = annualNetOperatingValueGbp > 0
    ? 12 * programmeCost / annualNetOperatingValueGbp
    : null;

  const unverifiedRequirements = ENTERPRISE_EVIDENCE_REQUIREMENTS
    .filter(item => evidence[item.key] !== true).map(item => item.label);
  const hasBaseline = volume > 0 && minutes > 0 && loadedHourlyCost > 0 &&
    adoption > 0 && realized > 0;
  // Conservative screening thresholds, not price validation or a commercial guarantee.
  const economicsPlausible = threeYearBenefitCostRatio >= 1.5 &&
    simplePaybackMonths !== null && simplePaybackMonths <= 24;
  const readyForIndependentProposalReview = hasBaseline &&
    economicsPlausible && unverifiedRequirements.length === 0;

  const status: EnterpriseValueResult["status"] = !hasBaseline
    ? "missing-baseline"
    : !economicsPlausible
      ? "economics-not-supported"
      : unverifiedRequirements.length > 0
        ? "needs-evidence"
        : "candidate-for-review";

  return {
    annualGrossProductivityValueGbp,
    annualNetOperatingValueGbp,
    threeYearNetValueAfterProgrammeGbp,
    threeYearBenefitCostRatio,
    simplePaybackMonths,
    readyForIndependentProposalReview,
    unverifiedRequirements,
    status,
  };
}
