import { describe, expect, it } from "vitest";
import {
  assessPersonalExecutionIntegrity,
  annotatePersonalTaskSummary,
} from "../personal-execution-integrity";

describe("Personal AI requested versus handled tool evidence", () => {
  it("does not equate a final answer with tool execution when requests were deferred", () => {
    const integrity = assessPersonalExecutionIntegrity({
      requestedToolCalls: 3,
      handledToolCalls: 1,
      failedToolCalls: 0,
    });
    expect(integrity).toMatchObject({
      state: "requires_review", unhandledToolCalls: 2, reviewRequired: true,
    });
    expect(annotatePersonalTaskSummary("The draft is ready.", integrity))
      .toContain("Execution review needed");
  });

  it("flags rejected actions even if the remaining handler returned successfully", () => {
    const integrity = assessPersonalExecutionIntegrity({
      requestedToolCalls: 2,
      handledToolCalls: 1,
      failedToolCalls: 1,
    });
    expect(integrity.state).toBe("requires_review");
    expect(integrity.unhandledToolCalls).toBe(1);
  });

  it("does not certify external side effects from successful handler returns", () => {
    const integrity = assessPersonalExecutionIntegrity({
      requestedToolCalls: 1,
      handledToolCalls: 1,
      failedToolCalls: 0,
    });
    expect(integrity).toMatchObject({ state: "handlers_returned", reviewRequired: false });
    expect(annotatePersonalTaskSummary("Draft queued, not yet sent.", integrity))
      .toBe("Draft queued, not yet sent.");
  });

  it("keeps normal no-tool conversations unchanged", () => {
    const integrity = assessPersonalExecutionIntegrity({
      requestedToolCalls: 0, handledToolCalls: 0, failedToolCalls: 0,
    });
    expect(integrity.state).toBe("no_tool_calls");
    expect(integrity.note).toBe("");
  });

  it("never guesses how many old paused calls reached the handler", () => {
    const integrity = assessPersonalExecutionIntegrity({
      requestedToolCalls: 5, handledToolCalls: null, failedToolCalls: 0,
    });
    expect(integrity).toMatchObject({
      state: "legacy_count_unknown", handledToolCalls: null, unhandledToolCalls: null,
      reviewRequired: true,
    });
  });
});
