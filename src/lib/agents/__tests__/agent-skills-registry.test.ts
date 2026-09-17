import { describe, expect, it } from "vitest";
import {
  effectiveAgentSkillsRegistry,
  normaliseAgentSkillsRegistry,
  registrySearchText,
  registrySelectionBonus,
  renderAgentSkillsRegistryPrompt,
} from "../agent-skills-registry";

describe("Universal Skills Registry", () => {
  it("normalises bounded capability metadata and evidence", () => {
    const registry = normaliseAgentSkillsRegistry({
      skills: [
        {
          name: " TypeScript ",
          proficiency: 2,
          aliases: ["TS", "typescript"],
          tools: ["github"],
          connectors: ["GitHub"],
          permissions: ["repo:read"],
          certifications: [{ name: "Blackstar verified task", status: "verified" }],
          evidence: [{ kind: "verified_task", verified: true, score: 2 }],
        },
      ],
      tools: ["github"],
      connectors: ["MCP", "GitHub"],
      permissions: ["repo:read"],
      models: ["openai:gpt-5.6"],
      cost: { currency: "gbp", estimated_cost_per_run_micros: 1200.4 },
      previous_experience: ["Built verified production releases"],
      learnable_skills: ["Rust"],
    });

    expect(registry?.version).toBe(1);
    expect(registry?.skills[0]?.name).toBe("TypeScript");
    expect(registry?.skills[0]?.proficiency).toBe(1);
    expect(registry?.skills[0]?.evidence?.[0]?.score).toBe(1);
    expect(registry?.cost).toEqual({ currency: "GBP", estimated_cost_per_run_micros: 1200 });
  });

  it("upgrades legacy agents into an effective registry without a migration", () => {
    const registry = effectiveAgentSkillsRegistry({
      legacySkills: ["research", "evidence verification"],
      allowedTools: ["web_search", "browser"],
      modelProvider: "blackstar",
      model: "astra",
    });

    expect(registry?.skills.map((skill) => skill.name)).toEqual(["research", "evidence verification"]);
    expect(registry?.tools).toEqual(["web_search", "browser"]);
    expect(registry?.models).toEqual(["blackstar:astra"]);
    expect(registrySearchText(registry)).toContain("evidence verification");
  });

  it("uses verified skill evidence as a bounded routing bonus", () => {
    const verified = normaliseAgentSkillsRegistry({
      skills: [
        {
          name: "competitor research",
          proficiency: 0.95,
          evidence: [{ kind: "verified_task", verified: true, score: 0.98 }],
          certifications: [{ name: "Research certification", status: "verified" }],
        },
      ],
    });
    const unrelated = normaliseAgentSkillsRegistry({
      skills: [{ name: "typescript", proficiency: 1 }],
    });

    expect(registrySelectionBonus("research competitors", verified)).toBeGreaterThan(0);
    expect(registrySelectionBonus("research competitors", verified)).toBeLessThanOrEqual(10);
    expect(registrySelectionBonus("research competitors", unrelated)).toBe(0);
  });

  it("makes capability metadata non-authoritative in the runtime prompt", () => {
    const registry = normaliseAgentSkillsRegistry({
      skills: [{ name: "commerce automation", proficiency: 0.8 }],
      connectors: ["Shopify", "Etsy", "MCP"],
      permissions: ["orders:write"],
      learnable_skills: ["inventory forecasting"],
    });
    const prompt = renderAgentSkillsRegistryPrompt(registry);

    expect(prompt).toContain("UNIVERSAL SKILLS REGISTRY");
    expect(prompt).toContain("Shopify, Etsy, MCP");
    expect(prompt).toContain("never grants");
  });
});
