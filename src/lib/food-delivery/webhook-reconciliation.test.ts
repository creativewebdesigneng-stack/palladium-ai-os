import { describe, expect, it, vi } from "vitest";
import type { FoodDeliveryWebhookAdapter } from "./webhooks";
import { reconcileFoodDeliveryWebhook } from "./webhook-reconciliation";

const verification = {
  provider: "uber-eats" as const,
  rawBody: "event-body",
  headers: { "x-provider-signature": "test-signature" },
  secret: "test-secret",
};

function adapter(): FoodDeliveryWebhookAdapter {
  return {
    provider: "uber-eats",
    verify: vi.fn().mockResolvedValue({ verified: true, dedupeKey: "food-delivery:uber-eats:evt-1" }),
    normalize: vi.fn().mockReturnValue({
      provider: "uber-eats",
      eventId: "evt-1",
      eventType: "order.updated",
      resourceId: "order-1",
      payload: { status: "accepted" },
    }),
  };
}

function receipts(claimed = true) {
  return {
    claim: vi.fn().mockResolvedValue(claimed),
    markProcessed: vi.fn().mockResolvedValue(undefined),
    markFailed: vi.fn().mockResolvedValue(undefined),
  };
}

describe("food delivery webhook reconciliation", () => {
  it("claims and reconciles a verified webhook once", async () => {
    const provider = adapter();
    const store = receipts();
    const reconcile = vi.fn().mockResolvedValue(undefined);
    const result = await reconcileFoodDeliveryWebhook({ adapter: provider, verification, receipts: store, reconcile });
    expect(result.status).toBe("processed");
    expect(store.claim).toHaveBeenCalledTimes(1);
    expect(reconcile).toHaveBeenCalledTimes(1);
    expect(store.markProcessed).toHaveBeenCalledWith("food-delivery:uber-eats:evt-1");
  });

  it("rejects failed verification before normalization", async () => {
    const provider = adapter();
    provider.verify = vi.fn().mockResolvedValue({ verified: false, reason: "verification failed" });
    const store = receipts();
    const reconcile = vi.fn();
    const result = await reconcileFoodDeliveryWebhook({ adapter: provider, verification, receipts: store, reconcile });
    expect(result).toEqual({ status: "rejected", reason: "verification failed" });
    expect(provider.normalize).not.toHaveBeenCalled();
    expect(store.claim).not.toHaveBeenCalled();
    expect(reconcile).not.toHaveBeenCalled();
  });

  it("does not reconcile duplicate provider retries", async () => {
    const store = receipts(false);
    const reconcile = vi.fn();
    const result = await reconcileFoodDeliveryWebhook({ adapter: adapter(), verification, receipts: store, reconcile });
    expect(result.status).toBe("duplicate");
    expect(reconcile).not.toHaveBeenCalled();
  });

  it("records reconciliation failures before rethrowing", async () => {
    const store = receipts();
    const reconcile = vi.fn().mockRejectedValue(new Error("state transition failed"));
    await expect(reconcileFoodDeliveryWebhook({ adapter: adapter(), verification, receipts: store, reconcile })).rejects.toThrow("state transition failed");
    expect(store.markFailed).toHaveBeenCalledWith("food-delivery:uber-eats:evt-1", "state transition failed");
  });
});
