import { describe, expect, it } from "vitest";
import {
  compileAgentSystemPrompt,
  hasAgentSpecV2,
  normaliseOperatingProfile,
  renderOperatingProfilePrompt,
} from "../agent-spec";

describe("Agent Spec v2", () => {
  it("normalises a bounded operating profile", () => {
    const profile = normaliseOperatingProfile({
      role: " Market Intelligence Agent ",
      objective: "Find useful competitor signals.",
      responsibilities: ["Research competitors", "Verify evidence"],
      success_criteria: ["Five competitors covered", "Every claim has evidence"],
      quality_threshold: 2,
      max_replans: 99,
      delegation: { enabled: true, allowed_agent_ids: ["agent-1"], max_depth: 99 },
      kpis: [{ name: "Evidence coverage", target: 95, unit: "%", direction: "higher" }],
    });

    expect(profile.role).toBe("Market Intelligence Agent");
    expect(profile.quality_threshold).toBe(1);
    expect(profile.max_replans).toBe(10);
    expect(profile.delegation).toEqual({ enabled: true, allowed_agent_ids: ["agent-1"], max_depth: 5 });
    expect(profile.kpis?.[0]?.name).toBe("Evidence coverage");
    expect(hasAgentSpecV2(profile)).toBe(true);
  });

  it("renders completion and verification rules into the runtime contract", () => {
    const profile = normaliseOperatingProfile({
      role: "Researcher",
      objective: "Produce a competitor brief",
      success_criteria: ["Cite live sources", "State anything that could not be verified"],
      verification_required: true,
      quality_threshold: 0.9,
      max_replans: 4,
    });
    const prompt = renderOperatingProfilePrompt(profile);

    expect(prompt).toContain("AGENT OPERATING PROFILE (SPEC V2)");
    expect(prompt).toContain("Role: Researcher");
    expect(prompt).toContain("do not claim completion");
    expect(prompt).toContain("Verification: required");
    expect(prompt).toContain("Quality threshold: 90%");
    expect(prompt).toContain("Maximum re-plans: 4");
  });

  it("compiles idempotently without duplicating the operating profile", () => {
    const profile = normaliseOperatingProfile({ role: "Operator", objective: "Finish the job" });
    const once = compileAgentSystemPrompt("Be concise.", profile);
    const twice = compileAgentSystemPrompt(once, profile);

    expect(twice).toBe(once);
    expect((twice.match(/PALLADIUM_AGENT_SPEC_V2/g) ?? []).length).toBe(1);
  });

  it("keeps v1 agents unchanged when no v2 profile exists", () => {
    expect(hasAgentSpecV2(normaliseOperatingProfile({}))).toBe(false);
    expect(compileAgentSystemPrompt("Legacy prompt", {})).toBe("Legacy prompt");
  });
});
