import { describe, expect, it } from "vitest";
import { BLACKSTAR_ENTERPRISE_OFFERS } from "../high-value-offers";
import { ENTERPRISE_EVIDENCE_REQUIREMENTS, evaluateEnterpriseValueCase } from "../value-case";
import type { EnterpriseValueEvidence, EnterpriseValueInputs } from "../value-case";

const checked: EnterpriseValueEvidence = {
  customerBaselineVerified: true,
  savingsPilotVerified: true,
  customerSponsorConfirmed: true,
  systemAndDataAccessReviewed: true,
  securityPrivacyReviewed: true,
  deliveryCapacityConfirmed: true,
};
const baseline: EnterpriseValueInputs = {
  monthlyWorkflowVolume: 10000,
  minutesSavedPerWorkflow: 5,
  loadedHourlyCostGbp: 35,
  adoptionPercent: 75,
  realizedSavingsPercent: 80,
  annualOperatingCostGbp: 120000,
};
const hundredK = BLACKSTAR_ENTERPRISE_OFFERS.find(offer => offer.priceGbp === 100000)!;
const million = BLACKSTAR_ENTERPRISE_OFFERS.find(offer => offer.priceGbp === 1000000)!;

describe("Blackstar buyer-specific enterprise value model", () => {
  it("calculates auditable productivity and fully-loaded three-year economics", () => {
    const result = evaluateEnterpriseValueCase(hundredK, baseline, checked);
    expect(result.annualGrossProductivityValueGbp).toBeCloseTo(210000);
    expect(result.annualNetOperatingValueGbp).toBeCloseTo(90000);
    expect(result.threeYearNetValueAfterProgrammeGbp).toBeCloseTo(170000);
    expect(result.threeYearBenefitCostRatio).toBeCloseTo(630000 / 460000);
    expect(result.simplePaybackMonths).toBeCloseTo(100000 / 90000 * 12);
    expect(result.status).toBe("economics-not-supported");
    expect(result.readyForIndependentProposalReview).toBe(false);
  });

  it("never equates a larger fee to validated buyer value", () => {
    const result = evaluateEnterpriseValueCase(million, baseline, checked);
    expect(result.status).toBe("economics-not-supported");
    expect(result.threeYearNetValueAfterProgrammeGbp).toBeLessThan(0);
  });

  it("shows no sale or claimed return when buyer baselines are missing", () => {
    const result = evaluateEnterpriseValueCase(hundredK, {
      monthlyWorkflowVolume: 0,
      minutesSavedPerWorkflow: 0,
      loadedHourlyCostGbp: 0,
      adoptionPercent: 0,
      realizedSavingsPercent: 0,
      annualOperatingCostGbp: 0,
    }, checked);
    expect(result.status).toBe("missing-baseline");
    expect(result.readyForIndependentProposalReview).toBe(false);
    expect(result.simplePaybackMonths).toBeNull();
  });

  it("requires every evidence item even when hypothetical economics are large", () => {
    const high: EnterpriseValueInputs = { ...baseline, monthlyWorkflowVolume: 100000 };
    const incomplete: EnterpriseValueEvidence = { ...checked, securityPrivacyReviewed: false };
    const result = evaluateEnterpriseValueCase(hundredK, high, incomplete);
    expect(result.status).toBe("needs-evidence");
    expect(result.unverifiedRequirements).toContain(
      "Security, privacy and legal review completed where required",
    );
    expect(result.readyForIndependentProposalReview).toBe(false);
    expect(ENTERPRISE_EVIDENCE_REQUIREMENTS).toHaveLength(6);
    const withEvidence = evaluateEnterpriseValueCase(hundredK, high, checked);
    expect(withEvidence.status).toBe("candidate-for-review");
    expect(withEvidence.readyForIndependentProposalReview).toBe(true);
  });

  it("rejects invalid, impossible and non-finite figures", () => {
    for (const value of [-1, Number.POSITIVE_INFINITY, Number.NaN, 101]) {
      expect(() => evaluateEnterpriseValueCase(hundredK, {
        ...baseline, adoptionPercent: value,
      }, checked)).toThrow(RangeError);
    }
    expect(() => evaluateEnterpriseValueCase(hundredK, {
      ...baseline, minutesSavedPerWorkflow: 1441,
    }, checked)).toThrow(RangeError);
    expect(() => evaluateEnterpriseValueCase(hundredK, {
      ...baseline, annualOperatingCostGbp: -1,
    }, checked)).toThrow(RangeError);
  });

  it("does not claim payback when annual operating value is non-positive", () => {
    const result = evaluateEnterpriseValueCase(hundredK, {
      ...baseline, annualOperatingCostGbp: 9999999,
    }, checked);
    expect(result.simplePaybackMonths).toBeNull();
    expect(result.threeYearNetValueAfterProgrammeGbp).toBeLessThan(0);
    expect(result.readyForIndependentProposalReview).toBe(false);
  });
});
