/**
 * AI Workforce Engine — server only.
 *
 * Orchestrates a workforce of specialised agents across a workflow:
 * sequential, parallel and conditional steps, delegation, retries, task
 * queues and failure handling.
 *
 * SECURITY MODEL
 * --------------
 * An agent never gains ambient access to another agent's data. The only
 * information a step receives is:
 *   1. the run input, and
 *   2. the outputs of the steps it explicitly declares in `depends_on`
 *      (or the immediately preceding step in sequential mode),
 * delivered through `agent_messages` / the step input. Every step executes
 * through the normal single-agent runtime, so tool grants, memory scope and
 * subscription limits stay per agent.
 */
import {
  getEntitlements,
  assertWithinLimit,
  recordUsage,
} from "@/lib/platform/entitlements.server";
import { failRun, prepareRun, RuntimeError } from "./runtime.server";
import { executePlannedRun } from "./planner-runtime.server";
import { captureVerifiedAgentExperience } from "./agent-learning.server";
import { notify } from "@/lib/notifications/notify.server";
import { NOTIFICATION_TYPE_MAP, type NotificationSeverity } from "@/lib/notifications/types";
import {
  pauseForWorkflowApproval,
  type WorkflowApprovalPause,
} from "./workflow-approval.server";

type Sb = { from: (t: string) => any; rpc?: (fn: string, args?: Record<string, unknown>) => any };

type StepRow = {
  id: string;
  workflow_id: string;
  position: number;
  name: string | null;
  kind: string;
  agent_id: string | null;
  mode: string;
  depends_on: string[] | null;
  condition: Record<string, any> | null;
  input_template: string | null;
  max_retries: number;
  retry_delay_ms: number;
  timeout_ms: number;
  continue_on_error: boolean;
  requires_approval: boolean;
  config: Record<string, unknown> | null;
};

type WorkflowRow = {
  id: string;
  name: string;
  org_id: string | null;
  user_id: string;
  workforce_id: string | null;
  status: string;
};

export type StepOutcome = {
  step_id: string;
  step_run_id: string | null;
  name: string;
  agent_id: string | null;
  status: "succeeded" | "failed" | "skipped";
  output: string;
  error: string | null;
  attempts: number;
  duration_ms: number;
  tokens_in: number;
  tokens_out: number;
};

export class WorkforceError extends Error {
  constructor(
    message: string,
    readonly code = "WORKFORCE_ERROR",
  ) {
    super(message);
  }
}

class WorkflowPausedError extends Error {
  constructor(readonly pause: WorkflowApprovalPause) {
    super("Workflow is waiting for approval.");
    this.name = "WorkflowPausedError";
  }
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as Sb;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, Math.max(0, ms)));

const MAX_STEPS = 25;
const RUN_BUDGET_MS = 10 * 60 * 1000;
const CANCELLATION_POLL_MS = 1_000;
const MAX_DELAY_MS = 300_000;

async function workflowIsCancelled(db: Sb, runId: string): Promise<boolean> {
  const { data } = await db
    .from("workflow_runs")
    .select("status,cancel_requested")
    .eq("id", runId)
    .maybeSingle();
  return data?.status === "cancelled" || data?.cancel_requested === true;
}

function delayFor(config: Record<string, unknown> | null): number {
  const value = config?.["duration_ms"];
  if (!Number.isInteger(value) || Number(value) < 0 || Number(value) > MAX_DELAY_MS)
    throw new WorkforceError(
      `Delay duration_ms must be an integer between 0 and ${MAX_DELAY_MS}.`,
      "INVALID_DELAY",
    );
  return Number(value);
}

function safeLink(value: unknown): string | null {
  const link = typeof value === "string" ? value.trim() : "";
  return link && link.startsWith("/") && !link.startsWith("//") && !/[\\\r\n]/.test(link)
    ? link.slice(0, 500)
    : null;
}

