import { afterEach, describe, expect, it, vi } from "vitest";

import { EmbeddingError, resolveEmbeddingProvider } from "../embeddings.server";

const clearEmbeddingEnv = () => {
  vi.stubEnv("EMBEDDING_PROVIDER", "");
  vi.stubEnv("EMBEDDING_MODEL", "");
  vi.stubEnv("LOVABLE_API_KEY", "");
  vi.stubEnv("OPENAI_API_KEY", "");
  vi.stubEnv("OPENAI_COMPATIBLE_BASE_URL", "");
  vi.stubEnv("OPENAI_COMPATIBLE_API_KEY", "");
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("embedding provider selection", () => {
  it("preserves Lovable as the first automatic lane when it is configured", () => {
    clearEmbeddingEnv();
    vi.stubEnv("LOVABLE_API_KEY", "lovable-test");
    vi.stubEnv("OPENAI_API_KEY", "openai-test");

    expect(resolveEmbeddingProvider()).toBe("lovable");
  });

  it("falls back to direct OpenAI when the Lovable gateway is not configured", () => {
    clearEmbeddingEnv();
    vi.stubEnv("OPENAI_API_KEY", "openai-test");

    expect(resolveEmbeddingProvider()).toBe("openai");
  });

  it("honours an explicit configured provider override", () => {
    clearEmbeddingEnv();
    vi.stubEnv("LOVABLE_API_KEY", "lovable-test");
    vi.stubEnv("OPENAI_API_KEY", "openai-test");
    vi.stubEnv("EMBEDDING_PROVIDER", "openai");

    expect(resolveEmbeddingProvider()).toBe("openai");
  });

  it("requires explicit compatible-endpoint opt-in", () => {
    clearEmbeddingEnv();
    vi.stubEnv("OPENAI_COMPATIBLE_BASE_URL", "https://runtime.example/v1");

    expect(() => resolveEmbeddingProvider()).toThrow(EmbeddingError);

    vi.stubEnv("EMBEDDING_PROVIDER", "compatible");
    expect(resolveEmbeddingProvider()).toBe("compatible");
  });

  it("reports configuration degradation instead of assuming Lovable", () => {
    clearEmbeddingEnv();

    try {
      resolveEmbeddingProvider();
      throw new Error("expected provider resolution to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(EmbeddingError);
      expect((error as EmbeddingError).code).toBe("configuration");
      expect((error as Error).message).toContain("Keyword memory search remains available");
    }
  });
});
