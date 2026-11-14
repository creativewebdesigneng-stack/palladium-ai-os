import { describe, expect, it } from "vitest";
import { buildExecutionReceipt } from "./execution-receipt";

const task = {
  id: "task-1",
  agent_id: "agent-1",
  status: "succeeded",
  provider: "openai",
  model: "gpt-5-mini",
  tokens_in: 12,
  tokens_out: 8,
  tool_calls: 1,
  duration_ms: 900,
  output_text: "A finished deliverable",
  completed_at: "2026-11-14T00:00:00.000Z",
};

describe("execution receipts", () => {
  it("proves execution only when the service audit matches the persisted task", () => {
    const receipt = buildExecutionReceipt(task, {
      action: "agent.run_result",
      target_id: "task-1",
      status: "success",
      metadata: { provider: "openai", model: "gpt-5-mini" },
    });
    expect(receipt.provesExecution).toBe(true);
    expect(receipt.toolCalls).toBe(1);
  });

  it("does not treat a task row or a mismatched audit entry as proof", () => {
    expect(buildExecutionReceipt(task, null).provesExecution).toBe(false);
    expect(
      buildExecutionReceipt(task, {
        action: "agent.run_result",
        target_id: "task-1",
        metadata: { provider: "groq", model: "gpt-5-mini" },
      }).provesExecution,
    ).toBe(false);
    expect(
      buildExecutionReceipt(
        { ...task, output_text: "  " },
        {
          action: "agent.run_result",
          target_id: "task-1",
          metadata: { provider: "openai", model: "gpt-5-mini" },
        },
      ).reason,
    ).toContain("deliverable");
  });
});
