import { describe, expect, it } from "vitest";
import type { AgentSkillsRegistry } from "../agent-skills-registry";
import { buildAgentSkillCertificationProgress } from "../agent-skill-certification-progress";

function registry(): AgentSkillsRegistry {
  return {
    version: 1,
    skills: [{
      name: "Market research",
      proficiency: 0.7,
      learnable: true,
      evidence: [
        { kind: "verified_task", verified: true, reference: "task:1", score: 0.94 },
        { kind: "verified_task", verified: true, reference: "task:2", score: 0.92 },
      ],
    }],
  };
}

describe("skill certification progress", () => {
  it("shows bounded progress toward Blackstar verification", () => {
    const [progress] = buildAgentSkillCertificationProgress(registry());

    expect(progress).toEqual(expect.objectContaining({
      skill: "Market research",
      status: "building",
      verified_tasks: 2,
      verifier_failures: 0,
      current_success_streak: 2,
      tasks_remaining: 1,
      required_tasks: 3,
      required_average_score: 0.9,
      quality_target_met: false,
    }));
    expect(progress?.recent_average_score).toBeCloseTo(0.93);
  });

  it("reports a verified Blackstar certification independently of external certificates", () => {
    const base = registry();
    base.skills[0]?.evidence?.push(
      { kind: "verified_task", verified: true, reference: "task:3", score: 0.96 },
    );
    base.skills[0]!.certifications = [{
      name: "Blackstar Verified — Market research",
      issuer: "Blackstar runtime verifier",
      status: "verified",
    }];
    base.certifications = [{
      name: "External Research Certificate",
      issuer: "Independent Institute",
      status: "verified",
    }];

    const [progress] = buildAgentSkillCertificationProgress(base);

    expect(progress?.status).toBe("verified");
    expect(progress?.tasks_remaining).toBe(0);
    expect(progress?.quality_target_met).toBe(true);
    expect(progress?.recent_average_score).toBeCloseTo(0.94);
  });

  it("resets the qualification streak after verifier-confirmed failure and tracks re-certification", () => {
    const base = registry();
    base.skills[0]!.evidence = [
      { kind: "verified_task", verified: true, reference: "task:old-1", score: 0.95 },
      { kind: "verified_failure", verified: true, reference: "task:fail", score: 0.3 },
      { kind: "verified_task", verified: true, reference: "task:new-1", score: 0.96 },
      { kind: "verified_task", verified: true, reference: "task:new-2", score: 0.93 },
    ];
    base.skills[0]!.certifications = [{
      name: "Blackstar Verified — Market research",
      issuer: "Blackstar runtime verifier",
      status: "expired",
    }];

    const [progress] = buildAgentSkillCertificationProgress(base);

    expect(progress).toEqual(expect.objectContaining({
      status: "expired",
      verified_tasks: 3,
      verifier_failures: 1,
      current_success_streak: 2,
      tasks_remaining: 1,
    }));
    expect(progress?.recent_evidence).toEqual([
      { kind: "verified_failure", score: 0.3 },
      { kind: "verified_task", score: 0.96 },
      { kind: "verified_task", score: 0.93 },
    ]);
  });

  it("does not treat an external certification as Blackstar verification", () => {
    const base = registry();
    base.skills[0]!.certifications = [{
      name: "External Research Certificate",
      issuer: "Independent Institute",
      status: "verified",
    }];

    const [progress] = buildAgentSkillCertificationProgress(base);

    expect(progress?.status).toBe("building");
  });
});
