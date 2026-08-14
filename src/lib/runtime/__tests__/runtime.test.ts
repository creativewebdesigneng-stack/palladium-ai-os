/**
 * Agent runtime gate tests.
 *
 * Every model call is stubbed — production execution paths never use canned
 * responses, but tests must not spend provider credits or leak keys.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabase } from "./fake-supabase";

const gateway = vi.hoisted(() => ({
  runChat: vi.fn(),
  streamChat: vi.fn(),
}));

vi.mock("../model-gateway.server", async () => {
  const actual = await vi.importActual<any>("../model-gateway.server");
  return { ...actual, runChat: gateway.runChat, streamChat: gateway.streamChat };
});

const entitlements = vi.hoisted(() => ({
  getEntitlements: vi.fn(),
  recordUsage: vi.fn(async () => {}),
}));

const notifications = vi.hoisted(() => ({
  notify: vi.fn(async () => true),
  notifyUsageThreshold: vi.fn(async () => {}),
}));
vi.mock("@/lib/notifications/notify.server", () => notifications);

vi.mock("@/lib/platform/entitlements.server", async () => {
  const actual = await vi.importActual<any>("@/lib/platform/entitlements.server");
  return {
    ...actual,
    getEntitlements: entitlements.getEntitlements,
    recordUsage: entitlements.recordUsage,
  };
});

vi.mock("@/lib/memory/memory.server", () => ({
  retrieveRelevantMemory: vi.fn(async () => null),
  renderMemoryPrompt: () => "",
  storeMemory: vi.fn(async () => ({})),
  searchMemory: vi.fn(async () => []),
}));

vi.mock("@/lib/platform/audit.server", () => ({ writeAudit: vi.fn(async () => {}) }));
vi.mock("@/lib/devapi/webhooks.server", () => ({ dispatchWebhookEvent: vi.fn(async () => {}) }));

let adminDb: ReturnType<typeof createFakeSupabase>;
vi.mock("@/integrations/supabase/client.server", () => ({
  get supabaseAdmin() {
    return adminDb;
  },
}));

import { ProviderError } from "../model-gateway.server";
import {
  ACTIVE_TASK_STATES,
  executeRun,
  failRun,
  isSuccessState,
  isTerminalState,
  prepareRun,
  RuntimeError,
} from "../runtime.server";
import { executeWorkflowRun, runStep } from "../workforce.server";
import { decideWorkflowApproval } from "../workflow-approval-decision.server";
import { normaliseWorkflowStepConfig } from "../workforce.functions";
import { assertWithinLimit, EntitlementError, UNLIMITED } from "@/lib/platform/entitlements.server";

const USER = "user-1";

const AGENT = {
  id: "agent-1",
  user_id: USER,
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
  temperature: 0.3,
  max_tokens: 1024,
  memory_enabled: false,
  allowed_tools: [],
  requires_approval: false,
  autonomy: "supervised",
  status: "active",
  category: "general",
};

function plan(overrides: Partial<any> = {}) {
  return {
    planCode: "builder",
    planName: "Builder",
    status: "active",
    limits: { agents: 10, tasks_per_month: 100, seats: 3, storage_mb: 1000 },
    features: [],
    usage: { agents: 1, tasksThisMonth: 1, seats: 1 },
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    ...overrides,
  };
}

function db(agentRows: any[] = [AGENT]) {
  const sb = createFakeSupabase({
    personal_agents: agentRows,
    agent_tasks: [],
    agent_activities: [],
    personal_memories: [],
    tool_permissions: [],
    tools: [],
    tool_executions: [],
  });
  adminDb = sb;
  return sb as any;
}

function textResult(text = "Done.") {
  return {
    text,
    toolCalls: [],
    usage: { input: 10, output: 5 },
    provider: "openai" as const,
    model: "gpt-5-mini",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  entitlements.getEntitlements.mockResolvedValue(plan());
});

describe("task state machine", () => {
  it("treats both success labels as terminal", () => {
    expect(isSuccessState("succeeded")).toBe(true);
    expect(isSuccessState("completed")).toBe(true);
    expect(isTerminalState("failed")).toBe(true);
    expect(isTerminalState("cancelled")).toBe(true);
    expect(isTerminalState("waiting_for_approval")).toBe(false);
  });

  it("keeps waiting_for_tool in the recoverable set so it can never stick", () => {
    expect(ACTIVE_TASK_STATES).toContain("waiting_for_tool");
    expect(ACTIVE_TASK_STATES).toContain("queued");
  });
});

describe("agent permissions", () => {
  it("refuses to run an agent the caller cannot read", async () => {
    const sb = db([]); // RLS-equivalent: no visible row
    await expect(
      prepareRun({ sb, userId: USER, agentId: "agent-1", input: "go" }),
    ).rejects.toMatchObject({ code: "AGENT_FORBIDDEN", status: 403 });
  });

  it("refuses archived agents", async () => {
    const sb = db([{ ...AGENT, status: "archived" }]);
    await expect(
      prepareRun({ sb, userId: USER, agentId: "agent-1", input: "go" }),
    ).rejects.toMatchObject({ code: "AGENT_ARCHIVED" });
  });

  it("rejects empty input before any model spend", async () => {
    const sb = db();
    await expect(
      prepareRun({ sb, userId: USER, agentId: "agent-1", input: "  " }),
    ).rejects.toBeInstanceOf(RuntimeError);
    expect(gateway.runChat).not.toHaveBeenCalled();
  });
});

describe("subscription and usage limits", () => {
  it("blocks the run when the monthly task allowance is spent", async () => {
    entitlements.getEntitlements.mockResolvedValue(
      plan({
        limits: { agents: 3, tasks_per_month: 5, seats: 1, storage_mb: 100 },
        usage: { agents: 1, tasksThisMonth: 5, seats: 1 },
      }),
    );
    const sb = db();
    await expect(
      prepareRun({ sb, userId: USER, agentId: "agent-1", input: "go" }),
    ).rejects.toBeInstanceOf(EntitlementError);
    expect(sb.tables["agent_tasks"]).toHaveLength(0);
  });

  it("allows unlimited plans through", () => {
    expect(() =>
      assertWithinLimit(
        plan({
          limits: {
            agents: UNLIMITED,
            tasks_per_month: UNLIMITED,
            seats: UNLIMITED,
            storage_mb: UNLIMITED,
          },
        }) as any,
        "tasks_per_month",
      ),
    ).not.toThrow();
  });

  it("records provider, model, tokens, tool calls and duration on success", async () => {
    const sb = db();
    gateway.runChat.mockResolvedValue(textResult());
    const run = await prepareRun({ sb, userId: USER, agentId: "agent-1", input: "summarise" });
    await executeRun({ sb, userId: USER, run });

    const usage = entitlements.recordUsage.mock.calls.map((c: any[]) => c[0]);
    const task = usage.find((u) => u.metric === "agent_task");
    expect(task.metadata).toMatchObject({ provider: "openai", model: "gpt-5-mini", tool_calls: 0 });
    expect(task.metadata.duration_ms).toBeGreaterThanOrEqual(0);
    expect(usage.some((u) => u.metric === "tokens" && u.quantity === 15)).toBe(true);

    const row = sb.tables["agent_tasks"][0];
    expect(row.status).toBe("succeeded");
    expect(row.completed_at).toBeTruthy();
  });
});

describe("run lifecycle", () => {
  it("opens the task as queued then moves it to running", async () => {
    const sb = db();
    gateway.runChat.mockResolvedValue(textResult());
    const run = await prepareRun({ sb, userId: USER, agentId: "agent-1", input: "go" });
    const row = sb.tables["agent_tasks"][0];
    expect(row.status).toBe("running");
    expect(row.heartbeat_at).toBeTruthy();
    expect(run.taskId).toBe(row.id);
  });

  it("closes the task when the provider fails", async () => {
    const sb = db();
    gateway.runChat.mockRejectedValue(new ProviderError("Upstream model unavailable.", 503, true));
    const run = await prepareRun({ sb, userId: USER, agentId: "agent-1", input: "go" });
    await expect(executeRun({ sb, userId: USER, run })).rejects.toBeInstanceOf(ProviderError);
    const message = await failRun({
      userId: USER,
      run,
      error: new ProviderError("Upstream model unavailable.", 503, true),
    });
    expect(message).toContain("Upstream");
    const row = sb.tables["agent_tasks"][0];
    expect(row.status).toBe("failed");
    expect(row.completed_at).toBeTruthy();
  });

  it("stops between turns when the operator cancels", async () => {
    const sb = db();
    gateway.runChat.mockResolvedValue(textResult());
    const run = await prepareRun({ sb, userId: USER, agentId: "agent-1", input: "go" });
    sb.tables["agent_tasks"][0].cancel_requested = true;

    await expect(executeRun({ sb, userId: USER, run })).rejects.toMatchObject({
      code: "CANCELLED",
    });
    await failRun({ userId: USER, run, error: new RuntimeError("x", "CANCELLED", 499) });
    expect(sb.tables["agent_tasks"][0].status).toBe("cancelled");
  });

  it("propagates a workflow owner abort before making a model request", async () => {
    const sb = db();
    const run = await prepareRun({ sb, userId: USER, agentId: "agent-1", input: "go" });
    const controller = new AbortController();
    controller.abort(new RuntimeError("Workflow step timed out.", "RUN_TIMEOUT", 504));

    await expect(
      executeRun({ sb, userId: USER, run, signal: controller.signal }),
    ).rejects.toMatchObject({
      code: "RUN_TIMEOUT",
    });
    expect(gateway.runChat).not.toHaveBeenCalled();
  });

  it("does not complete a task when a provider resolves after workflow cancellation", async () => {
    const sb = db();
    const run = await prepareRun({ sb, userId: USER, agentId: "agent-1", input: "go" });
    const controller = new AbortController();
    let resolveProvider: ((value: ReturnType<typeof textResult>) => void) | undefined;
    gateway.runChat.mockImplementation(
      () => new Promise<ReturnType<typeof textResult>>((resolve) => (resolveProvider = resolve)),
    );

    const execution = executeRun({ sb, userId: USER, run, signal: controller.signal });
    await vi.waitFor(() => expect(gateway.runChat).toHaveBeenCalledOnce());
    controller.abort(new RuntimeError("Workflow cancelled.", "CANCELLED", 499));
    resolveProvider?.(textResult());

    await expect(execution).rejects.toMatchObject({ code: "CANCELLED" });
    expect(sb.tables["agent_tasks"][0].status).toBe("running");
  });

  it("never leaves a timed-out run in running", async () => {
    const sb = db();
    const run = await prepareRun({ sb, userId: USER, agentId: "agent-1", input: "go" });
    const error = new RuntimeError("The run exceeded its time budget.", "RUN_TIMEOUT", 504);
    await failRun({ userId: USER, run, error });
    const row = sb.tables["agent_tasks"][0];
    expect(row.status).toBe("failed");
    expect(row.error).toContain("time budget");
  });

  it("surfaces a friendly message and never provider internals", async () => {
    const sb = db();
    const run = await prepareRun({ sb, userId: USER, agentId: "agent-1", input: "go" });
    const message = await failRun({
      userId: USER,
      run,
      error: new Error("OPENAI_API_KEY sk-live-should-never-surface"),
    });
    expect(message).toBe("The run failed unexpectedly. Please try again.");
    expect(message).not.toContain("sk-live");
  });
});

describe("workflow built-in nodes", () => {
  it("preserves bounded JSON-safe workflow config for persisted steps", () => {
    expect(
      normaliseWorkflowStepConfig("notification", {
        title: "Done",
        future_node_option: { mode: "brief" },
      }),
    ).toEqual({
      title: "Done",
      future_node_option: { mode: "brief" },
    });
    expect(() => normaliseWorkflowStepConfig("delay", { duration_ms: 300_001 })).toThrow(
      "duration_ms",
    );
  });

  function step(kind: string, config: Record<string, unknown> = {}) {
    return {
      id: `step-${kind}`,
      workflow_id: "workflow-1",
      position: 0,
      name: kind,
      kind,
      agent_id: null,
      mode: "sequential",
      depends_on: [],
      condition: {},
      input_template: null,
      max_retries: 1,
      retry_delay_ms: 0,
      timeout_ms: 5_000,
      continue_on_error: false,
      requires_approval: false,
      config,
    };
  }
  async function builtIn(kind: string, config: Record<string, unknown> = {}, signal?: AbortSignal) {
    const sb = db();
    const args = {
      sb,
      db: sb,
      userId: USER,
      orgId: null,
      runId: "run-1",
      workflowName: "Workflow",
      step: step(kind, config),
      input: "go",
      objective: "go",
      upstream: [],
      completed: [],
    };
    return runStep(signal ? { ...args, signal } : args);
  }

  it("runs a delay without an agent and records its step ledger", async () => {
    const outcome = await builtIn("delay", { duration_ms: 0 });
    expect(outcome).toMatchObject({
      status: "succeeded",
      output: "Delayed for 0 ms.",
      tokens_in: 0,
      tokens_out: 0,
    });
  });

  it("stops a delay when its workflow is cancelled", async () => {
    const controller = new AbortController();
    const running = builtIn("delay", { duration_ms: 300_000 }, controller.signal);
    controller.abort(new RuntimeError("cancelled", "CANCELLED", 499));
    await expect(running).rejects.toMatchObject({ code: "CANCELLED" });
  });

  it("delivers a notification without an agent through the real notification path", async () => {
    const outcome = await builtIn("notification", {
      title: "Workflow update",
      body: "Finished",
      type: "workflow.completed",
      link: "/workforce",
    });
    expect(outcome.status).toBe("succeeded");
    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER, type: "workflow.completed" }),
    );
  });

  it("fails unsupported non-agent nodes clearly", async () => {
    const outcome = await builtIn("loop");
    expect(outcome).toMatchObject({
      status: "failed",
      error: expect.stringContaining("Unsupported workflow step kind"),
    });
  });
});

describe("workflow approval gates", () => {
  function workflowStep(id: string, position: number, kind: string, overrides: Record<string, unknown> = {}) {
    return {
      id,
      workflow_id: "workflow-1",
      position,
      name: id,
      kind,
      agent_id: null,
      mode: "sequential",
      depends_on: [],
      condition: {},
      input_template: null,
      max_retries: 1,
      retry_delay_ms: 0,
      timeout_ms: 5_000,
      continue_on_error: false,
      requires_approval: kind === "approval",
      config: kind === "delay" ? { duration_ms: 0 } : {},
      ...overrides,
    };
  }

  function workflowDb(extra: Record<string, any[]> = {}) {
    const sb = createFakeSupabase({
      personal_agents: [AGENT],
      agent_tasks: [],
      agent_activities: [],
      personal_memories: [],
      tool_permissions: [],
      tools: [],
      tool_executions: [],
      workflow_runs: [
        {
          id: "run-1",
          workflow_id: "workflow-1",
          workforce_id: null,
          org_id: null,
          user_id: USER,
          status: "running",
          cancel_requested: false,
          input: "objective",
          step_results: [],
          tokens_in: 0,
          tokens_out: 0,
        },
      ],
      workflow_step_runs: [],
      approval_requests: [],
      agent_messages: [],
      workflows: [
        {
          id: "workflow-1",
          name: "Approval workflow",
          org_id: null,
          user_id: USER,
          workforce_id: null,
          status: "active",
        },
      ],
      workflow_steps: [],
      ...extra,
    });
    adminDb = sb;
    return sb as any;
  }

  it("pauses on an approval node and persists the durable gate", async () => {
    const approval = workflowStep("approval-1", 0, "approval", {
      config: { title: "Review change", summary: "Confirm before continuing.", risk_level: "medium" },
    });
    const downstream = workflowStep("delay-1", 1, "delay");
    const sb = workflowDb({ workflow_steps: [approval, downstream] });

    const result = await executeWorkflowRun({
      sb,
      db: sb,
      userId: USER,
      workflow: sb.tables.workflows[0],
      steps: sb.tables.workflow_steps,
      runId: "run-1",
      objective: "objective",
      completed: [],
    });

    expect(result.paused).toBe(true);
    expect(sb.tables.approval_requests).toHaveLength(1);
    expect(sb.tables.approval_requests[0]).toMatchObject({
      user_id: USER,
      action_type: "workflow_step",
      status: "pending",
      details: expect.objectContaining({
        workflow_run_id: "run-1",
        workflow_id: "workflow-1",
        workflow_step_id: "approval-1",
      }),
    });
    expect(sb.tables.workflow_runs[0]).toMatchObject({
      status: "waiting_for_approval",
      waiting_step_id: "approval-1",
    });
    expect(sb.tables.workflow_step_runs).toHaveLength(1);
    expect(sb.tables.workflow_step_runs[0].status).toBe("waiting_for_approval");
    expect(sb.tables.workflow_step_runs.some((row: any) => row.step_id === "delay-1")).toBe(false);
  });

  it("resumes the same run without replaying completed upstream work", async () => {
    const upstream = workflowStep("delay-before", 0, "delay");
    const approval = workflowStep("approval-1", 1, "approval");
    const downstream = workflowStep("delay-after", 2, "delay");
    const completedUpstream = {
      step_id: "delay-before",
      step_run_id: "step-run-before",
      name: "delay-before",
      agent_id: null,
      status: "succeeded" as const,
      output: "Delayed for 0 ms.",
      error: null,
      attempts: 1,
      duration_ms: 0,
      tokens_in: 0,
      tokens_out: 0,
    };
    const sb = workflowDb({ workflow_steps: [upstream, approval, downstream] });
    sb.tables.workflow_runs[0].step_results = [completedUpstream];

    const paused = await executeWorkflowRun({
      sb,
      db: sb,
      userId: USER,
      workflow: sb.tables.workflows[0],
      steps: sb.tables.workflow_steps,
      runId: "run-1",
      objective: "objective",
      completed: [completedUpstream],
    });
    expect(paused.paused).toBe(true);
    const request = sb.tables.approval_requests[0];
    const beforeCount = sb.tables.workflow_step_runs.filter((row: any) => row.step_id === "delay-before").length;

    const resumed = await decideWorkflowApproval({
      sb,
      userId: USER,
      approvalRequestId: request.id,
      decision: "approved",
    });

    expect(resumed.run.status).toBe("succeeded");
    expect(sb.tables.workflow_runs).toHaveLength(1);
    expect(sb.tables.workflow_step_runs.filter((row: any) => row.step_id === "delay-before")).toHaveLength(beforeCount);
    expect(sb.tables.workflow_step_runs.some((row: any) => row.step_id === "delay-after" && row.status === "succeeded")).toBe(true);
    expect(sb.tables.workflow_runs[0].step_results.map((row: any) => row.step_id)).toEqual([
      "delay-before",
      "approval-1",
      "delay-after",
    ]);
  });

  it("does not resume a workflow that was cancelled while waiting", async () => {
    const approval = workflowStep("approval-1", 0, "approval");
    const sb = workflowDb({ workflow_steps: [approval] });
    const paused = await executeWorkflowRun({
      sb,
      db: sb,
      userId: USER,
      workflow: sb.tables.workflows[0],
      steps: sb.tables.workflow_steps,
      runId: "run-1",
      objective: "objective",
      completed: [],
    });
    expect(paused.paused).toBe(true);
    const request = sb.tables.approval_requests[0];
    sb.tables.workflow_runs[0].cancel_requested = true;
    sb.tables.workflow_runs[0].status = "cancelled";

    await expect(
      decideWorkflowApproval({
        sb,
        userId: USER,
        approvalRequestId: request.id,
        decision: "approved",
      }),
    ).rejects.toMatchObject({ code: "NOT_WAITING" });
    expect(sb.tables.workflow_runs[0].status).toBe("cancelled");
    expect(sb.tables.workflow_step_runs).toHaveLength(1);
  });
});
