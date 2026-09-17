import { describe, expect, it } from "vitest";
import type { AgentSkillsRegistry } from "../agent-skills-registry";
import { applyVerifiedSkillLearning } from "../agent-skill-learning";
import { applyVerifiedSkillFailure } from "../agent-skill-confidence";

function baseRegistry(): AgentSkillsRegistry {
  return {
    version: 1,
    skills: [{
      name: "Market research",
      proficiency: 0.72,
      learnable: true,
      certifications: [{
        name: "External Research Certificate",
        issuer: "Independent Institute",
        status: "verified",
      }],
    }],
    certifications: [{
      name: "External Research Certificate",
      issuer: "Independent Institute",
      status: "verified",
    }],
  };
}

function success(registry: AgentSkillsRegistry, index: number) {
  return applyVerifiedSkillLearning({
    registry,
    signal: {
      taskId: `success-${index}`,
      objective: "Research the target market",
      verifiedOutcome: "Verified market research completed with source evidence",
      verificationScore: 0.95,
      evidence: ["Market research source evidence verified"],
    },
  });
}

function failure(registry: AgentSkillsRegistry, index: number) {
  return applyVerifiedSkillFailure({
    registry,
    signal: {
      taskId: `failure-${index}`,
      verificationScore: 0.3,
      issues: ["Market research claims failed source verification"],
      evidence: ["Verifier confirmed a capability-quality failure"],
    },
  });
}

describe("Blackstar skill certification lifecycle", () => {
  it("expires only Blackstar certification after three consecutive verified failures", () => {
    let current = baseRegistry();
    for (let index = 1; index <= 3; index += 1) current = success(current, index).registry;

    expect(current.skills[0]?.certifications).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: "Blackstar Verified — Market research",
        issuer: "Blackstar runtime verifier",
        status: "verified",
      }),
      expect.objectContaining({
        name: "External Research Certificate",
        status: "verified",
      }),
    ]));

    let lastFailure;
    for (let index = 1; index <= 3; index += 1) {
      lastFailure = failure(current, index);
      current = lastFailure.registry;
    }

    expect(lastFailure?.certifications_expired).toEqual(["Blackstar Verified — Market research"]);
    expect(current.skills[0]?.certifications).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: "Blackstar Verified — Market research",
        status: "expired",
      }),
      expect.objectContaining({
        name: "External Research Certificate",
        issuer: "Independent Institute",
        status: "verified",
      }),
    ]));
    expect(current.certifications).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: "Blackstar Verified — Market research",
        status: "expired",
      }),
      expect.objectContaining({
        name: "External Research Certificate",
        status: "verified",
      }),
    ]));
  });

  it("requires three new strong successes to re-certify an expired skill", () => {
    let current = baseRegistry();
    for (let index = 1; index <= 3; index += 1) current = success(current, index).registry;
    for (let index = 1; index <= 3; index += 1) current = failure(current, index).registry;

    const one = success(current, 4);
    const two = success(one.registry, 5);
    expect(two.registry.skills[0]?.certifications).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "Blackstar Verified — Market research", status: "expired" }),
    ]));

    const three = success(two.registry, 6);
    expect(three.certifications_awarded).toEqual(["Blackstar Verified — Market research"]);
    expect(three.registry.skills[0]?.certifications).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "Blackstar Verified — Market research", status: "verified" }),
    ]));
    expect(three.registry.certifications).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "Blackstar Verified — Market research", status: "verified" }),
    ]));
  });
});
