import { describe, expect, it } from "vitest";
import { capabilityRequiresApproval } from "../policy";
import { providersForCountry } from "../registry";

describe("food delivery provider registry", () => {
  it("filters providers by declared country coverage", () => {
    const gb = providersForCountry("GB").map((provider) => provider.id);
    expect(gb).toContain("uber_eats");
    expect(gb).toContain("deliveroo");
    expect(gb).toContain("just_eat");
    expect(gb).not.toContain("swiggy");
  });

  it("does not pretend an unknown country has provider coverage", () => {
    expect(providersForCountry("ZZ")).toEqual([]);
  });
});

describe("food delivery approval policy", () => {
  it("keeps discovery read-only while requiring approval for spending and operational writes", () => {
    expect(capabilityRequiresApproval("consumer.restaurant_search")).toBe(false);
    expect(capabilityRequiresApproval("consumer.menu_read")).toBe(false);
    expect(capabilityRequiresApproval("consumer.order_create")).toBe(true);
    expect(capabilityRequiresApproval("consumer.order_cancel")).toBe(true);
    expect(capabilityRequiresApproval("merchant.order_accept")).toBe(true);
    expect(capabilityRequiresApproval("merchant.menu_write")).toBe(true);
    expect(capabilityRequiresApproval("delivery.create")).toBe(true);
  });
});
