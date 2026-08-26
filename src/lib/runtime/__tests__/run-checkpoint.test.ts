import { describe, expect, it } from "vitest";
import { createInitialPlan } from "@/lib/agents/agent-planner";
import {
  createDurableRunCheckpoint,
  invalidateDurableRunCheckpoint,
  parseDurableRunCheckpoint,
} from "../run-checkpoint.server";

describe("durable run checkpoints", () => {
  it("captures a bounded safe execution boundary", () => {
    const plan = createInitialPlan({ objective: "Research the account" });
    const checkpoint = createDurableRunCheckpoint({
      phase: "tool_boundary",
      messages: Array.from({ length: 30 }, (_, index) => ({
        role: "tool" as const,
        content: `result-${index}`,
        name: "connected_service",
        tool_call_id: `call-${index}`,
      })),
      plan,
      toolRounds: 2,
      toolCallCount: 4,
      usage: { input: 123, output: 45 },
      now: new Date("2026-08-26T21:45:00.000Z"),
    });

    expect(checkpoint.safe_to_resume).toBe(true);
    expect(checkpoint.phase).toBe("tool_boundary");
    expect(checkpoint.messages).toHaveLength(24);
    expect(checkpoint.messages[0]?.content).toBe("result-6");
    expect(checkpoint.tool_rounds).toBe(2);
    expect(checkpoint.tool_call_count).toBe(4);
    expect(checkpoint.saved_at).toBe("2026-08-26T21:45:00.000Z");
    expect(parseDurableRunCheckpoint(checkpoint)).toEqual(checkpoint);
  });

  it("rejects checkpoints that are not explicitly safe to resume", () => {
    expect(
      parseDurableRunCheckpoint({
        schema: 1,
        phase: "tool_boundary",
        safe_to_resume: false,
        messages: [],
        plan: {},
        tool_rounds: 0,
        tool_call_count: 0,
        usage: { input: 0, output: 0 },
      }),
    ).toBeNull();
  });

  it("rejects unknown schemas and invalid phases", () => {
    expect(parseDurableRunCheckpoint({ schema: 2, safe_to_resume: true })).toBeNull();
    expect(
      parseDurableRunCheckpoint({
        schema: 1,
        phase: "in_flight_write",
        safe_to_resume: true,
        messages: [],
        plan: {},
        tool_rounds: 0,
        tool_call_count: 0,
        usage: { input: 0, output: 0 },
      }),
    ).toBeNull();
  });

  it("normalises counters so corrupt negatives cannot expand budgets", () => {
    const plan = createInitialPlan({ objective: "Check status" });
    const checkpoint = createDurableRunCheckpoint({
      phase: "model_boundary",
      messages: [{ role: "user", content: "check" }],
      plan,
      toolRounds: -4,
      toolCallCount: Number.NaN,
      usage: { input: -20, output: 8.9 },
    });

    expect(checkpoint.tool_rounds).toBe(0);
    expect(checkpoint.tool_call_count).toBe(0);
    expect(checkpoint.usage).toEqual({ input: 0, output: 8 });
  });

  it("invalidates resumability before external tool execution", async () => {
    let update: Record<string, unknown> | null = null;
    const sb = {
      from: () => ({
        update: (value: Record<string, unknown>) => {
          update = value;
          return { eq: async () => ({ error: null }) };
        },
      }),
    };

    await invalidateDurableRunCheckpoint({ sb, taskId: "task-1" });

    expect(update?.["checkpoint_state"]).toBeNull();
    expect(update?.["checkpoint_version"]).toBe(0);
    expect(update?.["checkpointed_at"]).toBeNull();
    expect(typeof update?.["heartbeat_at"]).toBe("string");
  });
});
