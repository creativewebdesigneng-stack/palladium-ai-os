import { describe, expect, it } from "vitest";
import { skillScriptFingerprint } from "@/lib/runtime/agent-skills/skill-script-approval.server";

const recipe = {
  version: 1 as const,
  steps: [
    { tool: "web_search", input: { query: "{{topic}}", limit: 3 } },
    { tool: "memory_write", input: { key: "research", value: "complete" } },
  ],
};

describe("skill script approval fingerprint", () => {
  it("is stable across object key ordering", () => {
    const first = skillScriptFingerprint({
      skillId: "skill-1",
      skillVersion: "1.2.3",
      script: "research.json",
      recipe,
      params: { topic: "palladium", limit: 3 },
    });
    const second = skillScriptFingerprint({
      skillId: "skill-1",
      skillVersion: "1.2.3",
      script: "research.json",
      recipe,
      params: { limit: 3, topic: "palladium" },
    });
    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });

  it("changes when version, recipe, script, or parameters change", () => {
    const baseline = skillScriptFingerprint({
      skillId: "skill-1",
      skillVersion: "1.2.3",
      script: "research.json",
      recipe,
      params: { topic: "palladium" },
    });
    const variants = [
      skillScriptFingerprint({ skillId: "skill-1", skillVersion: "1.2.4", script: "research.json", recipe, params: { topic: "palladium" } }),
      skillScriptFingerprint({ skillId: "skill-1", skillVersion: "1.2.3", script: "other.json", recipe, params: { topic: "palladium" } }),
      skillScriptFingerprint({ skillId: "skill-1", skillVersion: "1.2.3", script: "research.json", recipe, params: { topic: "atomic" } }),
      skillScriptFingerprint({
        skillId: "skill-1",
        skillVersion: "1.2.3",
        script: "research.json",
        recipe: { version: 1, steps: [{ tool: "web_search", input: { query: "changed" } }] },
        params: { topic: "palladium" },
      }),
    ];
    for (const fingerprint of variants) expect(fingerprint).not.toBe(baseline);
  });
});
