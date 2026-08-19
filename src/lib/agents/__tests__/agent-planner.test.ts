import { describe, expect, it } from "vitest";
import {
  applyReplan,
  createInitialPlan,
  normaliseVerificationDecision,
  renderPlannerPrompt,
  shouldComplete,
  shouldReplan,
  updatePlanAfterObservation,
} from "../agent-planner";

describe("Agent Planner", () => {
  it("creates a bounded plan from Agent Spec v2", () => {
    const plan = createInitialPlan({
      objective: "Research five competitors and produce a verified brief",
      profile: {
        success_criteria: ["Five competitors covered", "Claims have evidence"],
        max_replans: 4,
        quality_threshold: 0.9,
        verification_required: true,
      },
      proposedSteps: [
        { title: "Discover competitors", objective: "Find the candidate set" },
        { title: "Verify evidence", objective: "Validate every material claim" },
      ],
    });

    expect(plan.steps).toHaveLength(2);
    expect(plan.max_replans).toBe(4);
    expect(plan.quality_threshold).toBe(0.9);
    expect(plan.current_step_id).toBe("step-1");
  });

  it("records observations and advances to the next pending step", () => {
    const plan = createInitialPlan({
      objective: "Finish the task",
      proposedSteps: [
        { id: "a", title: "Research", objective: "Collect evidence" },
        { id: "b", title: "Write", objective: "Produce the answer" },
      ],
    });
    const observed = updatePlanAfterObservation(plan, {
      stepId: "a",
      completed: true,
      evidence: ["Source A confirmed the claim"],
    });

    expect(observed.steps[0]?.status).toBe("completed");
    expect(observed.steps[0]?.evidence).toContain("Source A confirmed the claim");
    expect(observed.current_step_id).toBe("b");
  });

  it("requires verification score to meet the configured quality threshold", () => {
    const plan = createInitialPlan({
      objective: "Verify the work",
      profile: { verification_required: true, quality_threshold: 0.85, max_replans: 2 },
    });
    const weak = normaliseVerificationDecision({
      passed: true,
      score: 0.7,
      next_action: "replan",
      issues: ["Missing evidence"],
    });
    expect(shouldComplete(plan, weak)).toBe(false);
    expect(shouldReplan(plan, weak)).toBe(true);

    const strong = normaliseVerificationDecision({ passed: true, score: 0.9, next_action: "complete" });
    expect(shouldComplete(plan, strong)).toBe(true);
  });

  it("bounds re-planning and preserves a revised plan", () => {
    const plan = createInitialPlan({ objective: "Ship it", profile: { max_replans: 1 } });
    const decision = normaliseVerificationDecision({
      passed: false,
      score: 0.4,
      next_action: "replan",
      revised_steps: [{ title: "Fix evidence", objective: "Gather the missing proof" }],
    });
    const replanned = applyReplan(plan, decision);
    expect(replanned.replan_count).toBe(1);
    expect(replanned.steps[0]?.title).toBe("Fix evidence");
    expect(applyReplan(replanned, decision)).toEqual(replanned);
  });

  it("renders an execution contract that exposes plan and verification state", () => {
    const plan = createInitialPlan({
      objective: "Produce a launch brief",
      profile: { verification_required: true, quality_threshold: 0.8, max_replans: 3 },
    });
    const prompt = renderPlannerPrompt(plan);
    expect(prompt).toContain("PALLADIUM EXECUTION PLAN");
    expect(prompt).toContain("Re-plans: 0/3");
    expect(prompt).toContain("80% quality threshold");
    expect(prompt).toContain("do not claim completion");
  });
});
