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

vi.mock("@/lib/platform/audit.server", () => ({ writeAudit: vi.fn(async () => {}), writeAuditRequired: vi.fn(async () => "audit-id") }));
vi.mock("@/lib/devapi/webhooks.server", () => ({ dispatchWebhookEvent: vi.fn(async () => {}) }));

let adminDb: ReturnType<typeof createFakeSupabase>;
vi.mock("@/integrations/supabase/client.server", () => ({
  get supabaseAdmin() {
    return adminDb;
  },
}));

import * as credentials from "../model-provider-credentials.server";
import * as audit from "@/lib/platform/audit.server";
import { ProviderError } from "../model-gateway.server";
import {
  ACTIVE_TASK_STATES,
  executeRun,
  failRun,
  isSuccessState,
  isTerminalState,
  prepareRun,
  streamRun,
  completeRun,
  runtimeConnectedServiceReadSpec,
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
  it('rejects obsolete tool assignments before creating a misleading no-tool run', async () => {
    const sb = db([{ ...AGENT, allowed_tools: ['web', 'files', 'api', 'workflow'] }]);
    await expect(prepareRun({ sb, userId: USER, agentId: AGENT.id, input: 'go' })).rejects.toMatchObject({ code: 'INVALID_TOOL_ASSIGNMENTS' });
    expect(sb.tables.agent_tasks).toHaveLength(0);
    expect(gateway.runChat).not.toHaveBeenCalled();
  });
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

describe('NVIDIA owner-key vs operator Dell model selection at task creation', () => {
  it('persists the NVIDIA hosted preset for a personal key instead of Dell server model ID', async () => {
    const originalBase = process.env['NVIDIA_NIM_BASE_URL'];
    const originalModel = process.env['NVIDIA_NIM_MODEL'];
    const originalKey = process.env['NVIDIA_API_KEY'];
    process.env['NVIDIA_NIM_BASE_URL'] = 'https://dell-nim.example/v1';
    process.env['NVIDIA_NIM_MODEL'] = 'dell/local-only-model';
    process.env['NVIDIA_API_KEY'] = 'synthetic-workspace-key';
    const access = vi.spyOn(credentials, 'resolveUserModelProviderAccess')
      .mockResolvedValue({ provider: 'nvidia', apiKey: 'synthetic-personal-key' });
    const availability = vi.spyOn(credentials, 'isProviderAvailableForUser')
      .mockResolvedValue(true);
    try {
      const sb = db([{ ...AGENT, model_provider: 'nvidia', model: 'openai/gpt-oss-20b' }]);
      const run = await prepareRun({ sb, userId: USER, agentId: AGENT.id, input: 'QA model selection' });
      expect(run.provider).toBe('nvidia');
      expect(run.model).toBe('openai/gpt-oss-20b');
      expect(sb.tables.agent_tasks[0]?.['model']).toBe('openai/gpt-oss-20b');
      expect(sb.tables.agent_tasks[0]?.['provider']).toBe('nvidia');
      expect(JSON.stringify(sb.tables.agent_tasks)).not.toContain('synthetic-personal-key');
      expect(JSON.stringify(sb.tables.agent_tasks)).not.toContain('dell/local-only-model');
      expect(access).toHaveBeenCalledWith({ userId: USER, provider: 'nvidia' });
      expect(availability).toHaveBeenCalledWith({ userId: USER, provider: 'nvidia' });
      expect(gateway.runChat).not.toHaveBeenCalled();
    } finally {
      access.mockRestore();
      availability.mockRestore();
      if (originalBase === undefined) delete process.env['NVIDIA_NIM_BASE_URL'];
      else process.env['NVIDIA_NIM_BASE_URL'] = originalBase;
      if (originalModel === undefined) delete process.env['NVIDIA_NIM_MODEL'];
      else process.env['NVIDIA_NIM_MODEL'] = originalModel;
      if (originalKey === undefined) delete process.env['NVIDIA_API_KEY'];
      else process.env['NVIDIA_API_KEY'] = originalKey;
    }
  });

  it('rejects an explicit Dell-only model for a personal NVIDIA key before queuing any task', async () => {
    const originalBase = process.env['NVIDIA_NIM_BASE_URL'];
    const originalModel = process.env['NVIDIA_NIM_MODEL'];
    const originalKey = process.env['NVIDIA_API_KEY'];
    process.env['NVIDIA_NIM_BASE_URL'] = 'https://dell-nim.example/v1';
    process.env['NVIDIA_NIM_MODEL'] = 'dell/local-only-model';
    process.env['NVIDIA_API_KEY'] = 'synthetic-workspace-key';
    const access = vi.spyOn(credentials, 'resolveUserModelProviderAccess')
      .mockResolvedValue({ provider: 'nvidia', apiKey: 'synthetic-personal-key' });
    const availability = vi.spyOn(credentials, 'isProviderAvailableForUser')
      .mockResolvedValue(true);
    try {
      const sb = db([{ ...AGENT, model_provider: 'nvidia', model: 'dell/local-only-model' }]);
      await expect(prepareRun({
        sb, userId: USER, agentId: AGENT.id, input: 'Do not queue wrong model',
      })).rejects.toMatchObject({ status: 400 });
      expect(sb.tables.agent_tasks).toHaveLength(0);
      expect(gateway.runChat).not.toHaveBeenCalled();
    } finally {
      access.mockRestore();
      availability.mockRestore();
      if (originalBase === undefined) delete process.env['NVIDIA_NIM_BASE_URL'];
      else process.env['NVIDIA_NIM_BASE_URL'] = originalBase;
      if (originalModel === undefined) delete process.env['NVIDIA_NIM_MODEL'];
      else process.env['NVIDIA_NIM_MODEL'] = originalModel;
      if (originalKey === undefined) delete process.env['NVIDIA_API_KEY'];
      else process.env['NVIDIA_API_KEY'] = originalKey;
    }
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
    expect(run.messages[0]?.content).toContain("invoke that tool with the exact intended arguments");
    expect(run.messages[0]?.content).toContain("Writing an approval request in your answer does not queue an approval");
    await executeRun({ sb, userId: USER, run });

    const usage = entitlements.recordUsage.mock.calls.map((c: any[]) => c[0]);
    const task = usage.find((u) => u.metric === "agent_task");
    expect(task.metadata).toMatchObject({ provider: "openai", model: "gpt-5-mini", tool_calls: 0 });
    expect(task.metadata.duration_ms).toBeGreaterThanOrEqual(0);
    expect(usage.some((u) => u.metric === "tokens" && u.quantity === 15)).toBe(true);

    const row = sb.tables["agent_tasks"][0];
    expect(row.status).toBe("succeeded");
    expect(row.tool_calls).toBe(0);
    expect(row.output.tool_calls).toBe(0);
    expect(row.completed_at).toBeTruthy();
  });
});

describe("run lifecycle", () => {
  it("matches only an assigned and granted GitHub repository read fallback", () => {
    const run = {
      agent: { ...AGENT, allowed_providers: ["github"] },
      messages: [{ role: "user", content: "Use GitHub to list my five repositories." }],
      tools: {
        defs: [],
        grants: new Map([
          [
            "connected_service",
            { slug: "connected_service", requiresApproval: false, allowedDomains: [], spendCap: null },
          ],
        ]),
      },
    } as any;

    expect(runtimeConnectedServiceReadSpec(run)).toEqual({
      provider: "github",
      action: "repositories_list",
      limit: 5,
    });
    expect(
      runtimeConnectedServiceReadSpec({
        ...run,
        agent: { ...run.agent, allowed_providers: [] },
      }),
    ).toBeNull();
    expect(
      runtimeConnectedServiceReadSpec({
        ...run,
        messages: [{ role: "user", content: "Create a GitHub issue." }],
      }),
    ).toBeNull();
  });

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

  it.each([false, true])("never overwrites an operator cancellation when a provider finishes (stream=%s)", async streaming => {
    const sb = db();
    const run = await prepareRun({ sb, userId: USER, agentId: "agent-1", input: "go" });
    const cancelDuringProvider = () => {
      Object.assign(sb.tables['agent_tasks']![0]!, { status: "cancelled", cancel_requested: true });
      return textResult();
    };
    gateway.runChat.mockImplementation(async () => cancelDuringProvider());
    gateway.streamChat.mockImplementation(async function* () {
      yield { type: "done", result: cancelDuringProvider() };
    });
    if (streaming) {
      const events = [];
      for await (const event of streamRun({ sb, userId: USER, run })) events.push(event);
      expect(events.some(event => event.type === "complete")).toBe(false);
      expect(events.some(event => event.type === "error")).toBe(true);
    } else {
      await expect(executeRun({ sb, userId: USER, run })).rejects.toMatchObject({ code: "CANCELLED" });
    }
    expect(sb.tables['agent_tasks']?.[0]?.['status']).toBe("cancelled");
    expect(sb.tables['agent_tasks']?.[0]?.['output_text']).toBeUndefined();
    expect(entitlements.recordUsage).not.toHaveBeenCalled();
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
      task_id: null,
      verification_score: null,
      verification_passed: null,
      skill_feedback: null,
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

  async function pauseAtApproval(extraSteps: any[] = []) {
    const approval = workflowStep("approval-1", 0, "approval");
    const protectedStep = workflowStep("delay-after", 1, "delay");
    const sb = workflowDb({ workflow_steps: [approval, protectedStep, ...extraSteps] });
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
    return { sb, request: sb.tables.approval_requests[0] };
  }

  it("rejection marks the run terminal and never executes the gated work", async () => {
    const { sb, request } = await pauseAtApproval();

    const decided = await decideWorkflowApproval({
      sb,
      userId: USER,
      approvalRequestId: request.id,
      decision: "rejected",
      note: "Not authorised.",
    });

    expect(decided.run.status).toBe("failed");
    expect(sb.tables.approval_requests[0].status).toBe("rejected");
    expect(sb.tables.workflow_step_runs.some((row: any) => row.step_id === "delay-after")).toBe(false);
    expect(
      sb.tables.workflow_step_runs.find((row: any) => row.step_id === "approval-1").status,
    ).toBe("failed");
  });

  it("rejects a second decision on an already decided approval", async () => {
    const { sb, request } = await pauseAtApproval();
    await decideWorkflowApproval({
      sb,
      userId: USER,
      approvalRequestId: request.id,
      decision: "rejected",
    });

    await expect(
      decideWorkflowApproval({
        sb,
        userId: USER,
        approvalRequestId: request.id,
        decision: "approved",
      }),
    ).rejects.toMatchObject({ code: "ALREADY_DECIDED" });
    expect(sb.tables.approval_requests[0].status).toBe("rejected");
    expect(sb.tables.workflow_step_runs.some((row: any) => row.step_id === "delay-after")).toBe(false);
  });

  it("refuses a decision from another user", async () => {
    const { sb, request } = await pauseAtApproval();

    await expect(
      decideWorkflowApproval({
        sb,
        userId: "00000000-0000-4000-8000-00000000dead",
        approvalRequestId: request.id,
        decision: "approved",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(sb.tables.approval_requests[0].status).toBe("pending");
    expect(sb.tables.workflow_runs[0].status).toBe("waiting_for_approval");
  });

  it("refuses a stale or mismatched approval association", async () => {
    const { sb, request } = await pauseAtApproval();
    sb.tables.workflow_runs[0].waiting_step_id = "some-other-step";

    await expect(
      decideWorkflowApproval({
        sb,
        userId: USER,
        approvalRequestId: request.id,
        decision: "approved",
      }),
    ).rejects.toMatchObject({ code: "STALE_APPROVAL" });
    expect(sb.tables.approval_requests[0].status).toBe("pending");
    expect(sb.tables.workflow_step_runs.some((row: any) => row.step_id === "delay-after")).toBe(false);
  });

  it("leaves workflows without approval steps untouched", async () => {
    const sb = workflowDb({
      workflow_steps: [workflowStep("delay-1", 0, "delay"), workflowStep("delay-2", 1, "delay")],
    });

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

    expect(result.paused ?? false).toBe(false);
    expect(result.run.status).toBe("succeeded");
    expect(sb.tables.approval_requests).toHaveLength(0);
    expect(sb.tables.workflow_runs[0].waiting_approval_request_id ?? null).toBeNull();
  });

  it("fails the decision when the approval step ledger cannot be finalised", async () => {
    const { sb, request } = await pauseAtApproval();
    const healthy = sb.from.bind(sb);
    adminDb = {
      ...sb,
      from: (name: string) => {
        const builder = healthy(name);
        if (name !== "workflow_step_runs") return builder;
        const failing: any = new Proxy(builder, {
          get(target, prop) {
            if (prop === "then")
              return (resolve: (v: any) => unknown) =>
                Promise.resolve(resolve({ data: null, error: { message: "ledger write failed" } }));
            if (prop === "maybeSingle" || prop === "single")
              return () => Promise.resolve({ data: null, error: { message: "ledger write failed" } });
            const value = (target as any)[prop];
            return typeof value === "function" ? (...a: unknown[]) => (value.apply(target, a), failing) : value;
          },
        });
        return failing;
      },
    } as any;

    await expect(
      decideWorkflowApproval({
        sb,
        userId: USER,
        approvalRequestId: request.id,
        decision: "approved",
      }),
    ).rejects.toMatchObject({ code: "APPROVAL_STEP_LEDGER_FAILED" });
    expect(sb.tables.workflow_step_runs.some((row: any) => row.step_id === "delay-after")).toBe(false);
  });
});



describe("model recovery boundaries", () => {
  it("uses the actual completed model for receipts, usage and audit provenance", async () => {
    const sb = db();
    const run = await prepareRun({ sb, userId: USER, agentId: AGENT.id, input: "go" });
    const result = { ...textResult(), model: "gpt-4.1-mini" };
    await completeRun({ sb, userId: USER, run, result, toolCallCount: 0 });
    expect(sb.tables.agent_tasks[0]).toMatchObject({ status: "succeeded", model: result.model, provider: result.provider });
    const usage = entitlements.recordUsage.mock.calls.map(call => (call as unknown[])[0]) as any[];
    expect(usage).toHaveLength(2);
    for (const row of usage) expect(row.metadata).toMatchObject({ provider: result.provider, model: result.model });
    expect(audit.writeAuditRequired).toHaveBeenCalledWith(expect.objectContaining({ action: "agent.run_result", metadata: expect.objectContaining({ model: result.model }) }));
    expect(audit.writeAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "agent.run", metadata: expect.objectContaining({ model: result.model }) }));
  });
  it("maps the observed legacy Gemini label before queueing and invoking", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-only");
    const sb = db([{...AGENT, model: "Gemini"}]);
    try {
      const run = await prepareRun({sb,userId:USER,agentId:AGENT.id,input:"Reply QA AGENT ONLINE"});
      expect(run).toMatchObject({provider:"gemini",model:"gemini-3.6-flash"});
      expect(sb.tables.agent_tasks[0]).toMatchObject({provider:"gemini",model:"gemini-3.6-flash"});
    } finally {vi.unstubAllEnvs();}
  });
  it("queues nothing and invokes no model when required audit fails", async () => {
    const sb=db();vi.mocked(audit.writeAuditRequired).mockRejectedValueOnce(Error("private upstream detail"));
    await expect(prepareRun({sb,userId:USER,agentId:AGENT.id,input:"go"})).rejects.toMatchObject({code:"AUDIT_UNAVAILABLE",status:503});
    expect(sb.tables.agent_tasks).toHaveLength(0);expect(gateway.runChat).not.toHaveBeenCalled();
  });
  it("closes a streamed credential lookup failure through the authenticated owner client", async () => {
    const sb=db();const run=await prepareRun({sb,userId:USER,agentId:AGENT.id,input:"go"});
    adminDb=createFakeSupabase();
    vi.spyOn(credentials,"resolveUserModelProviderAccess").mockRejectedValueOnce(new ProviderError("Personal credentials unavailable. Check server configuration.",503,true));
    const events=[];for await(const event of streamRun({sb,userId:USER,run}))events.push(event);
    expect(events.at(-1)).toMatchObject({type:"error",message:expect.stringContaining("Personal credentials unavailable")});
    expect(sb.tables.agent_tasks[0]).toMatchObject({status:"failed",completed_at:expect.any(String)});
    expect(gateway.streamChat).not.toHaveBeenCalled();
  });
  it("does not report completion without a persisted owner-bound receipt", async () => {
    const sb=db();const run=await prepareRun({sb,userId:USER,agentId:AGENT.id,input:"go"});adminDb=createFakeSupabase();
    await expect(completeRun({sb,userId:USER,run,result:textResult(),toolCallCount:0})).rejects.toMatchObject({code:"RUN_PERSISTENCE_FAILED"});
    expect(sb.tables.agent_tasks[0].status).not.toBe("succeeded");
  });
  it("reports failure persistence problems instead of claiming the task was closed", async () => {
    const sb=db();const run=await prepareRun({sb,userId:USER,agentId:AGENT.id,input:"go"});
    const message=await failRun({sb:createFakeSupabase(),userId:USER,run,error:new ProviderError("Provider unavailable.",503,true)});
    expect(message).toContain("Run status could not be saved");
  });
});


describe("honest completion after blocked tools", () => {
  it("rejects empty completion before persisting success or usage", async () => {
    const sb = db(); const run = await prepareRun({ sb, userId: USER, agentId: AGENT.id, input: "go" });
    await expect(completeRun({ sb, userId: USER, run, result: textResult("  "), toolCallCount: 1 })).rejects.toMatchObject({ code: "EMPTY_RUN_OUTPUT" });
    expect(sb.tables.agent_tasks[0].status).not.toBe("succeeded");
    expect(entitlements.recordUsage).not.toHaveBeenCalled();
    expect(audit.writeAuditRequired).not.toHaveBeenCalledWith(expect.objectContaining({ action: "agent.run_result" }));
  });
  it("does not complete a stream when its model returns no deliverable", async () => {
    const sb = db(); const run = await prepareRun({ sb, userId: USER, agentId: AGENT.id, input: "go" });
    gateway.streamChat.mockImplementationOnce(async function* () { yield { type: "done", result: textResult("") }; });
    const events = []; for await (const event of streamRun({ sb, userId: USER, run })) events.push(event);
    expect(events.some(event => event.type === "complete")).toBe(false);
    expect(sb.tables.agent_tasks[0].status).toBe("failed");
  });
  it.each([false, true])("does not label approval-blocked browser work complete (stream=%s)", async (stream) => {
    const sb = db([{ ...AGENT, allowed_tools: ["browser"], requires_approval: true }]);
    sb.tables.tools.push({ slug: "browser", is_active: true }, { slug: "browser_task", is_active: true });
    sb.tables.tool_permissions.push({ tool: "browser", agent_id: AGENT.id, enabled: true, requires_approval: true, allowed_domains: ["httpbingo.org"] });
    const run = await prepareRun({ sb, userId: USER, agentId: AGENT.id, input: "Open https://httpbingo.org/html" });
    const call = { ...textResult(""), toolCalls: [{ id: "browser-call", name: "browser", arguments: { action: "navigate", url: "https://httpbingo.org/html" } }] };
    if (stream) {
      gateway.streamChat.mockImplementationOnce(async function* () { yield { type: "done", result: call }; });
      const events = []; for await (const event of streamRun({ sb, userId: USER, run })) events.push(event);
      expect(events.some(event => event.type === "complete")).toBe(false);
      expect(sb.tables.agent_tasks[0].status).toBe("failed");
      expect(events.at(-1)).toMatchObject({ type: "error", message: expect.stringContaining("no executable approval request") });
    } else {
      gateway.runChat.mockResolvedValueOnce(call);
      await expect(executeRun({ sb, userId: USER, run })).rejects.toMatchObject({ code: "APPROVAL_NOT_QUEUED" });
      expect(sb.tables.agent_tasks[0].status).not.toBe("succeeded");
    }
    expect(sb.tables.tool_executions).toEqual([expect.objectContaining({ tool: "browser", status: "failed" })]);
    expect(sb.tables.approval_requests ?? []).toHaveLength(0);
  });
});


describe('NVIDIA agent tool approval evidence', () => {
  it.each([false, true])('queues NVIDIA browser tool approval without execution (stream=%s)', async stream => {
    vi.stubEnv('NVIDIA_NIM_BASE_URL', 'https://operator.dell.example/v1');
    vi.stubEnv('NVIDIA_NIM_MODEL', 'dell/operator-model');
    vi.stubEnv('NVIDIA_API_KEY', 'synthetic-operator-key');
    const ownerKey = 'synthetic-nvidia-personal-secret';
    const access = vi.spyOn(credentials, 'resolveUserModelProviderAccess')
      .mockResolvedValue({ provider: 'nvidia', apiKey: ownerKey });
    const available = vi.spyOn(credentials, 'isProviderAvailableForUser')
      .mockResolvedValue(true);
    try {
      const sb = db([{
        ...AGENT, model_provider: 'nvidia', model: 'openai/gpt-oss-20b',
        allowed_tools: ['browser'], requires_approval: true,
      }]);
      sb.tables.tools.push(
        { slug: 'browser', is_active: true },
        { slug: 'browser_task', is_active: true },
      );
      sb.tables.tool_permissions.push({
        tool: 'browser', agent_id: AGENT.id, enabled: true,
        requires_approval: true, allowed_domains: ['httpbingo.org'],
      });
      const run = await prepareRun({
        sb, userId: USER, agentId: AGENT.id, input: 'Read https://httpbingo.org/html',
      });
      expect(run).toMatchObject({ provider: 'nvidia', model: 'openai/gpt-oss-20b' });
      expect(run.tools.defs.map(tool => tool.name)).toContain('browser_task');

      // Simulated NVIDIA result only. Existing runtime must queue approval and
      // NOT open the browser or dispatch the tool before operator permission.
      const modelResult = {
        text: '', provider: 'nvidia' as const, model: 'openai/gpt-oss-20b',
        toolCalls: [{
          id: 'nvidia-browser-call', name: 'browser_task',
          arguments: { steps: [
            { action: 'navigate', url: 'https://httpbingo.org/html' },
            { action: 'extract', selector: 'body' },
          ] },
        }],
        usage: { input: 21, output: 12 },
      };
      if (stream) {
        gateway.streamChat.mockImplementationOnce(async function* () {
          yield { type: 'tool_calls', toolCalls: modelResult.toolCalls };
          yield { type: 'done', result: modelResult };
        });
        const events = [];
        for await (const event of streamRun({ sb, userId: USER, run })) events.push(event);
        expect(events.at(-1)).toMatchObject({
          type: 'paused', task: { status: 'waiting_for_approval' },
        });
        expect(events.some(event => event.type === 'complete')).toBe(false);
      } else {
        gateway.runChat.mockResolvedValueOnce(modelResult);
        expect(await executeRun({ sb, userId: USER, run }))
          .toMatchObject({ status: 'waiting_for_approval' });
      }
      const invoked = stream ? gateway.streamChat : gateway.runChat;
      expect(invoked).toHaveBeenCalledTimes(1);
      expect(invoked).toHaveBeenCalledWith(expect.objectContaining({
        provider: 'nvidia', model: 'openai/gpt-oss-20b',
        providerAccess: { provider: 'nvidia', apiKey: ownerKey },
        allowedProviders: ['nvidia'],
      }));
      expect(sb.tables.approval_requests).toEqual([expect.objectContaining({
        action_type: 'agent_browser_task', status: 'pending',
      })]);
      expect(sb.tables.agent_tasks[0]).toMatchObject({
        provider: 'nvidia', model: 'openai/gpt-oss-20b',
        status: 'waiting_for_approval', waiting_approval_request_id: expect.any(String),
        tokens_in: 21, tokens_out: 12, tool_calls: 1,
      });
      expect(sb.tables.tool_executions).toHaveLength(0);
      // The credential must never be persisted in an agent task or approval.
      expect(JSON.stringify(sb.tables.agent_tasks)).not.toContain(ownerKey);
      expect(JSON.stringify(sb.tables.approval_requests)).not.toContain(ownerKey);
      expect(access).toHaveBeenCalledWith({ userId: USER, provider: 'nvidia' });
    } finally {
      access.mockRestore();
      available.mockRestore();
      vi.unstubAllEnvs();
    }
  });
});

describe('durable browser approval pause', () => {
  it.each([false, true])('fails closed when the deployed approval columns are missing (stream=%s)', async stream => {
    const sb = db([{ ...AGENT, allowed_tools: ['browser'], requires_approval: true }]);
    sb.tables.tools.push({ slug: 'browser', is_active: true }, { slug: 'browser_task', is_active: true });
    sb.tables.tool_permissions.push({ tool: 'browser', agent_id: AGENT.id, enabled: true, requires_approval: true, allowed_domains: ['httpbingo.org'] });
    const run = await prepareRun({ sb, userId: USER, agentId: AGENT.id, input: 'Read https://httpbingo.org/html' });
    const from = sb.from.bind(sb);
    vi.spyOn(sb, 'from').mockImplementation(name => {
      const query = from(name);
      if (name === 'agent_tasks') {
        const select = query.select.bind(query);
        query.select = (columns?: string, ...rest: any[]) => {
          if (columns?.includes('waiting_approval_request_id')) query.maybeSingle = async () => ({ data: null, error: { code: '42703', message: 'column does not exist' } });
          return select(columns, ...rest);
        };
      }
      return query;
    });
    const call = { ...textResult(''), toolCalls: [{ id: 'read-page', name: 'browser_task', arguments: { steps: [{ action: 'navigate', url: 'https://httpbingo.org/html' }, { action: 'extract', selector: 'body' }] } }] };
    if (stream) {
      gateway.streamChat.mockImplementationOnce(async function* () { yield { type: 'done', result: call }; });
      const events = []; for await (const event of streamRun({ sb, userId: USER, run })) events.push(event);
      expect(events.at(-1)).toMatchObject({ type: 'error', message: expect.stringContaining('no executable approval request') });
      expect(events.some(event => event.type === 'complete' || event.type === 'paused')).toBe(false);
      expect(sb.tables.agent_tasks[0].status).toBe('failed');
      expect(gateway.streamChat).toHaveBeenCalledTimes(1);
    } else {
      gateway.runChat.mockResolvedValueOnce(call);
      await expect(executeRun({ sb, userId: USER, run })).rejects.toMatchObject({ code: 'APPROVAL_NOT_QUEUED' });
      expect(gateway.runChat).toHaveBeenCalledTimes(1);
    }
    expect(sb.tables.agent_tasks[0].status).not.toBe('succeeded');
    expect(sb.tables.approval_requests ?? []).toHaveLength(0);
    expect(sb.tables.tool_executions).toEqual([expect.objectContaining({ tool: 'browser_task', status: 'failed' })]);
  });
  it.each([false, true])('pauses without a second model turn or completion (stream=%s)', async stream => {
    const sb = db([{ ...AGENT, allowed_tools: ['browser'], requires_approval: true }]);
    sb.tables.tools.push({ slug: 'browser', is_active: true }, { slug: 'browser_task', is_active: true });
    sb.tables.tool_permissions.push({ tool: 'browser', agent_id: AGENT.id, enabled: true, requires_approval: true, allowed_domains: ['httpbingo.org'] });
    const run = await prepareRun({ sb, userId: USER, agentId: AGENT.id, input: 'Read https://httpbingo.org/html' });
    expect(run.tools.defs.map(tool => tool.name)).toContain('browser_task');
    expect(run.tools.defs.map(tool => tool.name)).not.toContain('browser');
    const call = { ...textResult(''), toolCalls: [{ id: 'read-page', name: 'browser_task', arguments: { steps: [{ action: 'navigate', url: 'https://httpbingo.org/html' }, { action: 'extract', selector: 'body' }] } }, { id: 'later', name: 'current_time', arguments: {} }] };
    if (stream) {
      gateway.streamChat.mockImplementationOnce(async function* () { yield { type: 'done', result: call }; });
      const events = []; for await (const event of streamRun({ sb, userId: USER, run })) events.push(event);
      expect(events.at(-1)).toMatchObject({ type: 'paused', task: { status: 'waiting_for_approval' } });
      expect(gateway.streamChat).toHaveBeenCalledTimes(1);
      expect(events.some(event => event.type === 'complete')).toBe(false);
    } else {
      gateway.runChat.mockResolvedValueOnce(call);
      expect(await executeRun({ sb, userId: USER, run })).toMatchObject({ status: 'waiting_for_approval' });
      expect(gateway.runChat).toHaveBeenCalledTimes(1);
    }
    expect(sb.tables.approval_requests).toEqual([expect.objectContaining({ action_type: 'agent_browser_task', status: 'pending' })]);
    expect(sb.tables.agent_tasks[0]).toMatchObject({ status: 'waiting_for_approval', waiting_approval_request_id: expect.any(String), tokens_in: 10, tokens_out: 5, tool_calls: 1 });
    expect(sb.tables.tool_executions).toHaveLength(0);
  });
});
