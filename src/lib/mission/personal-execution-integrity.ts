/** Tool-call accounting for Mission Control's existing Personal AI runtime.
 *
 * Requested model calls are not synonymous with handler executions: approval
 * pauses can skip parallel calls, owners may reject a call, and a self-queuing
 * tool may only submit a separate approval. None of these proves that the
 * external objective has completed.
 */
export type PersonalExecutionIntegrity = {
  state: "no_tool_calls" | "handlers_returned" | "requires_review" | "legacy_count_unknown";
  handledToolCalls: number | null;
  unhandledToolCalls: number | null;
  reviewRequired: boolean;
  note: string;
};

export function assessPersonalExecutionIntegrity(args: {
  requestedToolCalls: number;
  handledToolCalls: number | null;
  failedToolCalls: number;
}): PersonalExecutionIntegrity {
  const { requestedToolCalls, handledToolCalls, failedToolCalls } = args;
  if (handledToolCalls === null) {
    return {
      state: "legacy_count_unknown",
      handledToolCalls: null,
      unhandledToolCalls: null,
      reviewRequired: true,
      note: "Execution review needed: this older approval record did not retain a reliable count of handled tool calls. Check the recorded tool evidence before relying on external-action claims.",
    };
  }
  const unhandledToolCalls = Math.max(0, requestedToolCalls - handledToolCalls);
  if (failedToolCalls > 0 || unhandledToolCalls > 0) {
    return {
      state: "requires_review",
      handledToolCalls,
      unhandledToolCalls,
      reviewRequired: true,
      note: "Execution review needed: one or more tool requests failed, were rejected, or did not reach the tool handler. Verify any outstanding work before treating the task as fully executed.",
    };
  }
  return {
    state: requestedToolCalls === 0 ? "no_tool_calls" : "handlers_returned",
    handledToolCalls,
    unhandledToolCalls: 0,
    reviewRequired: false,
    note: "",
  };
}

export function annotatePersonalTaskSummary(summary: string, integrity: PersonalExecutionIntegrity): string {
  return integrity.note ? summary + "\n\n_" + integrity.note + "_" : summary;
}
