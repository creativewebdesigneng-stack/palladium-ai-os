import { describe, expect, it, vi } from "vitest";
import type { FoodDeliveryActionRequest, FoodDeliveryProviderManifest } from "./contracts";
import type { FoodDeliveryProviderAdapter } from "./provider-adapter";
import { resolveFoodDeliveryProviderAvailability } from "./availability";
import { executeFoodDeliveryRuntimeAction } from "./runtime-gate";

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

function availability() {
  return resolveFoodDeliveryProviderAvailability({
    region: { countryCode: "GB" },
    providers: [provider],
    connections: [{
      id: "conn-1",
      providerId: "uber-eats",
      status: "connected",
      environment: "production",
      grantedCapabilities: provider.capabilities,
    }],
  })[0]!;
}

function adapter(execute: FoodDeliveryProviderAdapter["execute"]): FoodDeliveryProviderAdapter {
  return { providerId: "uber-eats", capabilities: provider.capabilities, execute };
}

describe("food delivery runtime gate", () => {
  it("does not call a provider before consequential approval", async () => {
    const execute = vi.fn(async () => ({
      providerId: "uber-eats" as const,
      capability: "consumer.order_create" as const,
      status: "accepted" as const,
      evidence: { providerOrderId: "order-1" },
    }));
    const request: FoodDeliveryActionRequest = {
      requestId: "req-1",
      providerId: "uber-eats",
      connectionId: "conn-1",
      capability: "consumer.order_create",
      input: { basket: "basket-1" },
    };

    const result = await executeFoodDeliveryRuntimeAction({ request, availability: availability(), adapter: adapter(execute) });
    expect(result.status).toBe("approval_required");
    expect(execute).not.toHaveBeenCalled();
  });

  it("executes a granted read-only capability without consequential approval", async () => {
    const execute = vi.fn(async () => ({
      providerId: "uber-eats" as const,
      capability: "consumer.menu_read" as const,
      status: "completed" as const,
      evidence: { menuVersion: "v1" },
    }));
    const request: FoodDeliveryActionRequest = {
      requestId: "req-2",
      providerId: "uber-eats",
      connectionId: "conn-1",
      capability: "consumer.menu_read",
      input: { restaurantId: "restaurant-1" },
    };

    const result = await executeFoodDeliveryRuntimeAction({ request, availability: availability(), adapter: adapter(execute) });
    expect(result.status).toBe("executed");
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("executes a consequential capability only after approval is supplied", async () => {
    const execute = vi.fn(async () => ({
      providerId: "uber-eats" as const,
      capability: "consumer.order_create" as const,
      status: "accepted" as const,
      evidence: { providerOrderId: "order-2" },
    }));
    const request: FoodDeliveryActionRequest = {
      requestId: "req-3",
      providerId: "uber-eats",
      connectionId: "conn-1",
      capability: "consumer.order_create",
      input: { basket: "basket-2" },
    };

    const result = await executeFoodDeliveryRuntimeAction({ request, availability: availability(), adapter: adapter(execute), approved: true });
    expect(result.status).toBe("executed");
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("rejects a mismatched connection before provider execution", async () => {
    const execute = vi.fn();
    const request: FoodDeliveryActionRequest = {
      requestId: "req-4",
      providerId: "uber-eats",
      connectionId: "other-connection",
      capability: "consumer.menu_read",
      input: {},
    };

    await expect(executeFoodDeliveryRuntimeAction({ request, availability: availability(), adapter: adapter(execute) }))
      .rejects.toThrow("requested connection");
    expect(execute).not.toHaveBeenCalled();
  });
});