function abortableDelay(durationMs: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted)
    return Promise.reject(
      signal.reason ??
        new RuntimeError("Workflow run cancelled by the operator.", "CANCELLED", 499),
    );
  return new Promise((resolve, reject) => {
    const timer = setTimeout(done, durationMs);
    const abort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      reject(
        signal?.reason ??
          new RuntimeError("Workflow run cancelled by the operator.", "CANCELLED", 499),
      );
    };
    function done() {
      signal?.removeEventListener("abort", abort);
      resolve();
    }
    signal?.addEventListener("abort", abort, { once: true });
  });
}

/* ------------------------------------------------------------ templating */

/**
 * Renders a step's prompt. Only the run input and the *declared* upstream
 * outputs are addressable — an unknown reference resolves to an empty string
 * rather than leaking another agent's result.
 */
function renderInput(template: string | null, ctx: { input: string; upstream: StepOutcome[] }) {
  const byName = new Map(ctx.upstream.map((o) => [o.name.toLowerCase(), o]));
  const byId = new Map(ctx.upstream.map((o) => [o.step_id, o]));

  if (!template) {
    if (!ctx.upstream.length) return ctx.input;
    const handoff = ctx.upstream
      .filter((o) => o.status === "succeeded" && o.output)
      .map((o) => `### From ${o.name}\n${o.output}`)
      .join("\n\n");
    return handoff ? `Objective: ${ctx.input}\n\nUpstream results:\n${handoff}` : ctx.input;
  }

  return template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_m, raw: string) => {
    const key = String(raw).trim();
    if (key === "input" || key === "objective") return ctx.input;
    const ref = key.replace(/^steps?\./, "").replace(/\.output$/, "");
    const hit = byId.get(ref) ?? byName.get(ref.toLowerCase());
    return hit?.output ?? "";
  });
}

/* ------------------------------------------------------------ conditions */

/** Evaluates a step's `condition` against its declared upstream outputs. */
function conditionMet(condition: Record<string, any> | null, upstream: StepOutcome[]) {
  if (!condition || !Object.keys(condition).length) return true;
  const op = String(condition["op"] ?? condition["when"] ?? "always");
  if (op === "always") return true;

  const ref = condition["step"] ? String(condition["step"]) : null;
  const source = ref
    ? upstream.find((o) => o.step_id === ref || o.name.toLowerCase() === ref.toLowerCase())
    : upstream[upstream.length - 1];
  const text = (source?.output ?? "").toLowerCase();
  const value = String(condition["value"] ?? "").toLowerCase();

  switch (op) {
    case "contains":
      return text.includes(value);
    case "not_contains":
      return !text.includes(value);
    case "equals":
      return text.trim() === value.trim();
    case "not_empty":
      return text.trim().length > 0;
    case "upstream_succeeded":
      return (source?.status ?? "failed") === "succeeded";
    case "upstream_failed":
      return source?.status === "failed";
    default:
      return true;
  }
}

/* ------------------------------------------------------------ graph */

/** Resolves execution order: explicit `depends_on`, else position-based waves. */
function buildWaves(steps: StepRow[]): StepRow[][] {
  const hasExplicit = steps.some((s) => (s.depends_on ?? []).length > 0);
  if (!hasExplicit) {
    const waves = new Map<number, StepRow[]>();
    for (const step of steps) {
      const key = step.mode === "parallel" ? step.position : step.position + 0.5;
      const list = waves.get(key) ?? [];
      list.push(step);
      waves.set(key, list);
    }
    return [...waves.entries()].sort((a, b) => a[0] - b[0]).map(([, list]) => list);
  }

  const done = new Set<string>();
  const remaining = [...steps];
  const waves: StepRow[][] = [];
  while (remaining.length) {
    const ready = remaining.filter((s) => (s.depends_on ?? []).every((d) => done.has(d)));
    if (!ready.length)
      throw new WorkforceError("This workflow has a circular dependency between steps.", "CYCLE");
    ready.forEach((s) => done.add(s.id));
    waves.push(ready);
    ready.forEach((s) => remaining.splice(remaining.indexOf(s), 1));
  }
  return waves;
}

