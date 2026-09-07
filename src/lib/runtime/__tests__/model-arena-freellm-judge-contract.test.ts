import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const arenaServer = readFileSync(
  fileURLToPath(new URL("../../evals/model-arena.functions.ts", import.meta.url)),
  "utf8",
);
const arenaUi = readFileSync(
  fileURLToPath(new URL("../../../screens/ModelArena.jsx", import.meta.url)),
  "utf8",
);

describe("Model Arena dedicated FreeLLM judge contract", () => {
  it("allows FreeLLM only on the judge schema and routes it through the dedicated transport", () => {
    expect(arenaServer).toContain('const contestantProviderSchema = z.enum(["openai", "anthropic", "groq", "deepseek", "lovable", "compatible"]);');
    expect(arenaServer).toContain('const judgeProviderSchema = z.enum(["openai", "anthropic", "groq", "deepseek", "lovable", "compatible", "freellm"]);');
    expect(arenaServer).toContain('data.judge.provider === "freellm"');
    expect(arenaServer).toContain("await runFreeLlmJudge({");
    expect(arenaServer).toContain("Model Arena judge transport did not preserve the exact requested evaluator identity.");
  });

  it("surfaces FreeLLM only in the independent judge selector and disables it until configured", () => {
    expect(arenaUi).toContain("const CANDIDATE_PROVIDERS = ['openai', 'anthropic', 'groq', 'deepseek', 'lovable', 'compatible'];");
    expect(arenaUi).toContain("const JUDGE_PROVIDERS = [...CANDIDATE_PROVIDERS, 'freellm'];");
    expect(arenaUi).toContain("providers={CANDIDATE_PROVIDERS}");
    expect(arenaUi).toContain("providers={JUDGE_PROVIDERS}");
    expect(arenaUi).toContain("judge.provider !== 'freellm' || configured.get('freellm') === true");
    expect(arenaUi).toContain("FREELLMAPI_BASE_URL and FREELLMAPI_MODEL");
  });
});
