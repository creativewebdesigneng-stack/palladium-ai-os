import { afterEach, describe, expect, it } from "vitest";
import { normaliseProvider, resolveModel } from "../model-gateway.server";

const originalGroqKey = process.env.GROQ_API_KEY;
const originalOpenAiKey = process.env.OPENAI_API_KEY;
const originalAnthropicKey = process.env.ANTHROPIC_API_KEY;

afterEach(() => {
  if (originalGroqKey === undefined) delete process.env.GROQ_API_KEY;
  else process.env.GROQ_API_KEY = originalGroqKey;

  if (originalOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalOpenAiKey;

  if (originalAnthropicKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
});

describe("Groq model gateway", () => {
  it("recognises Groq as a first-class provider", () => {
    expect(normaliseProvider("groq")).toBe("groq");
  });

  it("uses GPT-OSS 120B as the Groq default model", () => {
    expect(resolveModel("groq", null)).toBe("openai/gpt-oss-120b");
  });

  it("prefers Groq when GROQ_API_KEY is configured and no provider is selected", () => {
    process.env.GROQ_API_KEY = "test-groq-key";
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.ANTHROPIC_API_KEY = "test-anthropic-key";

    expect(normaliseProvider()).toBe("groq");
  });
});