function upstreamFor(step: StepRow, completed: StepOutcome[]): StepOutcome[] {
  const deps = step.depends_on ?? [];
  if (deps.length) return completed.filter((o) => deps.includes(o.step_id));
  const previous = completed[completed.length - 1];
  return previous ? [previous] : [];
}

/* ------------------------------------------------------------ one step */

async function runBuiltInStep(
  args: Parameters<typeof runStep>[0],
  base: StepOutcome,
): Promise<StepOutcome> {
  const { step, db } = args;

  if (step.kind === "approval") {
    const pause = await pauseForWorkflowApproval({
      db,
      userId: args.userId,
      orgId: args.orgId,
      workflowId: step.workflow_id,
      workflowName: args.workflowName,
      runId: args.runId,
      step,
      completed: args.completed ?? [],
    });
    throw new WorkflowPausedError(pause);
  }

  const startedAt = Date.now();
  const { data: stepRun } = await db
    .from("workflow_step_runs")
    .insert({
      run_id: args.runId,
      workflow_id: step.workflow_id,
      step_id: step.id,
      agent_id: null,
      org_id: args.orgId,
      user_id: args.userId,
      name: base.name,
      kind: step.kind,
      position: step.position,
      attempt: 1,
      status: "running",
      input: args.input.slice(0, 8000),
      started_at: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle();
  const stepRunId = (stepRun?.id as string | undefined) ?? null;

  try {
    let output: string;
    if (step.kind === "delay") {
      const durationMs = delayFor(step.config);
      await abortableDelay(durationMs, args.signal);
      output = `Delayed for ${durationMs} ms.`;
    } else if (step.kind === "notification") {
      const config = step.config ?? {};
      const requestedType =
        typeof config["type"] === "string" ? config["type"] : "workflow.completed";
      const type = NOTIFICATION_TYPE_MAP[requestedType] ? requestedType : "workflow.completed";
      const severity = ["info", "success", "warning", "critical"].includes(
        String(config["severity"]),
      )
        ? (config["severity"] as NotificationSeverity)
        : undefined;
      const title = String(config["title"] ?? base.name)
        .trim()
        .slice(0, 200);
      if (!title)
        throw new WorkforceError("Notification title is required.", "INVALID_NOTIFICATION");
      const body = typeof config["body"] === "string" ? config["body"].trim().slice(0, 500) : null;
      const delivered = await notify({
        userId: args.userId,
        orgId: args.orgId,
        type,
        title,
        body,
        ...(severity ? { severity } : {}),
        link: safeLink(config["link"]),
        metadata: { workflow_id: step.workflow_id, run_id: args.runId, step_id: step.id },
      });
      output = delivered
        ? "Notification delivered."
        : "Notification was suppressed by recipient preferences.";
    } else {
      throw new WorkforceError(`Unsupported workflow step kind: ${step.kind}.`, "UNSUPPORTED_STEP");
    }

    const outcome = {
      ...base,
      step_run_id: stepRunId,
      status: "succeeded" as const,
      output,
      attempts: 1,
      duration_ms: Date.now() - startedAt,
    };
    if (stepRunId)
      await db
        .from("workflow_step_runs")
        .update({
          status: "succeeded",
          output,
          duration_ms: outcome.duration_ms,
          completed_at: new Date().toISOString(),
        })
        .eq("id", stepRunId);
    return outcome;
  } catch (error) {
    if (error instanceof WorkflowPausedError) throw error;
    const message = error instanceof Error ? error.message : "Step failed.";
    if (stepRunId)
      await db
        .from("workflow_step_runs")
        .update({
          status: "failed",
          error: message.slice(0, 600),
          duration_ms: Date.now() - startedAt,
          completed_at: new Date().toISOString(),
        })
        .eq("id", stepRunId);
    if (error instanceof RuntimeError && error.code === "CANCELLED") throw error;
    return {
      ...base,
      step_run_id: stepRunId,
      attempts: 1,
      duration_ms: Date.now() - startedAt,
      error: message,
    };
  }
}

export async function runStep(args: {
  sb: Sb;
  db: Sb;
  userId: string;
  orgId: string | null;
  runId: string;
  workflowName: string;
  step: StepRow;
  input: string;
  objective: string;
  upstream: StepOutcome[];
  completed?: StepOutcome[];
  signal?: AbortSignal;
}): Promise<StepOutcome> {
  const { step, db } = args;
  const name = step.name || `Step ${step.position + 1}`;
  const base: StepOutcome = {
    step_id: step.id,
    step_run_id: null,
    name,
    agent_id: step.agent_id,
    status: "failed",
    output: "",
    error: null,
    attempts: 0,
    duration_ms: 0,
    tokens_in: 0,
    tokens_out: 0,
  };

  if (step.kind !== "agent") return runBuiltInStep(args, base);
  if (!step.agent_id) {
    return { ...base, status: "skipped", error: "No agent is assigned to this step." };
  }

  const attemptsAllowed = Math.min(Math.max(step.max_retries ?? 1, 1), 4);
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= attemptsAllowed; attempt += 1) {
    const startedAt = Date.now();
    const { data: stepRun } = await db
      .from("workflow_step_runs")
      .insert({
        run_id: args.runId,
        workflow_id: step.workflow_id,
        step_id: step.id,
        agent_id: step.agent_id,
        org_id: args.orgId,
        user_id: args.userId,
        name,
        kind: step.kind,
        position: step.position,
        attempt,
        status: "running",
        input: args.input.slice(0, 8000),
        started_at: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle();
    const stepRunId = (stepRun?.id as string | undefined) ?? null;

    let run: Awaited<ReturnType<typeof prepareRun>> | null = null;
    try {
      run = await prepareRun({
        sb: args.sb as never,
        userId: args.userId,
        agentId: step.agent_id,
        input: args.input,
      });
      const controller = new AbortController();
      const abortFromWorkflow = () => {
        controller.abort(
          args.signal?.reason ??
            new RuntimeError("Workflow run cancelled by the operator.", "CANCELLED", 499),
        );
      };
      if (args.signal?.aborted) abortFromWorkflow();
      else args.signal?.addEventListener("abort", abortFromWorkflow, { once: true });
      const timeoutMs = Math.min(Math.max(step.timeout_ms ?? 120_000, 5_000), 300_000);
      const deadlineTimer = setTimeout(() => {
        controller.abort(new RuntimeError(`${name} timed out.`, "RUN_TIMEOUT", 504));
      }, timeoutMs);
      const cancellationPoll = setInterval(() => {
        void workflowIsCancelled(db, args.runId)
          .then((cancelled) => {
            if (cancelled && !controller.signal.aborted) {
              controller.abort(
                new RuntimeError("Workflow run cancelled by the operator.", "CANCELLED", 499),
              );
            }
          })
          .catch(() => undefined);
      }, CANCELLATION_POLL_MS);

      let task: any;
      try {
        task = await executePlannedRun({
          sb: args.sb as never,
          userId: args.userId,
          run,
          signal: controller.signal,
          timeoutMs,
        });
        await captureVerifiedAgentExperience({
          sb: args.sb as never,
          userId: args.userId,
          taskId: run.taskId,
        });
      } finally {
        clearTimeout(deadlineTimer);
        clearInterval(cancellationPoll);
        args.signal?.removeEventListener("abort", abortFromWorkflow);
      }

      const output = String(task?.output_text ?? "");
      const outcome: StepOutcome = {
        ...base,
        step_run_id: stepRunId,
        status: "succeeded",
        output,
        attempts: attempt,
        duration_ms: Date.now() - startedAt,
        tokens_in: Number(task?.tokens_in ?? 0),
        tokens_out: Number(task?.tokens_out ?? 0),
      };

      if (stepRunId) {
        await db
          .from("workflow_step_runs")
          .update({
            status: "succeeded",
            task_id: task?.id ?? null,
            output: output.slice(0, 12_000),
            tokens_in: outcome.tokens_in,
            tokens_out: outcome.tokens_out,
            duration_ms: outcome.duration_ms,
            completed_at: new Date().toISOString(),
          })
          .eq("id", stepRunId);
      }

      await db.from("agent_messages").insert({
        run_id: args.runId,
        from_step_run_id: stepRunId,
        from_agent_id: step.agent_id,
        org_id: args.orgId,
        user_id: args.userId,
        kind: "handoff",
        content: output.slice(0, 8000),
        metadata: { step_id: step.id, step: name, attempt },
      });

      return outcome;
    } catch (error) {
      lastError = error;
      if (run) await failRun({ userId: args.userId, run, error }).catch(() => undefined);
      const message = error instanceof Error ? error.message : "Step failed.";
      if (stepRunId) {
        await db
          .from("workflow_step_runs")
          .update({
            status: "failed",
            error: message.slice(0, 600),
            duration_ms: Date.now() - startedAt,
            completed_at: new Date().toISOString(),
          })
          .eq("id", stepRunId);
      }
      if (error instanceof RuntimeError && error.code === "CANCELLED") throw error;
      const retryable = !(error instanceof RuntimeError && error.code === "CANCELLED");
      if (!retryable || attempt === attemptsAllowed) break;
      await sleep((step.retry_delay_ms ?? 500) * attempt);
    }
  }

  return {
    ...base,
    status: "failed",
    attempts: attemptsAllowed,
    error: lastError instanceof Error ? lastError.message : "Step failed.",
  };
}

/* ------------------------------------------------------------ resumable core */

export async function executeWorkflowRun(args: {
  sb: Sb;
  db: Sb;
  userId: string;
  workflow: WorkflowRow;
  steps: StepRow[];
  runId: string;
  objective: string;
  completed?: StepOutcome[];
}) {
  const { workflow, runId } = args;
  const orgId = workflow.org_id ?? null;
  const waves = buildWaves(args.steps);
  const completed: StepOutcome[] = [...(args.completed ?? [])];
  const completedIds = new Set(completed.map((outcome) => outcome.step_id));
  const deadline = Date.now() + RUN_BUDGET_MS;
  const workflowController = new AbortController();
  const runBudgetTimer = setTimeout(() => {
    workflowController.abort(
      new RuntimeError("The workforce run exceeded its time budget.", "RUN_TIMEOUT", 504),
    );
  }, RUN_BUDGET_MS);
  const cancellationPoll = setInterval(() => {
    void workflowIsCancelled(args.db, runId)
      .then((cancelled) => {
        if (cancelled && !workflowController.signal.aborted) {
          workflowController.abort(
            new RuntimeError("Workflow run cancelled by the operator.", "CANCELLED", 499),
          );
        }
      })
      .catch(() => undefined);
  }, CANCELLATION_POLL_MS);
  let failure: StepOutcome | null = null;

  try {
    for (const wave of waves) {
      if (failure) break;
      while (true) {
        const pendingWave = wave.filter((step) => !completedIds.has(step.id));
        if (!pendingWave.length) break;
        if (workflowController.signal.aborted) throw workflowController.signal.reason;
        if (await workflowIsCancelled(args.db, runId)) {
          throw new WorkforceError("Workflow run cancelled by the operator.", "CANCELLED");
        }
        if (Date.now() > deadline)
          throw new WorkforceError("The workforce run exceeded its time budget.", "RUN_TIMEOUT");

        const approval = pendingWave.find((step) => step.kind === "approval");
        const executionWave = approval ? [approval] : pendingWave;
        const results = await Promise.all(
          executionWave.map(async (step) => {
            const upstream = upstreamFor(step, completed);
            if (!conditionMet(step.condition, upstream)) {
              const skipped: StepOutcome = {
                step_id: step.id,
                step_run_id: null,
                name: step.name || `Step ${step.position + 1}`,
                agent_id: step.agent_id,
                status: "skipped",
                output: "",
                error: "Condition not met.",
                attempts: 0,
                duration_ms: 0,
                tokens_in: 0,
                tokens_out: 0,
              };
              await args.db.from("workflow_step_runs").insert({
                run_id: runId,
                workflow_id: step.workflow_id,
                step_id: step.id,
                agent_id: step.agent_id,
                org_id: orgId,
                user_id: args.userId,
                name: skipped.name,
                kind: step.kind,
                position: step.position,
                status: "cancelled",
                error: "Condition not met.",
                completed_at: new Date().toISOString(),
              });
              return skipped;
            }

            return runStep({
              sb: args.sb,
              db: args.db,
              userId: args.userId,
              orgId,
              runId,
              workflowName: workflow.name,
              step,
              objective: args.objective,
              input: renderInput(step.input_template, { input: args.objective, upstream }),
              upstream,
              completed,
              signal: workflowController.signal,
            });
          }),
        );

        results.forEach((result) => {
          completed.push(result);
          completedIds.add(result.step_id);
        });
        const blocking = results.find(
          (result, index) => result.status === "failed" && !executionWave[index]!.continue_on_error,
        );
        if (blocking) {
          failure = blocking;
          break;
        }
        if (!approval) break;
      }
    }

    const tokensIn = completed.reduce((sum, outcome) => sum + outcome.tokens_in, 0);
    const tokensOut = completed.reduce((sum, outcome) => sum + outcome.tokens_out, 0);
    const finalOutput =
      [...completed].reverse().find((outcome) => outcome.status === "succeeded" && outcome.output)
        ?.output ?? "";
    const status = failure ? "failed" : "succeeded";

    await args.db
      .from("workflow_runs")
      .update({
        status,
        step_results: completed,
        output: finalOutput.slice(0, 12_000),
        error: failure ? `${failure.name}: ${failure.error}` : null,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
        waiting_approval_request_id: null,
        waiting_step_id: null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);

    await recordUsage({
      userId: args.userId,
      orgId,
      metric: "workflow_run",
      quantity: 1,
      metadata: {
        run_id: runId,
        workflow_id: workflow.id,
        workforce_id: workflow.workforce_id ?? null,
        steps: completed.length,
        tokens: tokensIn + tokensOut,
        status,
      },
    }).catch(() => undefined);

    const { dispatchWebhookEvent } = await import("@/lib/devapi/webhooks.server");
    await dispatchWebhookEvent({
      userId: args.userId,
      orgId,
      event: "workflow.completed",
      payload: {
        run_id: runId,
        workflow_id: workflow.id,
        workflow_name: workflow.name,
        status,
        output: finalOutput,
        steps: completed.map((outcome) => ({
          name: outcome.name,
          status: outcome.status,
          attempts: outcome.attempts,
        })),
      },
    }).catch(() => undefined);

    await notify({
      userId: args.userId,
      orgId,
      type: failure ? "workflow.failed" : "workflow.completed",
      title: failure
        ? `Workflow "${workflow.name}" failed`
        : `Workflow "${workflow.name}" completed`,
      body: failure
        ? `Stopped on step "${failure.name}": ${String(failure.error).slice(0, 200)}`
        : `${completed.length} step${completed.length === 1 ? "" : "s"} finished successfully.`,
      link: "/workforce",
      metadata: { run_id: runId, workflow_id: workflow.id },
    });

    const { data: finished } = await args.sb
      .from("workflow_runs")
      .select("*")
      .eq("id", runId)
      .maybeSingle();
    return { run: finished ?? { id: runId, status }, steps: completed, output: finalOutput };
  } catch (error) {
    if (error instanceof WorkflowPausedError) {
      const { data: pausedRun } = await args.sb
        .from("workflow_runs")
        .select("*")
        .eq("id", runId)
        .maybeSingle();
      return {
        run: pausedRun ?? { id: runId, status: "waiting_for_approval" },
        steps: completed,
        output: "",
        paused: true,
        approval: error.pause,
      };
    }

    const message = error instanceof Error ? error.message : "The workforce run failed.";
    const cancelled =
      (error instanceof RuntimeError && error.code === "CANCELLED") ||
      (error instanceof WorkforceError && error.code === "CANCELLED");
    await args.db
      .from("workflow_runs")
      .update({
        status: cancelled ? "cancelled" : "failed",
        step_results: completed,
        error: message.slice(0, 600),
        waiting_approval_request_id: null,
        waiting_step_id: null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);
    await notify({
      userId: args.userId,
      orgId,
      type: "workflow.failed",
      title: "A workflow run failed",
      body: message.slice(0, 200),
      link: "/workforce",
      metadata: { run_id: runId },
    });
    throw error instanceof WorkforceError ? error : new WorkforceError(message);
  } finally {
    clearTimeout(runBudgetTimer);
    clearInterval(cancellationPoll);
  }
}

/* ------------------------------------------------------------ orchestrator */

export async function executeWorkflow(args: {
  sb: Sb;
  userId: string;
  workflowId: string;
  input: string;
  trigger?: string;
}) {
  const objective = (args.input ?? "").trim();
  if (!objective) throw new WorkforceError("Give the workforce an objective.", "EMPTY_INPUT");

  const { data: workflow } = await args.sb
    .from("workflows")
    .select("id,name,org_id,user_id,workforce_id,status")
    .eq("id", args.workflowId)
    .maybeSingle();
  if (!workflow)
    throw new WorkforceError("Workflow not found or you do not have access to it.", "NOT_FOUND");

  const { data: rawSteps } = await args.sb
    .from("workflow_steps")
    .select("*")
    .eq("workflow_id", workflow.id)
    .order("position", { ascending: true });
  const steps = ((rawSteps ?? []) as StepRow[]).slice(0, MAX_STEPS);
  if (!steps.length) throw new WorkforceError("This workflow has no steps yet.", "NO_STEPS");

  const orgId = (workflow.org_id as string | null) ?? null;
  const ent = await getEntitlements(args.sb as never, args.userId, orgId);
  assertWithinLimit(ent, "tasks_per_month");

  const db = await admin();
  const { data: run } = await db
    .from("workflow_runs")
    .insert({
      workflow_id: workflow.id,
      workforce_id: workflow.workforce_id ?? null,
      org_id: orgId,
      user_id: args.userId,
      status: "running",
      trigger: args.trigger ?? "manual",
      input: objective.slice(0, 8000),
      started_at: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle();
  if (!run?.id)
    throw new WorkforceError("Could not start that workforce run.", "RUN_CREATE_FAILED");

  return executeWorkflowRun({
    sb: args.sb,
    db,
    userId: args.userId,
    workflow: workflow as WorkflowRow,
    steps,
    runId: run.id as string,
    objective,
    completed: [],
  });
}

export async function requestWorkflowCancellation(args: { sb: Sb; userId: string; runId: string }) {
  const { data: visibleRun } = await args.sb
    .from("workflow_runs")
    .select("id,user_id,status")
    .eq("id", args.runId)
    .maybeSingle();
  if (!visibleRun)
    throw new WorkforceError(
      "Workflow run not found or you do not have access to it.",
      "NOT_FOUND",
    );
  if (visibleRun.user_id !== args.userId)
    throw new WorkforceError("Only the run owner can cancel this workflow.", "FORBIDDEN");

  const db = await admin();
  const { data: updated, error } = await db
    .from("workflow_runs")
    .update({ cancel_requested: true })
    .eq("id", args.runId)
    .in("status", ["pending", "queued", "running", "waiting_for_approval"])
    .select("id,status,cancel_requested")
    .maybeSingle();
  if (error) throw new WorkforceError(error.message, "CANCEL_FAILED");
  return { run: updated ?? visibleRun, requested: Boolean(updated) };
}
