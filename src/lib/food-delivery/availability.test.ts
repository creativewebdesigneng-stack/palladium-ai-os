import { describe, expect, it } from "vitest";
import type { FoodDeliveryConnection, FoodDeliveryProviderManifest } from "./contracts";
import { assertFoodDeliveryExecutionAvailable, resolveFoodDeliveryProviderAvailability } from "./availability";

const provider: FoodDeliveryProviderManifest = {
  id: "uber-eats",
  displayName: "Uber Eats",
  environment: "production",
  capabilities: ["consumer.menu_read", "consumer.order_create"],
  countryCodes: ["GB"],
  requiresPartnerApproval: true,
  webhookSupport: true,
  productionReady: true,
};

const connection: FoodDeliveryConnection = {
  id: "conn-1",
  providerId: "uber-eats",
  status: "connected",
  environment: "production",
  grantedCapabilities: ["consumer.menu_read"],
};

describe("food delivery provider availability", () => {
  it("exposes only connected and granted capabilities", () => {
    const [availability] = resolveFoodDeliveryProviderAvailability({
      region: { countryCode: "gb" },
      providers: [provider],
      connections: [connection],
    });
    expect(availability?.state).toBe("ready");
    expect(availability?.executableCapabilities).toEqual(["consumer.menu_read"]);
    expect(() => assertFoodDeliveryExecutionAvailable(availability!, "consumer.menu_read")).not.toThrow();
    expect(() => assertFoodDeliveryExecutionAvailable(availability!, "consumer.order_create")).toThrow("not granted");
  });

  it("fails closed when provider coverage is not explicitly configured", () => {
    const [availability] = resolveFoodDeliveryProviderAvailability({
      region: { countryCode: "GB" },
      providers: [{ ...provider, countryCodes: [] }],
      connections: [connection],
    });
    expect(availability?.state).toBe("unsupported_region");
    expect(availability?.executableCapabilities).toEqual([]);
  });

  it("requires a real matching provider connection", () => {
    const [availability] = resolveFoodDeliveryProviderAvailability({
      region: { countryCode: "GB" },
      providers: [provider],
      connections: [],
    });
    expect(availability?.state).toBe("needs_connection");
    expect(() => assertFoodDeliveryExecutionAvailable(availability!, "consumer.menu_read")).toThrow("not connected");
  });

  it("keeps connected non-production providers in sandbox state", () => {
    const sandboxProvider = { ...provider, environment: "sandbox" as const, productionReady: false };
    const sandboxConnection = { ...connection, environment: "sandbox" as const };
    const [availability] = resolveFoodDeliveryProviderAvailability({
      region: { countryCode: "GB" },
      providers: [sandboxProvider],
      connections: [sandboxConnection],
    });
    expect(availability?.state).toBe("sandbox");
    expect(availability?.productionReady).toBe(false);
  });
});
