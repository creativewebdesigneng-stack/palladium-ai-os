import { describe, expect, it } from "vitest";
import type { AgentSkillsRegistry } from "../agent-skills-registry";
import { applyVerifiedSkillFailure } from "../agent-skill-confidence";

function registry(): AgentSkillsRegistry {
  return {
    version: 1,
    skills: [{
      name: "Market research",
      aliases: ["research"],
      proficiency: 0.72,
      learnable: true,
      evidence: [{
        kind: "verified_task",
        verified: true,
        reference: "task:success-1",
        score: 0.95,
      }],
    }],
  };
}

describe("verified skill confidence", () => {
  it("records the first verifier-confirmed failure without immediately reducing proficiency", () => {
    const result = applyVerifiedSkillFailure({
      registry: registry(),
      signal: {
        taskId: "fail-1",
        verificationScore: 0.4,
        issues: ["Market research claims are missing source evidence"],
      },
    });

    expect(result.changed).toBe(true);
    expect(result.matched_skills).toEqual(["Market research"]);
    expect(result.reduced_skills).toEqual([]);
    expect(result.registry.skills[0]?.proficiency).toBe(0.72);
    expect(result.registry.skills[0]?.evidence).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "verified_failure", verified: true }),
    ]));
  });

  it("reduces proficiency only after a second distinct verifier-confirmed failure", () => {
    const first = applyVerifiedSkillFailure({
      registry: registry(),
      signal: {
        taskId: "fail-1",
        verificationScore: 0.4,
        issues: ["Market research claims are missing source evidence"],
      },
    });
    const second = applyVerifiedSkillFailure({
      registry: first.registry,
      signal: {
        taskId: "fail-2",
        verificationScore: 0.3,
        issues: ["Market research methodology is unsupported"],
      },
    });

    expect(second.reduced_skills).toEqual(["Market research"]);
    expect(second.registry.skills[0]?.proficiency).toBeLessThan(0.72);
    expect(second.registry.skills[0]?.proficiency).toBeGreaterThanOrEqual(0.2);
  });

  it("is idempotent for the same failed task", () => {
    const first = applyVerifiedSkillFailure({
      registry: registry(),
      signal: {
        taskId: "fail-1",
        verificationScore: 0.4,
        issues: ["Market research evidence is incomplete"],
      },
    });
    const duplicate = applyVerifiedSkillFailure({
      registry: first.registry,
      signal: {
        taskId: "fail-1",
        verificationScore: 0.4,
        issues: ["Market research evidence is incomplete"],
      },
    });

    expect(duplicate.changed).toBe(false);
    expect(duplicate.registry.skills[0]?.evidence?.filter((item) => item.kind === "verified_failure")).toHaveLength(1);
  });

  it("ignores unrelated or above-floor verifier feedback", () => {
    const unrelated = applyVerifiedSkillFailure({
      registry: registry(),
      signal: {
        taskId: "fail-unrelated",
        verificationScore: 0.2,
        issues: ["Translation quality did not meet the threshold"],
      },
    });
    const tooStrong = applyVerifiedSkillFailure({
      registry: registry(),
      signal: {
        taskId: "fail-high",
        verificationScore: 0.75,
        issues: ["Market research could be more concise"],
      },
    });

    expect(unrelated.changed).toBe(false);
    expect(tooStrong.changed).toBe(false);
  });
});
