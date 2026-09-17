import { describe, expect, it } from "vitest";
import { registrySelectionBonus, type AgentSkillsRegistry } from "../agent-skills-registry";
import { applyVerifiedSkillFailure, buildAgentSkillGapPlan } from "../agent-skill-confidence";

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

  it("never lets verified failure evidence increase the positive routing bonus", () => {
    const before = registry();
    const beforeBonus = registrySelectionBonus("market research", before);
    const first = applyVerifiedSkillFailure({
      registry: before,
      signal: {
        taskId: "fail-routing",
        verificationScore: 0.3,
        issues: ["Market research claims lack source evidence"],
      },
    });

    expect(first.changed).toBe(true);
    expect(registrySelectionBonus("market research", first.registry)).toBeLessThanOrEqual(beforeBonus);
  });

  it("turns repeated failures and missing evidence into development priorities", () => {
    let current: AgentSkillsRegistry = {
      ...registry(),
      skills: [
        ...registry().skills,
        { name: "TypeScript", proficiency: 0.6, learnable: true },
      ],
      learnable_skills: ["Forecasting"],
    };
    for (const taskId of ["fail-a", "fail-b"]) {
      current = applyVerifiedSkillFailure({
        registry: current,
        signal: {
          taskId,
          verificationScore: 0.3,
          issues: ["Market research methodology is unsupported"],
        },
      }).registry;
    }

    const gaps = buildAgentSkillGapPlan(current, 6);
    expect(gaps[0]).toEqual(expect.objectContaining({
      skill: "Market research",
      kind: "revalidate",
    }));
    expect(gaps).toEqual(expect.arrayContaining([
      expect.objectContaining({ skill: "TypeScript", kind: "build_evidence" }),
      expect.objectContaining({ skill: "Forecasting", kind: "learnable" }),
    ]));
  });

  it("prioritizes expired Blackstar verification even when older success history is large", () => {
    const successes = Array.from({ length: 8 }, (_, index) => ({
      kind: "verified_task" as const,
      verified: true,
      reference: `task:historic-${index + 1}`,
      score: 0.95,
    }));
    const gaps = buildAgentSkillGapPlan({
      version: 1,
      skills: [{
        name: "Market research",
        proficiency: 0.86,
        learnable: true,
        evidence: successes,
        certifications: [{
          name: "Blackstar Verified — Market research",
          issuer: "Blackstar runtime verifier",
          status: "expired",
        }],
      }],
      certifications: [{
        name: "Blackstar Verified — Market research",
        issuer: "Blackstar runtime verifier",
        status: "expired",
      }],
    });

    expect(gaps[0]).toEqual(expect.objectContaining({
      skill: "Market research",
      kind: "revalidate",
      priority: 130,
    }));
    expect(gaps[0]?.reason).toContain("expired");

    const externalOnly = buildAgentSkillGapPlan({
      version: 1,
      skills: [{
        name: "Market research",
        proficiency: 0.86,
        learnable: true,
        evidence: successes,
        certifications: [{
          name: "External Research Certificate",
          issuer: "Independent Institute",
          status: "expired",
        }],
      }],
    });
    expect(externalOnly).toEqual([]);
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
