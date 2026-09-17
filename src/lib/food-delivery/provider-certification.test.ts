import { describe, expect, it } from "vitest";
import {
  assertFoodDeliveryProviderCertified,
  evaluateFoodDeliveryProviderCertification,
  type FoodDeliveryProviderCertification,
} from "./provider-certification";

function certification(overrides: Partial<FoodDeliveryProviderCertification> = {}): FoodDeliveryProviderCertification {
  return {
    providerId: "uber-eats",
    officialApiAccessVerified: true,
    credentialsVerified: true,
    scopesVerified: true,
    webhookVerificationVerified: true,
    idempotencyVerified: true,
    approvalBoundaryVerified: true,
    providerEvidenceVerified: true,
    environment: "production",
    certifiedCapabilities: ["merchant.order_read", "merchant.order_accept"],
    ...overrides,
  };
}

describe("food delivery provider certification", () => {
  it("certifies only a fully evidenced production integration", () => {
    expect(evaluateFoodDeliveryProviderCertification(certification())).toEqual({
      ready: true,
      missing: [],
      executableCapabilities: ["merchant.order_read", "merchant.order_accept"],
    });
  });

  it("does not expose executable capabilities when external API access is unverified", () => {
    const result = evaluateFoodDeliveryProviderCertification(certification({ officialApiAccessVerified: false }));
    expect(result.ready).toBe(false);
    expect(result.missing).toContain("official_api_access");
    expect(result.executableCapabilities).toEqual([]);
  });

  it("does not mistake sandbox verification for production certification", () => {
    const result = evaluateFoodDeliveryProviderCertification(certification({ environment: "sandbox" }));
    expect(result.ready).toBe(false);
    expect(result.missing).toContain("production_environment");
  });

  it("rejects a capability outside the provider-certified set", () => {
    expect(() => assertFoodDeliveryProviderCertified(certification(), "merchant.menu_write"))
      .toThrow("not provider-certified");
  });
});
