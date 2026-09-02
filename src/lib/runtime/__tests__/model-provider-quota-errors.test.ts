import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProviderError, runChat } from "../model-gateway.base";

const args = {
  provider: "openai" as const,
  model: "gpt-4.1-mini",
  messages: [{ role: "user" as const, content: "Reply OK." }],
  maxTokens: 4,
};

beforeEach(() => {
  vi.stubEnv("OPENAI_API_KEY", "test-only-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("provider quota error classification", () => {
  it("treats OpenAI insufficient quota as non-retryable credit exhaustion", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { type: "insufficient_quota", code: "credit_balance_exhausted" },
        }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const error = await runChat(args).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ProviderError);
    expect(error).toMatchObject({ status: 402, retryable: false });
    expect((error as Error).message).toContain("credits or quota are exhausted");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps ordinary 429 rate limiting retryable", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { type: "rate_limit_error", code: "rate_limit_exceeded" },
        }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const error = await runChat(args).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ProviderError);
    expect(error).toMatchObject({ status: 429, retryable: true });
    expect((error as Error).message).toContain("rate limiting");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
