import { nextAutonomousRun } from "./autonomous-schedule";
import { planOrchestratedGoal } from "./orchestrator.server";
import { queueWorkflowRun } from "./workflow-queue.server";

type Sb = { from: (table: string) => any };

type GoalRow = {
  id: string;
  user_id: string;
  org_id: string | null;
  workforce_id: string | null;
  name: string;
  objective: string;
  status: string;
  autonomy_level: string;
  max_parallel_agents: number | null;
  trigger_type: string;
  schedule_cron: string | null;
  timezone: string | null;
  scheduler_attempts: number | null;
  pending_event_context?: Record<string, unknown> | null;
};

type AutonomousRunRow = {
  id: string;
  goal_id: string;
  user_id: string;
  status: string;
  workflow_run_id: string | null;
};

const MAX_BATCH = 2;
const LEASE_MS = 12 * 60 * 1000;
const PLANNING_HEARTBEAT_MS = 30_000;
const ACTIVE_AUTONOMOUS_STATES = ["queued", "planning", "running", "waiting_for_approval"];

async function admin(): Promise<Sb> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as Sb;
}

async function writeEvent(
  db: Sb,
  args: {
    goalId: string;
    runId?: string | null;
    userId: string;
    eventType: string;
    severity?: "info" | "warning" | "error" | "success";
    message: string;
    payload?: Record<string, unknown>;
  },
) {
  await db.from("autonomous_goal_events").insert({
    goal_id: args.goalId,
    run_id: args.runId ?? null,
    user_id: args.userId,
    event_type: args.eventType,
    severity: args.severity ?? "info",
    message: args.message,
    payload: args.payload ?? {},
  });
}

function mapWorkflowStatus(status: unknown) {
  const value = String(status ?? "queued");
  if (value === "succeeded") return "completed";
  if (value === "waiting_for_approval") return "waiting_for_approval";
  if (value === "failed") return "failed";
  if (value === "cancelled") return "cancelled";
  if (value === "running") return "running";
  return "queued";
}

function executionObjective(goal: GoalRow) {
  if (goal.trigger_type !== "event" || !goal.pending_event_context || !Object.keys(goal.pending_event_context).length)
    return goal.objective;
  const context = JSON.stringify(goal.pending_event_context).slice(0, 1400);
  const base = goal.objective.slice(0, Math.max(0, 12_000 - context.length - 80));
  return `${base}\n\nEvent trigger context (trusted system metadata):\n${context}`.slice(0, 12_000);
}

async function persistFleet(db: Sb, goal: GoalRow, runId: string, plan: any) {
  const assignments = Array.isArray(plan?.assignments) ? plan.assignments : [];
  if (!assignments.length) return;
  const rows = assignments.map((assignment: any) => ({
    goal_id: goal.id,
    run_id: runId,
    user_id: goal.user_id,
    agent_id: assignment.agent_id ?? null,
    assignment_id: String(assignment.id ?? crypto.randomUUID()),
    title: String(assignment.title ?? "Specialist assignment").slice(0, 300),
    objective: String(assignment.objective ?? "").slice(0, 12_000),
    depends_on: Array.isArray(assignment.depends_on) ? assignment.depends_on : [],
    success_criteria: Array.isArray(assignment.success_criteria) ? assignment.success_criteria : [],
    requires_approval: Boolean(assignment.requires_approval),
    status: "queued",
  }));
  await db.from("autonomous_goal_fleet_assignments").insert(rows);
}

async function hasActiveGoalRun(db: Sb, goalId: string) {
  const { data } = await db
    .from("autonomous_goal_runs")
    .select("id")
    .eq("goal_id", goalId)
    .in("status", ACTIVE_AUTONOMOUS_STATES)
    .limit(1)
    .maybeSingle();
  return Boolean(data?.id);
}

async function deferBusyGoal(db: Sb, goal: GoalRow) {
  const deferred = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  await db
    .from("autonomous_goals")
    .update({
      next_run_at: deferred,
      scheduler_claimed_at: null,
      scheduler_lease_until: null,
    })
    .eq("id", goal.id)
    .eq("status", "active");
  return deferred;
}

