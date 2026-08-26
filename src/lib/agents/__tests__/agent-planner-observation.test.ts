import { describe, expect, it } from "vitest";
import {
  assessToolObservation,
  createInitialPlan,
  shouldReplanAfterObservation,
} from "../agent-planner";

function plan(maxReplans = 3) {
  return createInitialPlan({
    objective: "Complete the task",
    profile: { max_replans: maxReplans } as any,
  });
}

describe("adaptive planner observation signals", () => {
  it("treats the runtime no-progress veto as a blocked route", () => {
    const assessment = assessToolObservation({
      ok: false,
      output: {
        error: "repeated_no_progress_blocked",
        message: "This exact request already repeated without progress.",
      },
    });
    expect(assessment.blocked).toBe(true);
    expect(assessment.approvalPending).toBe(false);
    expect(shouldReplanAfterObservation(plan(), assessment)).toBe(true);
  });

  it("treats explicit tool failures and error outputs as blocked", () => {
    expect(assessToolObservation({ ok: false, output: { error: "provider unavailable" } }).blocked).toBe(true);
    expect(assessToolObservation({ ok: true, output: { status: "failed", message: "not found" } }).blocked).toBe(true);
    expect(assessToolObservation({ ok: true, output: { error: "invalid query" } }).blocked).toBe(true);
  });

  it("never treats an approval wait as a replan trigger", () => {
    for (const output of [
      { approval_request_id: "req-1" },
      { status: "awaiting_approval" },
      { requires_approval: true },
    ]) {
      const assessment = assessToolObservation({ ok: false, output });
      expect(assessment.approvalPending).toBe(true);
      expect(assessment.blocked).toBe(false);
      expect(shouldReplanAfterObservation(plan(), assessment)).toBe(false);
    }
  });

  it("does not replan successful observations or when the replan budget is exhausted", () => {
    const success = assessToolObservation({ ok: true, output: { results: [1, 2] } });
    expect(success.blocked).toBe(false);
    expect(shouldReplanAfterObservation(plan(), success)).toBe(false);

    const blocked = assessToolObservation({ ok: false, output: { error: "failed" } });
    const exhausted = { ...plan(0), replan_count: 0 };
    expect(shouldReplanAfterObservation(exhausted, blocked)).toBe(false);
  });
});
