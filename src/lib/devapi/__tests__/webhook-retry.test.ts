import { describe, expect, it } from "vitest";
import { webhookRetryDelayMs } from "../webhooks.server";

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
});
