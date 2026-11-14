import { afterEach, describe, expect, it, vi } from "vitest";
import { embedTexts, EMBEDDING_DIMENSIONS, embeddingProviderChain } from "../embeddings.server";

const vector = () =>
  new Response(
    JSON.stringify({ data: [{ index: 0, embedding: Array(EMBEDDING_DIMENSIONS).fill(0.2) }] }),
  );

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("embedding provider fallback", () => {
  it("tries OpenAI after a Lovable or Gemini-style quota failure in automatic mode", async () => {
    vi.stubEnv("EMBEDDING_PROVIDER", "auto");
    vi.stubEnv("LOVABLE_API_KEY", "lovable-test");
    vi.stubEnv("OPENAI_API_KEY", "openai-test");
    const request = vi.fn(async (url: string) => {
      if (String(url).includes("lovable")) {
        return new Response(
          JSON.stringify({
            error: {
              status: "RESOURCE_EXHAUSTED",
              message:
                "You exceeded your current quota, please check your plan and billing details. private prompt",
            },
          }),
          { status: 429 },
        );
      }
      return vector();
    });
    vi.stubGlobal("fetch", request);
    await expect(embedTexts(["synthetic memory"])).resolves.toMatchObject({ provider: "openai" });
    expect(request).toHaveBeenCalledTimes(2);
    expect(embeddingProviderChain()).toEqual(["lovable", "openai"]);
  });

  it("does not leave an explicitly selected provider after quota failure", async () => {
    vi.stubEnv("EMBEDDING_PROVIDER", "openai");
    vi.stubEnv("LOVABLE_API_KEY", "lovable-test");
    vi.stubEnv("OPENAI_API_KEY", "openai-test");
    const request = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ error: { code: "insufficient_quota", message: "private" } }),
          { status: 429 },
        ),
    );
    vi.stubGlobal("fetch", request);
    await expect(embedTexts(["synthetic memory"])).rejects.toMatchObject({
      code: "quota",
      retryable: false,
    });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("classifies a refused connection and can continue to the next configured provider", async () => {
    vi.useFakeTimers();
    vi.stubEnv("EMBEDDING_PROVIDER", "auto");
    vi.stubEnv("LOVABLE_API_KEY", "lovable-test");
    vi.stubEnv("OPENAI_API_KEY", "openai-test");
    const request = vi.fn(async (url: string) => {
      if (String(url).includes("lovable")) {
        const error = new TypeError("fetch failed");
        Object.assign(error, { cause: { code: "ECONNREFUSED" } });
        throw error;
      }
      return vector();
    });
    vi.stubGlobal("fetch", request);
    const pending = embedTexts(["synthetic memory"]);
    await vi.advanceTimersByTimeAsync(5_000);
    await expect(pending).resolves.toMatchObject({ provider: "openai" });
    expect(request.mock.calls.some(([url]) => String(url).includes("api.openai.com"))).toBe(true);
  });

  it("keeps a compatible embedding endpoint out of automatic mode until it is opted in", () => {
    vi.stubEnv("EMBEDDING_PROVIDER", "");
    vi.stubEnv("OPENAI_COMPATIBLE_BASE_URL", "http://127.0.0.1:11434/v1");
    vi.stubEnv("OPENAI_API_KEY", "openai-test");
    expect(embeddingProviderChain()).toEqual(["openai"]);
    vi.stubEnv("EMBEDDING_COMPATIBLE_FALLBACK", "true");
    expect(embeddingProviderChain()).toEqual(["openai", "compatible"]);
  });
});
