import { describe, expect, it, vi } from "vitest";
import type { FoodDeliveryProviderAdapter } from "./provider-adapter";
import { executeFoodDeliveryWithEvidence } from "./execution-evidence";

const request = {
  requestId: "req-order-1",
  providerId: "uber-eats" as const,
  connectionId: "conn-1",
  capability: "consumer.order_create" as const,
  input: { basket_id: "basket-1" },
};

function adapter(overrides: Partial<FoodDeliveryProviderAdapter> = {}): FoodDeliveryProviderAdapter {
  return {
    provider: "uber-eats",
    capabilities: new Set(["consumer.order_create"]),
    execute: vi.fn().mockResolvedValue({
      provider: "uber-eats",
      capability: "consumer.order_create",
      providerResourceId: "provider-order-1",
      status: "accepted",
      evidence: { provider_order_id: "provider-order-1", received_at: "2026-09-17T18:00:00Z" },
    }),
    ...overrides,
  };
}

describe("food delivery verified execution", () => {
  it("returns a verified execution only with provider evidence", async () => {
    const result = await executeFoodDeliveryWithEvidence({ adapter: adapter(), request });
    expect(result.providerResourceId).toBe("provider-order-1");
    expect(result.status).toBe("accepted");
    expect(result.evidence).toHaveProperty("provider_order_id", "provider-order-1");
  });

  it("fails closed before execution when the capability is not advertised", async () => {
    const execute = vi.fn();
    const provider = adapter({ capabilities: new Set(), execute });
    await expect(executeFoodDeliveryWithEvidence({ adapter: provider, request })).rejects.toThrow("does not advertise");
    expect(execute).not.toHaveBeenCalled();
  });

  it("rejects empty success evidence", async () => {
    const provider = adapter({
      execute: vi.fn().mockResolvedValue({
        provider: "uber-eats",
        capability: "consumer.order_create",
        status: "accepted",
        evidence: {},
      }),
    });
    await expect(executeFoodDeliveryWithEvidence({ adapter: provider, request })).rejects.toThrow("empty success evidence");
  });

  it("rejects mismatched provider responses", async () => {
    const provider = adapter({
      execute: vi.fn().mockResolvedValue({
        provider: "deliveroo",
        capability: "consumer.order_create",
        status: "accepted",
        evidence: { order_id: "wrong-provider-order" },
      }),
    });
    await expect(executeFoodDeliveryWithEvidence({ adapter: provider, request })).rejects.toThrow("does not match");
  });
});
