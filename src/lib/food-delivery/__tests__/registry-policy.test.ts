import { describe, expect, it } from "vitest";
import { capabilityRequiresApproval } from "../policy";
import { providersForRegion, type FoodDeliveryProviderManifest } from "../index";

const TEST_PROVIDERS: readonly FoodDeliveryProviderManifest[] = [
  {
    id: "uber-eats",
    displayName: "Uber Eats",
    environment: "sandbox",
    capabilities: [],
    countryCodes: ["GB", "US"],
    requiresPartnerApproval: true,
    webhookSupport: true,
    productionReady: false,
  },
  {
    id: "deliveroo",
    displayName: "Deliveroo",
    environment: "sandbox",
    capabilities: [],
    countryCodes: ["GB"],
    requiresPartnerApproval: true,
    webhookSupport: true,
    productionReady: false,
  },
  {
    id: "just-eat",
    displayName: "Just Eat",
    environment: "sandbox",
    capabilities: [],
    countryCodes: ["GB"],
    requiresPartnerApproval: true,
    webhookSupport: false,
    productionReady: false,
  },
  {
    id: "swiggy",
    displayName: "Swiggy",
    environment: "sandbox",
    capabilities: [],
    countryCodes: ["IN"],
    requiresPartnerApproval: true,
    webhookSupport: false,
    productionReady: false,
  },
];

describe("food delivery provider registry", () => {
  it("filters providers by declared country coverage", () => {
    const gb = providersForRegion({ countryCode: "GB" }, TEST_PROVIDERS).map((provider) => provider.id);
    expect(gb).toContain("uber-eats");
    expect(gb).toContain("deliveroo");
    expect(gb).toContain("just-eat");
    expect(gb).not.toContain("swiggy");
  });

  it("does not pretend an unknown country has provider coverage", () => {
    expect(providersForRegion({ countryCode: "ZZ" }, TEST_PROVIDERS)).toEqual([]);
  });
});

describe("food delivery approval policy", () => {
  it("keeps discovery read-only while requiring approval for spending and operational writes", () => {
    expect(capabilityRequiresApproval("consumer.restaurant_search")).toBe(false);
    expect(capabilityRequiresApproval("consumer.menu_read")).toBe(false);
    expect(capabilityRequiresApproval("consumer.order_create")).toBe(true);
    expect(capabilityRequiresApproval("merchant.order_accept")).toBe(true);
    expect(capabilityRequiresApproval("merchant.menu_write")).toBe(true);
    expect(capabilityRequiresApproval("delivery.create")).toBe(true);
  });
});
