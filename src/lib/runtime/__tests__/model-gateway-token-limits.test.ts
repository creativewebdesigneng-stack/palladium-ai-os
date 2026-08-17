import { describe, expect, it } from "vitest";

import { chatBody, type RunArgs } from "@/lib/runtime/model-gateway.server";

function args(overrides: Partial<RunArgs>): RunArgs {
  return {
    provider: "openai",
    model: "gpt-5-mini",
    messages: [{ role: "user", content: "ping" }],
    maxTokens: 128,
    ...overrides,
  };
}

describe("chat request token limit field", () => {
  it("sends max_completion_tokens for OpenAI GPT-5 family models", () => {
    for (const model of ["gpt-5", "gpt-5-mini", "gpt-5-nano", "GPT-5.4-mini"]) {
      const body = chatBody(args({ model }), false) as Record<string, unknown>;
      expect(body["max_completion_tokens"], model).toBe(128);
      expect(body["max_tokens"], model).toBeUndefined();
    }
  });

  it("keeps max_tokens for non-GPT-5 OpenAI models", () => {
    const body = chatBody(args({ model: "gpt-4.1-mini" }), false) as Record<string, unknown>;
    expect(body["max_tokens"]).toBe(128);
    expect(body["max_completion_tokens"]).toBeUndefined();
  });

  it("keeps max_tokens for the Lovable gateway and compatible providers", () => {
    const lovable = chatBody(
      args({ provider: "lovable", model: "google/gemini-3-flash-preview" }),
      false,
    ) as Record<string, unknown>;
    expect(lovable["max_tokens"]).toBe(128);
    expect(lovable["max_completion_tokens"]).toBeUndefined();

    const compatible = chatBody(
      args({ provider: "compatible", model: "local-model" }),
      false,
    ) as Record<string, unknown>;
    expect(compatible["max_tokens"]).toBe(128);
    expect(compatible["max_completion_tokens"]).toBeUndefined();
  });

  it("omits both fields when no cap is requested", () => {
    const body = chatBody(args({ maxTokens: null }), false) as Record<string, unknown>;
    expect(body["max_tokens"]).toBeUndefined();
    expect(body["max_completion_tokens"]).toBeUndefined();
  });
});
