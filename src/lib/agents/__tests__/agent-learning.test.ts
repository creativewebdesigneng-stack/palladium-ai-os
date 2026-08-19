import { describe, expect, it } from "vitest";
import { createInitialPlan, normaliseVerificationDecision, updatePlanAfterObservation } from "../agent-planner";
import { buildVerifiedExperienceLearning } from "../agent-learning";

describe("Agent verified experience learning", () => {
  it("promotes verifier-approved work into durable experience", () => {
    let plan = createInitialPlan({
      objective: "Research the market and produce an evidence-backed brief",
      profile: { quality_threshold: 0.85, verification_required: true, max_replans: 2 },
      proposedSteps: [
        { id: "research", title: "Research market", objective: "Collect evidence" },
        { id: "brief", title: "Produce brief", objective: "Write the final brief" },
      ],
    });
    plan = updatePlanAfterObservation(plan, {
      stepId: "research",
      completed: true,
      evidence: ["Three independent sources agreed on the market size"],
    });
    plan = updatePlanAfterObservation(plan, { stepId: "brief", completed: true });

    const verification = normaliseVerificationDecision({
      passed: true,
      score: 0.94,
      evidence: ["All material claims are supported"],
      next_action: "complete",
    });

    const learning = buildVerifiedExperienceLearning({
      agentName: "Market Analyst",
      objective: plan.objective,
      outcome: "Delivered an evidence-backed market brief.",
      plan,
      verification,
    });

    expect(learning).not.toBeNull();
    expect(learning?.importance).toBe("high");
    expect(learning?.metadata.kind).toBe("verified_experience");
    expect(learning?.metadata.completed_steps).toContain("Research market");
    expect(learning?.content).toContain("Verification score: 94%");
  });

  it("does not learn from failed or below-threshold verification", () => {
    const plan = createInitialPlan({
      objective: "Verify a risky claim",
      profile: { quality_threshold: 0.9, verification_required: true },
    });

    const failed = buildVerifiedExperienceLearning({
      agentName: "Researcher",
      objective: plan.objective,
      outcome: "Unverified answer",
      plan,
      verification: normaliseVerificationDecision({
        passed: false,
        score: 0.7,
        next_action: "replan",
        issues: ["Missing evidence"],
      }),
    });
    const weak = buildVerifiedExperienceLearning({
      agentName: "Researcher",
      objective: plan.objective,
      outcome: "Partially verified answer",
      plan,
      verification: normaliseVerificationDecision({
        passed: true,
        score: 0.85,
        next_action: "complete",
      }),
    });

    expect(failed).toBeNull();
    expect(weak).toBeNull();
  });

  it("never stores hidden reasoning, only bounded execution evidence", () => {
    const plan = createInitialPlan({ objective: "Complete a bounded task" });
    const learning = buildVerifiedExperienceLearning({
      agentName: "Operator",
      objective: plan.objective,
      outcome: "Task completed with a concise result.",
      plan,
      verification: normaliseVerificationDecision({
        passed: true,
        score: 1,
        evidence: ["Tool output confirmed completion"],
        next_action: "complete",
      }),
    });

    expect(learning?.content).toContain("Verified outcome");
    expect(learning?.content).toContain("Verification evidence");
    expect(learning?.content.toLowerCase()).not.toContain("chain-of-thought");
  });
});
