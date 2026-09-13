import { describe, expect, it } from "vitest";
import {
  processDueWebhookRetriesWithAdmin,
  webhookRetryDelayMs,
} from "../webhooks.server";

describe("webhook retry schedule", () => {
  it("backs off progressively after each failed delivery attempt", () => {
    expect(webhookRetryDelayMs(1)).toBe(60_000);
    expect(webhookRetryDelayMs(2)).toBe(5 * 60_000);
    expect(webhookRetryDelayMs(3)).toBe(30 * 60_000);
    expect(webhookRetryDelayMs(4)).toBe(2 * 60 * 60_000);
  });

  it("stops scheduling after the fifth completed attempt", () => {
    expect(webhookRetryDelayMs(5)).toBeNull();
    expect(webhookRetryDelayMs(6)).toBeNull();
  });

  it("never creates a negative or zero retry delay for a failed first attempt", () => {
    expect(webhookRetryDelayMs(0)).toBe(60_000);
    expect(webhookRetryDelayMs(-4)).toBe(60_000);
  });

  it("fails closed when the retry queue database read fails without exposing the upstream message", async () => {
    const chain: Record<string, any> = {};
    for (const method of ["select", "eq", "is", "not", "lte", "order"]) {
      chain[method] = () => chain;
    }
    chain["limit"] = async () => ({
      data: null,
      error: {
        code: "PGRST301",
        message: "Invalid API key with sensitive upstream context",
      },
    });
    const admin = { from: () => chain };

    let thrown: unknown;
    try {
      await processDueWebhookRetriesWithAdmin(admin, 10);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toBe("Webhook retry queue read failed (PGRST301)");
    expect((thrown as Error).message).not.toContain("Invalid API key");
    expect((thrown as Error).message).not.toContain("sensitive upstream context");
  });
});
