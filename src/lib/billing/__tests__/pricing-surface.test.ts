import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("billing surfaces match the paid catalogue", () => {
  it("does not advertise the retired £20 Builder price or a free Explorer checkout", () => {
    const billing = read("../../../../docs/BILLING.md");
    const surfaces = [
      billing,
      read("../../permissions.js"),
      read("../../../components/UpgradeModal.jsx"),
      read("../../../components/billing/SubscriptionActions.jsx"),
      read("../../../components/billing/PlansGrid.jsx"),
      read("../../../components/billing/EnterpriseSection.jsx"),
    ].join("\n");

    expect(surfaces).not.toContain("£20");
    expect(surfaces).not.toContain("£3,000");
    expect(surfaces).not.toContain("Contact Sales");
    expect(surfaces).not.toContain("99.99%");
    expect(surfaces).toContain("£150");
    expect(billing).toContain("£3,500");
    expect(billing).toContain("explorer_monthly");
    expect(billing).toContain("LEGACY_FREE_EXPLORER_PRICE_KEYS");
  });
});
