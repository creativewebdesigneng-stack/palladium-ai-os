import { describe, expect, it } from "vitest";
import type { AgentSkillsRegistry } from "../agent-skills-registry";
import { applyVerifiedSkillLearning } from "../agent-skill-learning";

function registry(): AgentSkillsRegistry {
  return {
    version: 1,
    skills: [{
      name: "Market research",
      aliases: ["research"],
      proficiency: 0.6,
      learnable: true,
      evidence: [{ kind: "declared", verified: false }],
    }],
    learnable_skills: ["Forecasting"],
  };
}

describe("verified skill learning", () => {
  it("adds bounded verified task evidence to an existing matching skill", () => {
    const result = applyVerifiedSkillLearning({
      registry: registry(),
      signal: {
        taskId: "task-1",
        objective: "Research the market and produce a market brief",
        verifiedOutcome: "Delivered a sourced market research brief",
        verificationScore: 0.95,
      },
    });

    expect(result.changed).toBe(true);
    expect(result.matched_skills).toContain("Market research");
    expect(result.registry.skills[0]?.proficiency).toBeGreaterThan(0.6);
    expect(result.registry.skills[0]?.evidence).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "verified_task", reference: "task:task-1", verified: true }),
    ]));
  });

  it("is idempotent for the same verified task reference", () => {
    const first = applyVerifiedSkillLearning({
      registry: registry(),
      signal: {
        taskId: "task-1",
        objective: "Research the market",
        verificationScore: 0.95,
      },
    });
    const second = applyVerifiedSkillLearning({
      registry: first.registry,
      signal: {
        taskId: "task-1",
        objective: "Research the market",
        verificationScore: 0.95,
      },
    });

    expect(second.changed).toBe(false);
    expect(second.registry.skills[0]?.evidence?.filter((item) => item.reference === "task:task-1")).toHaveLength(1);
  });

  it("promotes only an operator-declared learnable skill", () => {
    const result = applyVerifiedSkillLearning({
      registry: registry(),
      signal: {
        taskId: "task-forecast",
        objective: "Build a forecasting model for next quarter",
        verifiedOutcome: "Forecasting model delivered and verified",
        verificationScore: 0.93,
      },
    });

    expect(result.promoted_skills).toEqual(["Forecasting"]);
    expect(result.registry.skills.some((skill) => skill.name === "Forecasting")).toBe(true);
    expect(result.registry.learnable_skills).not.toContain("Forecasting");
    expect(result.registry.skills.some((skill) => skill.name === "Financial modelling")).toBe(false);
  });

  it("awards Blackstar verification only after three strong distinct tasks", () => {
    let current = registry();
    for (let index = 1; index <= 3; index += 1) {
      current = applyVerifiedSkillLearning({
        registry: current,
        signal: {
          taskId: `task-${index}`,
          objective: "Perform market research with source verification",
          verificationScore: 0.94,
        },
      }).registry;
    }

    const skill = current.skills.find((item) => item.name === "Market research");
    expect(skill?.certifications).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: "Blackstar Verified — Market research",
        issuer: "Blackstar runtime verifier",
        status: "verified",
      }),
    ]));
    expect(current.certifications).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "Blackstar Verified — Market research" }),
    ]));
  });

  it("does not advance capability from weak or unrelated evidence", () => {
    const weak = applyVerifiedSkillLearning({
      registry: registry(),
      signal: {
        taskId: "weak",
        objective: "Research the market",
        verificationScore: 0.7,
      },
    });
    const unrelated = applyVerifiedSkillLearning({
      registry: registry(),
      signal: {
        taskId: "other",
        objective: "Translate a greeting into French",
        verificationScore: 0.99,
      },
    });

    expect(weak.changed).toBe(false);
    expect(unrelated.changed).toBe(false);
  });
});
