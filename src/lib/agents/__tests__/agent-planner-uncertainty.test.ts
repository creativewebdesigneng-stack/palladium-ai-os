import { describe, expect, it } from "vitest";
import {
  applyReplan,
  createInitialPlan,
  shouldComplete,
  shouldReplan,
  type VerificationDecision,
} from "../agent-planner";

function decision(overrides: Partial<VerificationDecision> = {}): VerificationDecision {
  return {
    passed: false,
    score: 0.4,
    issues: ["insufficient evidence"],
    evidence: [],
    next_action: "replan",
    revised_steps: [],
    ...overrides,
  };
}

describe("agent planner uncertainty calibration", () => {
  it("replans when verifier claims complete but confidence is below the quality threshold", () => {
    const plan = createInitialPlan({ objective: "Produce a verified answer", profile: { quality_threshold: 0.8, max_replans: 3 } });
    const uncertain = decision({ passed: true, score: 0.62, next_action: "complete" });

    expect(shouldComplete(plan, uncertain)).toBe(false);
    expect(shouldReplan(plan, uncertain)).toBe(true);
    expect(applyReplan(plan, uncertain).replan_count).toBe(1);
  });

  it("does not override an explicit verifier escalation", () => {
    const plan = createInitialPlan({ objective: "Perform work requiring operator input", profile: { quality_threshold: 0.8, max_replans: 3 } });
    const escalated = decision({ passed: false, score: 0.2, next_action: "escalate" });

    expect(shouldReplan(plan, escalated)).toBe(false);
    expect(applyReplan(plan, escalated).replan_count).toBe(0);
  });

  it("stops replanning when the configured bounded budget is exhausted", () => {
    const base = createInitialPlan({ objective: "Retry safely", profile: { quality_threshold: 0.9, max_replans: 1 } });
    const uncertain = decision({ passed: true, score: 0.7, next_action: "complete" });
    const once = applyReplan(base, uncertain);

    expect(once.replan_count).toBe(1);
    expect(shouldReplan(once, uncertain)).toBe(false);
    expect(applyReplan(once, uncertain).replan_count).toBe(1);
  });

  it("completes normally when verifier confidence meets the configured threshold", () => {
    const plan = createInitialPlan({ objective: "Return a strong answer", profile: { quality_threshold: 0.8 } });
    const confident = decision({ passed: true, score: 0.91, next_action: "complete", evidence: ["verified"] });

    expect(shouldComplete(plan, confident)).toBe(true);
    expect(shouldReplan(plan, confident)).toBe(false);
  });
});
