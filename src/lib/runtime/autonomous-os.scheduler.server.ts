import { orchestrateGoal } from "./orchestrator.server";
import { nextAutonomousRun } from "./autonomous-schedule";

type Sb = { from: (table: string) => any };

type GoalRow = {
  id: string;
  user_id: string;
  org_id: string | null;
  workforce_id: string | null;
  name: string;
  objective: string;
  status: string;
  trigger_type: string;
  schedule_cron: string | null;
  timezone: string | null;
  scheduler_attempts: number | null;
};

const MAX_BATCH = 2;
const LEASE_MS = 12 * 60 * 1000;
const HEARTBEAT_MS = 30_000;

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

function executionStatus(result: any) {
  const status = String(result?.execution?.run?.status ?? "running");
  if (status === "succeeded") return "completed";
  if (status === "waiting_for_approval") return "waiting_for_approval";
  if (status === "failed") return "failed";
  if (status === "cancelled") return "cancelled";
  return "running";
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
    status: "planned",
  }));
  await db.from("autonomous_goal_fleet_assignments").insert(rows);
}

async function executeClaimedGoal(db: Sb, goal: GoalRow) {
  const startedAt = new Date().toISOString();
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
    eventType: "scheduler_claimed",
    message: "Background scheduler claimed this goal and started specialist planning.",
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
      .in("status", ["planning", "running", "waiting_for_approval"]);
  }, HEARTBEAT_MS);

  try {
    const result = await orchestrateGoal({
      sb: db,
      userId: goal.user_id,
      goal: goal.objective,
      workforceId: goal.workforce_id,
      orgId: goal.org_id,
    });
    const status = executionStatus(result);
    const now = new Date();
    await persistFleet(db, goal, run.id, result.plan);
    await db
      .from("autonomous_goal_runs")
      .update({
        status,
        workflow_id: result.workflow?.id ?? null,
        workflow_run_id: result.execution?.run?.id ?? null,
        plan: result.plan ?? null,
        summary: result.plan?.summary ?? null,
        heartbeat_at: now.toISOString(),
        completed_at: ["completed", "failed", "cancelled"].includes(status)
          ? now.toISOString()
          : null,
      })
      .eq("id", run.id);

    const nextRun = nextAutonomousRun({
      triggerType: goal.trigger_type,
      scheduleCron: goal.schedule_cron,
      timezone: goal.timezone,
      after: now,
    });
    await db
      .from("autonomous_goals")
      .update({
        last_run_at: now.toISOString(),
        next_run_at: nextRun?.toISOString() ?? null,
        scheduler_claimed_at: null,
        scheduler_lease_until: null,
        scheduler_attempts: 0,
        last_scheduler_error: null,
      })
      .eq("id", goal.id);

    await db
      .from("autonomous_goal_fleet_assignments")
      .update({ status: status === "completed" ? "completed" : status })
      .eq("run_id", run.id);

    await writeEvent(db, {
      goalId: goal.id,
      runId: run.id,
      userId: goal.user_id,
      eventType: status === "completed" ? "scheduled_run_completed" : "scheduled_run_updated",
      severity: status === "completed" ? "success" : status === "failed" ? "error" : "info",
      message:
        status === "completed"
          ? "Scheduled autonomous run completed successfully."
          : status === "waiting_for_approval"
            ? "Scheduled autonomous run is waiting for approval."
            : `Scheduled autonomous run is ${status}.`,
      payload: {
        workflow_id: result.workflow?.id ?? null,
        workflow_run_id: result.execution?.run?.id ?? null,
        assignments: Array.isArray(result.plan?.assignments) ? result.plan.assignments.length : 0,
        next_run_at: nextRun?.toISOString() ?? null,
      },
    });
    return status;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Autonomous background execution failed.";
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
      payload: { retry_at: retryAt.toISOString(), attempt: attempts },
    });
    throw error;
  } finally {
    clearInterval(heartbeat);
  }
}

export async function processDueAutonomousGoals(limit = 1, dbOverride?: Sb) {
  const db = dbOverride ?? (await admin());
  const batch = Math.min(Math.max(Number(limit) || 1, 1), MAX_BATCH);
  const now = new Date();
  const nowIso = now.toISOString();
  const { data: candidates, error } = await db
    .from("autonomous_goals")
    .select("*")
    .eq("status", "active")
    .in("trigger_type", ["schedule", "continuous"])
    .not("next_run_at", "is", null)
    .lte("next_run_at", nowIso)
    .or(`scheduler_lease_until.is.null,scheduler_lease_until.lt.${nowIso}`)
    .order("next_run_at", { ascending: true })
    .limit(batch * 3);
  if (error) throw new Error(error.message);

  let claimed = 0;
  let completed = 0;
  let waiting = 0;
  let failed = 0;
  for (const candidate of (candidates ?? []) as GoalRow[]) {
    if (claimed >= batch) break;
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
      const status = await executeClaimedGoal(db, goal as GoalRow);
      if (status === "completed") completed += 1;
      else if (status === "waiting_for_approval") waiting += 1;
    } catch {
      failed += 1;
    }
  }
  return { claimed, completed, waiting, failed };
}
