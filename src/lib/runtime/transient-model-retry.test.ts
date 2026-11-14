import { describe, expect, it, vi } from "vitest";
import {
  isTransientModelFailure,
  runModelRoundWithBoundedRetry,
  transientRetryDelayMs,
} from "./transient-model-retry";

describe("bounded transient model retries", () => {
  it("retries only transient provider failures and stops at the bound", async () => {
    const delays: number[] = [];
    const run = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error("slow"), { retryable: true, status: 503 }))
      .mockRejectedValueOnce(Object.assign(new Error("again"), { retryable: true, status: 429 }))
      .mockRejectedValueOnce(Object.assign(new Error("still"), { retryable: true, status: 502 }));

    await expect(
      runModelRoundWithBoundedRetry({
        run,
        delay: async (ms) => {
          delays.push(ms);
        },
      }),
    ).rejects.toThrow("still");

    expect(run).toHaveBeenCalledTimes(3);
    expect(delays).toEqual([transientRetryDelayMs(1), transientRetryDelayMs(2)]);
  });

  it("returns the first successful round without delaying", async () => {
    const delay = vi.fn();
    const result = await runModelRoundWithBoundedRetry({
      run: async () => "ok",
      delay,
    });
    expect(result).toEqual({ value: "ok", attempts: 1 });
    expect(delay).not.toHaveBeenCalled();
  });

  it("does not retry cancellation, verification or explicit non-retryable errors", () => {
    expect(
      isTransientModelFailure(Object.assign(new Error("no"), { retryable: false, status: 503 })),
    ).toBe(false);
    expect(
      isTransientModelFailure(
        Object.assign(new Error("cancel"), { code: "CANCELLED", retryable: true }),
      ),
    ).toBe(false);
    expect(
      isTransientModelFailure(Object.assign(new Error("verify"), { code: "VERIFICATION_FAILED" })),
    ).toBe(false);
    expect(isTransientModelFailure(Object.assign(new Error("yes"), { status: 429 }))).toBe(true);
  });
});
