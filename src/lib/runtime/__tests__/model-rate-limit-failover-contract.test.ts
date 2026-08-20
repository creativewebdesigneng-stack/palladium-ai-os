import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(here, "../model-gateway.server.ts"), "utf8");

describe("model gateway rate-limit failover contract", () => {
  it("provides a bounded alternate OpenAI model for an OpenAI 429", () => {
    expect(source).toContain('const OPENAI_MODEL_FALLBACK = "gpt-4.1-mini"');
    expect(source).toContain('provider === "openai" && model !== OPENAI_MODEL_FALLBACK');
    expect(source).toContain('provider === "openai" && error.status === 429');
  });

  it("temporarily deprioritises providers after a 429", () => {
    expect(source).toContain("const RATE_LIMIT_COOLDOWN_MS = 60_000");
    expect(source).toContain("markRateLimited(provider)");
    expect(source).toContain("providerCoolingDown(primary)");
    expect(source).toContain("configured.filter((provider) => provider !== primary)");
  });
});
