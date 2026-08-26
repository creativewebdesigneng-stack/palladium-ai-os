/**
 * Planned-run parity tests: the planner executor must inherit the same safe
 * batching, loop protection, tool-result compaction and steering checkpoints as
 * the ordinary PalladiumAI runtime without changing planner verification logic.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabase } from "./fake-supabase";

const gateway = vi.hoisted(() => ({ runChat: vi.fn() }));
vi.mock("../model-gateway.server", () => ({
  runChat: gateway.runChat,
}));

const toolsMod = vi.hoisted(() => ({ executeTool: vi.fn() }));
vi.mock("../tools.server", () => ({ executeTool: toolsMod.executeTool }));

const runtime = vi.hoisted(() => ({
  completeRun: vi.fn(async ({ run }: any) => ({ id: run.taskId, status: "succeeded" })),
  setRunState: vi.fn(async () => {}),
}));
vi.mock("../runtime.server", () => ({
  completeRun: runtime.completeRun,
  setRunState: runtime.setRunState,
  RuntimeError: class RuntimeError extends Error {
    constructor(
      message: string,
      readonly code: string,
      readonly status = 400,
    ) {
      super(message);
    }
  },
}));

vi.mock("@/lib/notifications/notify.server", () => ({ notify: vi.fn(async () => true) }));

vi.mock("@/lib/agents/agent-planner", () => ({
  createInitialPlan: ({ objective }: any) => ({
    objective,
    assumptions: [],
    steps: [{ id: "step-1", title: "Execute", objective, status: "active", success_criteria: ["done"], evidence: [] }],
    current_step_id: "step-1",
    quality_threshold: 0.8,
    verification_required: false,
    replan_count: 0,
    max_replans: 2,
  }),
  renderPlannerPrompt: () => "PLANNER STATE",
  normaliseVerificationDecision: (value: any) => ({
    passed: Boolean(value?.passed),
    score: Number(value?.score ?? 0),
    issues: value?.issues ?? [],
    evidence: value?.evidence ?? [],
    next_action: value?.next_action ?? "complete",
    revised_steps: value?.revised_steps ?? [],
  }),
  shouldComplete: (_plan: any, decision: any) => Boolean(decision.passed),
  shouldReplan: () => false,
  applyReplan: (plan: any) => plan,
  updatePlanAfterObservation: (plan: any) => plan,
}));

import { executePlannedRun } from "../planner-runtime.server";

const planningResult = {
  text: JSON.stringify({
    assumptions: [],
    steps: [{ id: "step-1", title: "Execute", objective: "finish task", success_criteria: ["done"] }],
  }),
  toolCalls: [],
  usage: { input: 1, output: 1 },
  provider: "openai" as const,
  model: "gpt-5-mini",
};

function toolResult(calls: Array<{ id: string; name: string; arguments: Record<string, unknown> }>) {
  return {
    text: "",
    toolCalls: calls,
    usage: { input: 2, output: 2 },
    provider: "openai" as const,
    model: "gpt-5-mini",
  };
}

const finalResult = {
  text: "Done.",
  toolCalls: [],
  usage: { input: 2, output: 2 },
  provider: "openai" as const,
  model: "gpt-5-mini",
};

function grant(slug: string, requiresApproval = false) {
  return [slug, { slug, requiresApproval, allowedDomains: [], spendCap: null }] as const;
}

function run(sb: any, grants = new Map([grant("web_search"), grant("current_time")])) {
  return {
    agent: {
      id: "agent-1",
      user_id: "user-1",
      org_id: null,
      org_id_fk: null,
      name: "Atlas",
      description: null,
      purpose: null,
      personality: null,
      instructions: null,
      system_prompt: null,
      model_provider: "openai",
      model: "gpt-5-mini",
      temperature: 0.2,
      max_tokens: 1000,
      memory_enabled: false,
      allowed_tools: [...grants.keys()],
      allowed_providers: [],
      requires_approval: false,
      autonomy: "supervised",
      status: "active",
      category: "general",
    },
    orgId: null,
    taskId: "task-1",
    messages: [
      { role: "system", content: "You are Atlas." },
      { role: "user", content: "finish task" },
    ],
    tools: { defs: [...grants.keys()].map((name) => ({ name, description: name, parameters: {} })), grants },
    provider: "openai" as const,
    model: "gpt-5-mini",
    startedAt: Date.now(),
  } as any;
}

function db() {
  return createFakeSupabase({
    agent_tasks: [{ id: "task-1", status: "running", cancel_requested: false }],
    agent_activities: [],
  }) as any;
}

function isPlanningCall(args: any) {
  return String(args.messages?.at(-1)?.content ?? "").includes("planning controller");
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("planned runtime parity", () => {
  it("runs an all-safe read batch concurrently while preserving tool-message order", async () => {
    const sb = db();
    let executionRound = 0;
    gateway.runChat.mockImplementation(async (args: any) => {
      if (isPlanningCall(args)) return planningResult;
      return executionRound++ === 0
        ? toolResult([
            { id: "a", name: "web_search", arguments: { q: "one" } },
            { id: "b", name: "current_time", arguments: {} },
          ])
        : finalResult;
    });

    let active = 0;
    let peak = 0;
    toolsMod.executeTool.mockImplementation(async (name: string) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 15));
      active -= 1;
      return { ok: true, output: { tool: name } };
    });

    await executePlannedRun({ sb, userId: "user-1", run: run(sb) });

    expect(peak).toBe(2);
    const completion = runtime.completeRun.mock.calls[0]?.[0];
    const toolMessages = completion.run.messages.filter((message: any) => message.role === "tool");
    expect(toolMessages.map((message: any) => message.tool_call_id)).toEqual(["a", "b"]);
  });

  it("keeps mixed safe-read and sensitive batches sequential", async () => {
    const sb = db();
    const grants = new Map([grant("web_search"), grant("connected_service")]);
    let executionRound = 0;
    gateway.runChat.mockImplementation(async (args: any) => {
      if (isPlanningCall(args)) return planningResult;
      return executionRound++ === 0
        ? toolResult([
            { id: "a", name: "web_search", arguments: { q: "one" } },
            { id: "b", name: "connected_service", arguments: { provider: "github" } },
          ])
        : finalResult;
    });

    let active = 0;
    let peak = 0;
    toolsMod.executeTool.mockImplementation(async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active -= 1;
      return { ok: true, output: {} };
    });

    await executePlannedRun({ sb, userId: "user-1", run: run(sb, grants) });
    expect(peak).toBe(1);
  });

  it("vetoes repeated no-progress planned calls before the underlying tool runs again", async () => {
    const sb = db();
    let executionRound = 0;
    gateway.runChat.mockImplementation(async (args: any) => {
      if (isPlanningCall(args)) return planningResult;
      return executionRound++ < 4
        ? toolResult([{ id: `call-${executionRound}`, name: "web_search", arguments: { q: "same" } }])
        : finalResult;
    });
    toolsMod.executeTool.mockResolvedValue({ ok: true, output: { results: [] } });

    await executePlannedRun({ sb, userId: "user-1", run: run(sb) });

    expect(toolsMod.executeTool).toHaveBeenCalledTimes(3);
    const completion = runtime.completeRun.mock.calls[0]?.[0];
    const toolMessages = completion.run.messages.filter((message: any) => message.role === "tool");
    expect(toolMessages.at(-1)?.content).toContain("repeated_no_progress_blocked");
  });

  it("compacts oversized planned tool feedback while retaining useful tail content", async () => {
    const sb = db();
    let executionRound = 0;
    gateway.runChat.mockImplementation(async (args: any) => {
      if (isPlanningCall(args)) return planningResult;
      return executionRound++ === 0
        ? toolResult([{ id: "a", name: "web_search", arguments: { q: "large" } }])
        : finalResult;
    });
    toolsMod.executeTool.mockResolvedValue({
      ok: true,
      output: { blob: "X".repeat(30_000), tail_error: "PARTIAL_RESULT" },
    });

    await executePlannedRun({ sb, userId: "user-1", run: run(sb) });

    const completion = runtime.completeRun.mock.calls[0]?.[0];
    const toolMessage = completion.run.messages.find((message: any) => message.role === "tool");
    expect(toolMessage.content).toContain("PALLADIUM_TRUNCATED");
    expect(toolMessage.content).toContain("PARTIAL_RESULT");
    expect(toolMessage.content.length).toBeLessThan(7_000);
  });

  it("applies operator steering only on the next safe planned model turn", async () => {
    const sb = db();
    const executionTurns: any[][] = [];
    let executionRound = 0;
    gateway.runChat.mockImplementation(async (args: any) => {
      if (isPlanningCall(args)) return planningResult;
      executionTurns.push(args.messages.map((message: any) => ({ ...message })));
      return executionRound++ === 0
        ? toolResult([{ id: "a", name: "web_search", arguments: { q: "original" } }])
        : finalResult;
    });
    toolsMod.executeTool.mockImplementation(async (_name: string, _input: unknown, ctx: any) => {
      await ctx.sb.from("agent_activities").insert({
        user_id: "user-1",
        agent_id: "agent-1",
        kind: "operator_steering",
        message: "Focus only on verified UK suppliers.",
        metadata: { task_id: ctx.taskId, source: "operator" },
      });
      return { ok: true, output: { results: [] } };
    });

    await executePlannedRun({ sb, userId: "user-1", run: run(sb) });

    const firstSteering = executionTurns[0]?.find((message: any) => String(message.content).includes("OPERATOR STEERING"));
    const secondSteering = executionTurns[1]?.find((message: any) => String(message.content).includes("OPERATOR STEERING"));
    expect(firstSteering).toBeUndefined();
    expect(secondSteering?.content).toContain("verified UK suppliers");
  });

  it("invalidates resumability before a planned tool executes and restores it only afterward", async () => {
    const sb = db();
    let executionRound = 0;
    gateway.runChat.mockImplementation(async (args: any) => {
      if (isPlanningCall(args)) return planningResult;
      return executionRound++ === 0
        ? toolResult([{ id: "a", name: "web_search", arguments: { q: "safe" } }])
        : finalResult;
    });
    toolsMod.executeTool.mockImplementation(async () => {
      expect(sb.tables.agent_tasks[0]?.checkpoint_state).toBeNull();
      return { ok: true, output: { results: [{ title: "ok" }] } };
    });

    await executePlannedRun({ sb, userId: "user-1", run: run(sb) });

    const task = sb.tables.agent_tasks[0];
    expect(task.checkpoint_state?.safe_to_resume).toBe(true);
    expect(["tool_boundary", "model_boundary"]).toContain(task.checkpoint_state?.phase);
  });

  it("resumes from a durable checkpoint without rebuilding the plan", async () => {
    const sb = db();
    const resumePlan = {
      objective: "finish task",
      assumptions: ["already planned"],
      steps: [{ id: "step-1", title: "Execute", objective: "finish task", status: "active", success_criteria: ["done"], evidence: ["saved"] }],
      current_step_id: "step-1",
      quality_threshold: 0.8,
      verification_required: false,
      replan_count: 1,
      max_replans: 2,
    };
    const resumeCheckpoint = {
      schema: 1 as const,
      phase: "model_boundary" as const,
      safe_to_resume: true as const,
      saved_at: "2026-08-26T22:00:00.000Z",
      messages: [
        { role: "system" as const, content: "You are Atlas." },
        { role: "user" as const, content: "finish task" },
        { role: "system" as const, content: "RESUMED EVIDENCE" },
      ],
      plan: resumePlan as any,
      tool_rounds: 2,
      tool_call_count: 3,
      usage: { input: 100, output: 25 },
    };
    gateway.runChat.mockResolvedValue(finalResult);

    await executePlannedRun({
      sb,
      userId: "user-1",
      run: run(sb),
      resumeCheckpoint,
    });

    expect(gateway.runChat).toHaveBeenCalledTimes(1);
    expect(isPlanningCall(gateway.runChat.mock.calls[0]?.[0])).toBe(false);
    expect(gateway.runChat.mock.calls[0]?.[0].messages).toEqual(expect.arrayContaining([
      expect.objectContaining({ content: "RESUMED EVIDENCE" }),
    ]));
    const completion = runtime.completeRun.mock.calls[0]?.[0];
    expect(completion.result.usage).toEqual({ input: 102, output: 27 });
    expect(completion.toolCallCount).toBe(3);
  });
});