async function queueClaimedGoal(db: Sb, goal: GoalRow) {
  const startedAt = new Date().toISOString();
  const objective = executionObjective(goal);
  const { data: run, error: runError } = await db
    .from("autonomous_goal_runs")
    .insert({
      goal_id: goal.id,
      user_id: goal.user_id,
      status: "planning",
      trigger: goal.trigger_type,
      started_at: startedAt,
      queued_at: startedAt,
      heartbeat_at: startedAt,
      attempt: Math.max(1, Number(goal.scheduler_attempts ?? 0) + 1),
    })
    .select("id")
    .maybeSingle();
  if (runError || !run?.id) throw new Error(runError?.message ?? "Could not create autonomous run.");

  await writeEvent(db, {
    goalId: goal.id,
    runId: run.id,
    userId: goal.user_id,
    eventType: goal.trigger_type === "event" ? "event_trigger_claimed" : "scheduler_claimed",
    message:
      goal.trigger_type === "event"
        ? "Blackstar claimed an incoming event and started specialist planning."
        : "Background scheduler claimed this goal and started specialist planning.",
    payload: goal.trigger_type === "event" ? { trigger_context: goal.pending_event_context ?? {} } : {},
  });

  const heartbeat = setInterval(() => {
    const now = new Date();
    void db
      .from("autonomous_goals")
      .update({ scheduler_lease_until: new Date(now.getTime() + LEASE_MS).toISOString() })
      .eq("id", goal.id)
      .eq("status", "active");
    void db
      .from("autonomous_goal_runs")
      .update({ heartbeat_at: now.toISOString() })
      .eq("id", run.id)
      .eq("status", "planning");
  }, PLANNING_HEARTBEAT_MS);

  try {
    const prepared = await planOrchestratedGoal({
      sb: db,
      userId: goal.user_id,
      goal: objective,
      workforceId: goal.workforce_id,
      orgId: goal.org_id,
      maxAssignments: Number(goal.max_parallel_agents ?? 4),
      forceApproval: goal.autonomy_level === "assisted",
    });
    await persistFleet(db, goal, run.id, prepared.plan);
    const queued = await queueWorkflowRun({
      sb: db,
      userId: goal.user_id,
      workflowId: prepared.workflow.id,
      input: objective,
      trigger: goal.trigger_type === "event" ? "autonomous_os_event" : "autonomous_os",
    });
    const workflowRunId = String(queued.run.id);
    const now = new Date();
    const nextRun = nextAutonomousRun({
      triggerType: goal.trigger_type,
      scheduleCron: goal.schedule_cron,
      timezone: goal.timezone,
      after: now,
    });

    await db
      .from("autonomous_goal_runs")
      .update({
        status: "queued",
        workflow_id: prepared.workflow.id,
        workflow_run_id: workflowRunId,
        plan: prepared.plan,
        summary: prepared.plan?.summary ?? null,
        heartbeat_at: now.toISOString(),
      })
      .eq("id", run.id)
      .eq("status", "planning");
    await db
      .from("autonomous_goals")
      .update({
        last_run_at: now.toISOString(),
        next_run_at: nextRun?.toISOString() ?? null,
        pending_event_context: goal.trigger_type === "event" ? {} : goal.pending_event_context ?? {},
        scheduler_claimed_at: null,
        scheduler_lease_until: null,
        scheduler_attempts: 0,
        last_scheduler_error: null,
      })
      .eq("id", goal.id);

    await writeEvent(db, {
      goalId: goal.id,
      runId: run.id,
      userId: goal.user_id,
      eventType: "workflow_queued",
      message: "Specialist plan created and handed to Blackstar's durable workflow worker.",
      payload: {
        workflow_id: prepared.workflow.id,
        workflow_run_id: workflowRunId,
        assignments: prepared.plan?.assignments?.length ?? 0,
        max_assignments: Number(goal.max_parallel_agents ?? 4),
        assisted_approval: goal.autonomy_level === "assisted",
        trigger_type: goal.trigger_type,
        next_run_at: nextRun?.toISOString() ?? null,
      },
    });
    return "queued";
  } catch (error) {
    const message = error instanceof Error ? error.message : "Autonomous background planning failed.";
    const attempts = Math.max(1, Number(goal.scheduler_attempts ?? 0) + 1);
    const retryMinutes = Math.min(30, 2 ** Math.min(attempts, 4));
    const retryAt = new Date(Date.now() + retryMinutes * 60 * 1000);
    await db
      .from("autonomous_goal_runs")
      .update({
        status: "failed",
        error: message.slice(0, 1000),
        heartbeat_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    await db
      .from("autonomous_goals")
      .update({
        next_run_at: retryAt.toISOString(),
        scheduler_claimed_at: null,
        scheduler_lease_until: null,
        scheduler_attempts: attempts,
        last_scheduler_error: message.slice(0, 1000),
      })
      .eq("id", goal.id);
    await writeEvent(db, {
      goalId: goal.id,
      runId: run.id,
      userId: goal.user_id,
      eventType: "scheduled_run_failed",
      severity: "error",
      message: message.slice(0, 600),
      payload: { retry_at: retryAt.toISOString(), attempt: attempts, trigger_type: goal.trigger_type },
    });
    throw error;
  } finally {
    clearInterval(heartbeat);
  }
}

export async function reconcileAutonomousGoalRuns(dbOverride?: Sb) {
  const db = dbOverride ?? (await admin());
  const { data: active, error } = await db
    .from("autonomous_goal_runs")
    .select("id,goal_id,user_id,status,workflow_run_id")
    .in("status", ["queued", "running", "waiting_for_approval"])
    .not("workflow_run_id", "is", null)
    .order("created_at", { ascending: true })
    .limit(40);
  if (error) throw new Error(error.message);

  let updated = 0;
  let completed = 0;
  let failed = 0;
  for (const run of (active ?? []) as AutonomousRunRow[]) {
    const { data: workflowRun } = await db
      .from("workflow_runs")
      .select("id,status,error,worker_error,completed_at,worker_heartbeat_at")
      .eq("id", run.workflow_run_id)
      .maybeSingle();
    if (!workflowRun) continue;
    const nextStatus = mapWorkflowStatus(workflowRun.status);
    const terminal = ["completed", "failed", "cancelled"].includes(nextStatus);
    if (nextStatus === run.status && !terminal) {
      await db
        .from("autonomous_goal_runs")
        .update({ heartbeat_at: workflowRun.worker_heartbeat_at ?? new Date().toISOString() })
        .eq("id", run.id);
      continue;
    }

    const now = new Date().toISOString();
    const message = String(workflowRun.worker_error ?? workflowRun.error ?? "").slice(0, 1000) || null;
    await db
      .from("autonomous_goal_runs")
      .update({
        status: nextStatus,
        error: nextStatus === "failed" ? message : null,
        heartbeat_at: workflowRun.worker_heartbeat_at ?? now,
        completed_at: terminal ? workflowRun.completed_at ?? now : null,
      })
      .eq("id", run.id);
    await db
      .from("autonomous_goal_fleet_assignments")
      .update({ status: nextStatus })
      .eq("run_id", run.id)
      .in("status", ["queued", "running", "waiting_for_approval"]);

    await writeEvent(db, {
      goalId: run.goal_id,
      runId: run.id,
      userId: run.user_id,
      eventType:
        nextStatus === "completed"
          ? "goal_run_completed"
          : nextStatus === "failed"
            ? "goal_run_failed"
            : nextStatus === "waiting_for_approval"
              ? "goal_run_waiting_for_approval"
              : "goal_run_status_changed",
      severity: nextStatus === "completed" ? "success" : nextStatus === "failed" ? "error" : "info",
      message:
        nextStatus === "completed"
          ? "Autonomous specialist workflow completed successfully."
          : nextStatus === "failed"
            ? message ?? "Autonomous specialist workflow failed."
            : nextStatus === "waiting_for_approval"
              ? "Autonomous specialist workflow is waiting for operator approval."
              : `Autonomous specialist workflow is ${nextStatus}.`,
      payload: { workflow_run_id: run.workflow_run_id },
    });
    updated += 1;
    if (nextStatus === "completed") completed += 1;
    if (nextStatus === "failed") failed += 1;
  }
  return { updated, completed, failed };
}

export async function processDueAutonomousGoals(limit = 1, dbOverride?: Sb) {
  const db = dbOverride ?? (await admin());
  const reconciliation = await reconcileAutonomousGoalRuns(db);
  const batch = Math.min(Math.max(Number(limit) || 1, 1), MAX_BATCH);
  const now = new Date();
  const nowIso = now.toISOString();
  const { data: candidates, error } = await db
    .from("autonomous_goals")
    .select("*")
    .eq("status", "active")
    .in("trigger_type", ["schedule", "continuous", "event"])
    .not("next_run_at", "is", null)
    .lte("next_run_at", nowIso)
    .or(`scheduler_lease_until.is.null,scheduler_lease_until.lt.${nowIso}`)
    .order("next_run_at", { ascending: true })
    .limit(batch * 3);
  if (error) throw new Error(error.message);

  let claimed = 0;
  let queued = 0;
  let deferred = 0;
  let failed = 0;
  for (const candidate of (candidates ?? []) as GoalRow[]) {
    if (claimed >= batch) break;
    if (await hasActiveGoalRun(db, candidate.id)) {
      await deferBusyGoal(db, candidate);
      deferred += 1;
      continue;
    }
    const leaseUntil = new Date(Date.now() + LEASE_MS).toISOString();
    const { data: goal } = await db
      .from("autonomous_goals")
      .update({ scheduler_claimed_at: nowIso, scheduler_lease_until: leaseUntil })
      .eq("id", candidate.id)
      .eq("status", "active")
      .lte("next_run_at", nowIso)
      .or(`scheduler_lease_until.is.null,scheduler_lease_until.lt.${nowIso}`)
      .select("*")
      .maybeSingle();
    if (!goal) continue;
    claimed += 1;
    try {
      await queueClaimedGoal(db, goal as GoalRow);
      queued += 1;
    } catch {
      failed += 1;
    }
  }
  return { claimed, queued, deferred, failed, reconciliation };
}
