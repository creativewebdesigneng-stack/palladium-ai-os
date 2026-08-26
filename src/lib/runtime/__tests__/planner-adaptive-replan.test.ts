import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabase } from "./fake-supabase";

const gateway = vi.hoisted(() => ({ runChat: vi.fn() }));
vi.mock("../model-gateway.server", () => ({ runChat: gateway.runChat }));

const tools = vi.hoisted(() => ({ executeTool: vi.fn() }));
vi.mock("../tools.server", () => ({ executeTool: tools.executeTool }));

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

import { executePlannedRun } from "../planner-runtime.server";

function db() {
  return createFakeSupabase({
    agent_tasks: [{ id: "task-1", status: "running", cancel_requested: false }],
    agent_activities: [],
  }) as any;
}

function preparedRun(maxReplans = 2) {
  const grants = new Map([
    ["web_search", { slug: "web_search", requiresApproval: false, allowedDomains: [], spendCap: null }],
  ]);
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
      max_tokens: 1200,
      memory_enabled: false,
      allowed_tools: ["web_search"],
      allowed_providers: [],
      requires_approval: false,
      autonomy: "supervised",
      status: "active",
      category: "general",
      operating_profile: {
        verification_required: false,
        quality_threshold: 0.8,
        max_replans: maxReplans,
      },
    },
    orgId: null,
    taskId: "task-1",
    messages: [
      { role: "system", content: "You are Atlas." },
      { role: "user", content: "Find a verified supplier." },
    ],
    tools: {
      defs: [{ name: "web_search", description: "search", parameters: {} }],
      grants,
    },
    provider: "openai" as const,
    model: "gpt-5-mini",
    startedAt: Date.now(),
  } as any;
}

const initialPlan = {
  text: JSON.stringify({
    assumptions: ["primary source is reachable"],
    steps: [
      {
        id: "step-1",
        title: "Check primary source",
        objective: "Search the primary source",
        success_criteria: ["verified result"],
      },
    ],
  }),
  toolCalls: [],
  usage: { input: 1, output: 1 },
  provider: "openai" as const,
  model: "gpt-5-mini",
};

const executionWithTool = {
  text: "I will check the primary source.",
  toolCalls: [{ id: "tool-1", name: "web_search", arguments: { q: "primary" } }],
  usage: { input: 2, output: 2 },
  provider: "openai" as const,
  model: "gpt-5-mini",
};

const finalAnswer = {
  text: "Used the fallback route and found a verified supplier.",
  toolCalls: [],
  usage: { input: 2, output: 2 },
  provider: "openai" as const,
  model: "gpt-5-mini",
};

function lastPrompt(args: any) {
  return String(args.messages?.at(-1)?.content ?? "");
}

function isObservationReplanPrompt(prompt: string) {
  return prompt.includes("current route is blocked");
}

function isInitialPlanPrompt(prompt: string) {
  return prompt.includes("planning controller") && prompt.includes("Objective:");
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("adaptive replanning from tool observations", () => {
  it("replans immediately after explicit blocking tool evidence and persists the revised route", async () => {
    const sb = db();
    const controllerPrompts: string[] = [];
    let executionRound = 0;

    gateway.runChat.mockImplementation(async (args: any) => {
      const prompt = lastPrompt(args);
      if (isObservationReplanPrompt(prompt)) {
        controllerPrompts.push(prompt);
        return {
          ...initialPlan,
          text: JSON.stringify({
            steps: [
              {
                id: "step-fallback",
                title: "Use fallback source",
                objective: "Search a different verified source",
                success_criteria: ["verified result"],
                status: "pending",
              },
            ],
          }),
        };
      }
      if (isInitialPlanPrompt(prompt)) return initialPlan;
      return executionRound++ === 0 ? executionWithTool : finalAnswer;
    });
    tools.executeTool.mockResolvedValue({
      ok: false,
      output: { error: "provider unavailable", message: "Primary source cannot be reached." },
    });

    await executePlannedRun({ sb, userId: "user-1", run: preparedRun() });

    expect(controllerPrompts).toHaveLength(1);
    expect(controllerPrompts[0]).toContain("Primary source cannot be reached");
    const persisted = sb.tables.agent_tasks[0]?.planner_state;
    expect(persisted.replan_count).toBe(1);
    expect(persisted.steps[0]?.id).toBe("step-fallback");
    const completion = runtime.completeRun.mock.calls[0]?.[0];
    expect(
      completion.run.messages.some((message: any) =>
        String(message.content).includes("TOOL EVIDENCE — EARLY RE-PLAN APPLIED"),
      ),
    ).toBe(true);
  });

  it("does not replan around an approval wait", async () => {
    const sb = db();
    let observationReplanCalls = 0;
    let executionRound = 0;
    gateway.runChat.mockImplementation(async (args: any) => {
      const prompt = lastPrompt(args);
      if (isObservationReplanPrompt(prompt)) {
        observationReplanCalls += 1;
        return initialPlan;
      }
      if (isInitialPlanPrompt(prompt)) return initialPlan;
      return executionRound++ === 0 ? executionWithTool : finalAnswer;
    });
    tools.executeTool.mockResolvedValue({
      ok: false,
      output: { status: "awaiting_approval", approval_request_id: "req-1" },
    });

    await executePlannedRun({ sb, userId: "user-1", run: preparedRun() });

    expect(observationReplanCalls).toBe(0);
    expect(runtime.setRunState).toHaveBeenCalledWith(sb, "task-1", "waiting_for_approval");
  });

  it("respects an exhausted early-replan budget", async () => {
    const sb = db();
    let observationReplanCalls = 0;
    let executionRound = 0;
    gateway.runChat.mockImplementation(async (args: any) => {
      const prompt = lastPrompt(args);
      if (isObservationReplanPrompt(prompt)) {
        observationReplanCalls += 1;
        return initialPlan;
      }
      if (isInitialPlanPrompt(prompt)) return initialPlan;
      return executionRound++ === 0 ? executionWithTool : finalAnswer;
    });
    tools.executeTool.mockResolvedValue({ ok: false, output: { error: "blocked" } });

    await executePlannedRun({ sb, userId: "user-1", run: preparedRun(0) });

    expect(observationReplanCalls).toBe(0);
    expect(sb.tables.agent_tasks[0]?.replan_count).toBe(0);
  });
});
