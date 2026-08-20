import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(here, "../model-gateway.server.ts"), "utf8");

describe("model gateway rate-limit failover contract", () => {
  it("provides an alternate OpenAI model for a rate-limited primary model", () => {
    expect(source).toContain('const OPENAI_MODEL_FALLBACK = "gpt-4.1-mini"');
    expect(source).toContain('provider === "openai" && model !== OPENAI_MODEL_FALLBACK');
    expect(source).toContain("error.status === 429 || error.status >= 500");
  });

  it("temporarily deprioritises providers after a 429", () => {
    expect(source).toContain("const RATE_LIMIT_COOLDOWN_MS = 60_000");
    expect(source).toContain("markRateLimited(provider)");
    expect(source).toContain("return [...configured.filter((provider) => provider !== primary), primary]");
  });
});
