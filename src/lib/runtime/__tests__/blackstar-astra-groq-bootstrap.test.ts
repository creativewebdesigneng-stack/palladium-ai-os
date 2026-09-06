import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isAstraGroqBootstrapRequest } from "../model-gateway.server";

const ORIGINAL_ENV = { ...process.env };

describe("Blackstar Astra Groq bootstrap transport", () => {
  beforeEach(() => {
    delete process.env["OPENAI_COMPATIBLE_BASE_URL"];
    delete process.env["OPENAI_COMPATIBLE_API_KEY"];
    delete process.env["GROQ_API_KEY"];
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("activates only for the exact Astra bootstrap identity when Groq is configured", () => {
    process.env["GROQ_API_KEY"] = "test-groq-key";

    expect(isAstraGroqBootstrapRequest("compatible", "qwen/qwen3.8-27b")).toBe(true);
    expect(isAstraGroqBootstrapRequest("compatible", "openai/gpt-oss-20b")).toBe(false);
    expect(isAstraGroqBootstrapRequest("groq", "qwen/qwen3.8-27b")).toBe(false);
  });

  it("never overrides a dedicated Blackstar-compatible endpoint", () => {
    process.env["GROQ_API_KEY"] = "test-groq-key";
    process.env["OPENAI_COMPATIBLE_BASE_URL"] = "https://astra.example/v1";

    expect(isAstraGroqBootstrapRequest("compatible", "qwen/qwen3.8-27b")).toBe(false);
  });

  it("fails closed when Groq credentials are absent", () => {
    expect(isAstraGroqBootstrapRequest("compatible", "qwen/qwen3.8-27b")).toBe(false);
  });
});
