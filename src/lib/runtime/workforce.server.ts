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
import { executeRun, failRun, prepareRun, RuntimeError } from "./runtime.server";
import { notify } from "@/lib/notifications/notify.server";

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

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as Sb;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, Math.max(0, ms)));

const MAX_STEPS = 25;
const RUN_BUDGET_MS = 10 * 60 * 1000;

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
      // Sequential steps get their own wave; parallel steps share their position.
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

async function runStep(args: {
  sb: Sb;
  db: Sb;
  userId: string;
  orgId: string | null;
  runId: string;
  step: StepRow;
  input: string;
  objective: string;
  upstream: StepOutcome[];
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
      const task = (await Promise.race([
        executeRun({ sb: args.sb as never, userId: args.userId, run }),
        sleep(Math.min(step.timeout_ms ?? 120_000, 300_000)).then(() => {
          throw new WorkforceError(`${name} timed out.`, "STEP_TIMEOUT");
        }),
      ])) as any;

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

      // Controlled handoff: the only channel agents use to talk to each other.
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

/* ------------------------------------------------------------ orchestrator */

/** Executes a workflow across its workforce and returns the finished run. */
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

  // Subscription gate: a workforce run costs at least one execution per step.
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
  const runId = run.id as string;

  const waves = buildWaves(steps);
  const completed: StepOutcome[] = [];
  const deadline = Date.now() + RUN_BUDGET_MS;
  let failure: StepOutcome | null = null;

  try {
    for (const wave of waves) {
      if (failure) break;
      if (Date.now() > deadline)
        throw new WorkforceError("The workforce run exceeded its time budget.", "RUN_TIMEOUT");

      const results = await Promise.all(
        wave.map(async (step) => {
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
            await db.from("workflow_step_runs").insert({
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
            db,
            userId: args.userId,
            orgId,
            runId,
            step,
            objective,
            input: renderInput(step.input_template, { input: objective, upstream }),
            upstream,
          });
        }),
      );

      results.forEach((r) => completed.push(r));
      const blocking = results.find((r, i) => r.status === "failed" && !wave[i]!.continue_on_error);
      if (blocking) failure = blocking;
    }

    const tokensIn = completed.reduce((sum, o) => sum + o.tokens_in, 0);
    const tokensOut = completed.reduce((sum, o) => sum + o.tokens_out, 0);
    const finalOutput =
      [...completed].reverse().find((o) => o.status === "succeeded" && o.output)?.output ?? "";
    const status = failure ? "failed" : "succeeded";

    await db
      .from("workflow_runs")
      .update({
        status,
        step_results: completed,
        output: finalOutput.slice(0, 12_000),
        error: failure ? `${failure.name}: ${failure.error}` : null,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
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
        steps: completed.map((o) => ({ name: o.name, status: o.status, attempts: o.attempts })),
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
    const message = error instanceof Error ? error.message : "The workforce run failed.";
    await db
      .from("workflow_runs")
      .update({
        status: "failed",
        step_results: completed,
        error: message.slice(0, 600),
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);
    await notify({
      userId: args.userId,
      type: "workflow.failed",
      title: "A workflow run failed",
      body: message.slice(0, 200),
      link: "/workforce",
      metadata: { run_id: runId },
    });
    throw error instanceof WorkforceError ? error : new WorkforceError(message);
  }
}
