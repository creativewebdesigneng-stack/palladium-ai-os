import { describe, expect, it } from "vitest";
import { createInitialPlan, normaliseVerificationDecision } from "@/lib/agents/agent-planner";
import {
  createDurableDecisionState,
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
    expect(checkpoint.decision_state).toEqual({
      version: 1,
      informational_only: true,
      current_step_id: "step-1",
      steps: [{ id: "step-1", status: "pending", evidence_count: 0 }],
      verification: null,
      next_action: "continue_plan",
    });
    expect(parseDurableRunCheckpoint(checkpoint)).toEqual(checkpoint);
  });

  it("persists verifier facts without storing hidden reasoning or raw verifier prose", () => {
    const plan = createInitialPlan({ objective: "Ship a verified result" });
    const verification = normaliseVerificationDecision({
      passed: false,
      score: 0.72,
      issues: ["Need another source", "Check the final total"],
      evidence: ["source-a", "source-b", "source-c"],
      next_action: "replan",
    });
    const state = createDurableDecisionState({ plan, verification });

    expect(state.verification).toEqual({
      passed: false,
      score: 0.72,
      issue_count: 2,
      evidence_count: 3,
      next_action: "replan",
    });
    expect(state.next_action).toBe("replan");
    expect(JSON.stringify(state)).not.toContain("Need another source");
    expect(JSON.stringify(state)).not.toContain("source-a");
    expect(state).not.toHaveProperty("reasoning");
    expect(state).not.toHaveProperty("chain_of_thought");
  });

  it("parses legacy schema-1 checkpoints with no decision state", () => {
    const plan = createInitialPlan({ objective: "Legacy run" });
    const legacy = {
      schema: 1,
      phase: "model_boundary",
      safe_to_resume: true,
      saved_at: "2026-09-01T12:00:00.000Z",
      messages: [{ role: "user", content: "continue" }],
      plan,
      tool_rounds: 0,
      tool_call_count: 0,
      usage: { input: 1, output: 0 },
    };

    expect(parseDurableRunCheckpoint(legacy)).toEqual(legacy);
  });

  it("strips authority-shaped and hidden-reasoning fields from restored decision state", () => {
    const plan = createInitialPlan({ objective: "Resume safely" });
    const checkpoint = createDurableRunCheckpoint({
      phase: "verification_boundary",
      messages: [{ role: "user", content: "continue" }],
      plan,
      toolRounds: 1,
      toolCallCount: 1,
      usage: { input: 10, output: 5 },
    }) as unknown as Record<string, unknown>;

    checkpoint["decision_state"] = {
      version: 1,
      informational_only: true,
      current_step_id: "step-1",
      steps: [{
        id: "step-1",
        status: "in_progress",
        evidence_count: 999999,
        tool_grants: ["admin"],
        approval_granted: true,
      }],
      verification: {
        passed: true,
        score: 99,
        issue_count: 999,
        evidence_count: 999,
        next_action: "complete",
        reasoning: "secret hidden reasoning",
      },
      next_action: "complete",
      tool_grants: ["admin"],
      approval_granted: true,
      delegation_depth: 999,
      execution_authority: "root",
      chain_of_thought: "do not persist me",
    };

    const parsed = parseDurableRunCheckpoint(checkpoint);
    expect(parsed?.decision_state).toEqual({
      version: 1,
      informational_only: true,
      current_step_id: "step-1",
      steps: [{ id: "step-1", status: "in_progress", evidence_count: 100 }],
      verification: {
        passed: true,
        score: 1,
        issue_count: 100,
        evidence_count: 100,
        next_action: "complete",
      },
      next_action: "complete",
    });
    expect(JSON.stringify(parsed?.decision_state)).not.toContain("admin");
    expect(JSON.stringify(parsed?.decision_state)).not.toContain("approval_granted");
    expect(JSON.stringify(parsed?.decision_state)).not.toContain("chain_of_thought");
    expect(JSON.stringify(parsed?.decision_state)).not.toContain("execution_authority");
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
    // A crash after this invalidation must not leave a stale pre-tool snapshot
    // that could cause a possibly completed real-world action to be replayed.
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
