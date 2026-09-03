import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { nextAutonomousRun } from "./autonomous-schedule";
import { orchestrateGoal } from "./orchestrator.server";

type Sb = { from: (table: string) => any };

const goalInput = z
  .object({
    name: z.string().trim().min(1).max(160),
    objective: z.string().trim().min(1).max(12_000),
    autonomy_level: z.enum(["assisted", "guarded", "autonomous"]).default("guarded"),
    trigger_type: z.enum(["manual", "schedule", "event", "continuous"]).default("manual"),
    schedule_cron: z.string().trim().max(120).nullable().optional(),
    event_source: z.enum(["notification"]).nullable().optional(),
    event_match: z.string().trim().max(160).nullable().optional(),
    timezone: z.string().trim().min(1).max(80).default("UTC"),
    max_parallel_agents: z.number().int().min(1).max(12).default(4),
    max_runtime_seconds: z.number().int().min(30).max(86_400).default(3600),
    budget_pence: z.number().int().min(0).nullable().optional(),
    require_approval_for_external_actions: z.boolean().default(true),
    allow_replanning: z.boolean().default(true),
    workforce_id: z.string().uuid().nullable().optional(),
    org_id: z.string().uuid().nullable().optional(),
    success_criteria: z.array(z.string().trim().min(1).max(500)).max(20).default([]),
  })
  .superRefine((value, ctx) => {
    if (value.trigger_type === "event" && !value.event_match?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["event_match"],
        message: "Event-triggered goals need a notification match phrase.",
      });
    }
  });

async function event(
  sb: Sb,
  row: {
    goal_id: string;
    run_id?: string | null;
    user_id: string;
    event_type: string;
    severity?: string;
    message: string;
    payload?: Record<string, unknown>;
  },
) {
  const { error } = await sb.from("autonomous_goal_events").insert({
    goal_id: row.goal_id,
    run_id: row.run_id ?? null,
    user_id: row.user_id,
    event_type: row.event_type,
    severity: row.severity ?? "info",
    message: row.message,
    payload: row.payload ?? {},
  });
  if (error) console.error("[autonomous-os] event write failed", error);
}

async function persistFleet(sb: Sb, args: { goalId: string; runId: string; userId: string; plan: any }) {
  const assignments = Array.isArray(args.plan?.assignments) ? args.plan.assignments : [];
  if (!assignments.length) return;
  const rows = assignments.map((assignment: any) => ({
    goal_id: args.goalId,
    run_id: args.runId,
    user_id: args.userId,
    agent_id: assignment.agent_id ?? null,
    assignment_id: String(assignment.id ?? crypto.randomUUID()),
    title: String(assignment.title ?? "Specialist assignment").slice(0, 300),
    objective: String(assignment.objective ?? "").slice(0, 12_000),
    depends_on: Array.isArray(assignment.depends_on) ? assignment.depends_on : [],
    success_criteria: Array.isArray(assignment.success_criteria) ? assignment.success_criteria : [],
    requires_approval: Boolean(assignment.requires_approval),
    status: "planned",
  }));
  const { error } = await sb.from("autonomous_goal_fleet_assignments").insert(rows);
  if (error) console.error("[autonomous-os] fleet persistence failed", error);
}

function initialNextRun(triggerType: string, scheduleCron: string | null | undefined, timezone: string) {
  if (triggerType === "continuous") return new Date();
  return nextAutonomousRun({
    triggerType,
    scheduleCron: scheduleCron ?? null,
    timezone,
    after: new Date(),
  });
}

export const listAutonomousGoals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: goals, error } = await sb
      .from("autonomous_goals")
      .select("id,name,objective,status,autonomy_level,trigger_type,schedule_cron,event_source,event_match,timezone,next_run_at,last_run_at,max_parallel_agents,max_runtime_seconds,budget_pence,require_approval_for_external_actions,allow_replanning,workforce_id,org_id,success_criteria,scheduler_attempts,last_scheduler_error,created_at,updated_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);

    const ids = (goals ?? []).map((goal: any) => goal.id);
    let runs: any[] = [];
    let events: any[] = [];
    let fleets: any[] = [];
    if (ids.length) {
      const [runsRes, eventsRes, fleetRes] = await Promise.all([
        sb
          .from("autonomous_goal_runs")
          .select("id,goal_id,status,trigger,workflow_id,workflow_run_id,summary,error,started_at,completed_at,queued_at,heartbeat_at,attempt,created_at")
          .in("goal_id", ids)
          .order("created_at", { ascending: false })
          .limit(200),
        sb
          .from("autonomous_goal_events")
          .select("id,goal_id,run_id,event_type,severity,message,payload,created_at")
          .in("goal_id", ids)
          .order("created_at", { ascending: false })
          .limit(200),
        sb
          .from("autonomous_goal_fleet_assignments")
          .select("id,goal_id,run_id,agent_id,assignment_id,title,objective,depends_on,success_criteria,requires_approval,status,created_at,updated_at")
          .in("goal_id", ids)
          .order("created_at", { ascending: false })
          .limit(300),
      ]);
      if (!runsRes.error) runs = runsRes.data ?? [];
      if (!eventsRes.error) events = eventsRes.data ?? [];
      if (!fleetRes.error) fleets = fleetRes.data ?? [];
    }
    return { goals: goals ?? [], runs, events, fleets };
  });

export const createAutonomousGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => goalInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const nextRun = initialNextRun(data.trigger_type, data.schedule_cron, data.timezone);
    const { data: goal, error } = await sb
      .from("autonomous_goals")
      .insert({
        user_id: context.userId,
        name: data.name,
        objective: data.objective,
        status: "active",
        autonomy_level: data.autonomy_level,
        trigger_type: data.trigger_type,
        schedule_cron: data.schedule_cron ?? null,
        event_source: data.trigger_type === "event" ? data.event_source ?? "notification" : null,
        event_match: data.trigger_type === "event" ? data.event_match?.trim() || null : null,
        timezone: data.timezone,
        next_run_at: nextRun?.toISOString() ?? null,
        max_parallel_agents: data.max_parallel_agents,
        max_runtime_seconds: data.max_runtime_seconds,
        budget_pence: data.budget_pence ?? null,
        require_approval_for_external_actions: data.require_approval_for_external_actions,
        allow_replanning: data.allow_replanning,
        workforce_id: data.workforce_id ?? null,
        org_id: data.org_id ?? null,
        success_criteria: data.success_criteria,
      })
      .select("*")
      .maybeSingle();
    if (error || !goal) throw new Error(error?.message ?? "Could not create autonomous goal.");
    await event(sb, {
      goal_id: goal.id,
      user_id: context.userId,
      event_type: "goal_created",
      message: `Autonomous goal created: ${goal.name}`,
      payload: {
        next_run_at: nextRun?.toISOString() ?? null,
        event_source: goal.event_source ?? null,
        event_match: goal.event_match ?? null,
      },
    });
    return goal;
  });

export const controlAutonomousGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), action: z.enum(["pause", "resume", "cancel"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: current, error: currentError } = await sb
      .from("autonomous_goals")
      .select("id,name,status,trigger_type,schedule_cron,timezone")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (currentError || !current) throw new Error(currentError?.message ?? "Autonomous goal not found.");

    const status = data.action === "pause" ? "paused" : data.action === "resume" ? "active" : "cancelled";
    const nextRun =
      data.action === "resume"
        ? initialNextRun(current.trigger_type, current.schedule_cron, current.timezone || "UTC")
        : null;
    const update: Record<string, unknown> = {
      status,
      scheduler_claimed_at: null,
      scheduler_lease_until: null,
    };
    if (data.action === "cancel") update.next_run_at = null;
    if (data.action === "resume") update.next_run_at = nextRun?.toISOString() ?? null;

    const { data: goal, error } = await sb
      .from("autonomous_goals")
      .update(update)
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .select("id,name,status,next_run_at")
      .maybeSingle();
    if (error || !goal) throw new Error(error?.message ?? "Autonomous goal not found.");
    if (data.action === "cancel") {
      await sb
        .from("autonomous_goal_runs")
        .update({ status: "cancelled", completed_at: new Date().toISOString() })
        .eq("goal_id", data.id)
        .eq("user_id", context.userId)
        .in("status", ["queued", "planning", "running", "waiting_for_approval"]);
      await sb
        .from("autonomous_goal_fleet_assignments")
        .update({ status: "cancelled" })
        .eq("goal_id", data.id)
        .eq("user_id", context.userId)
        .in("status", ["planned", "queued", "running", "waiting_for_approval"]);
    }
    await event(sb, {
      goal_id: data.id,
      user_id: context.userId,
      event_type: `goal_${data.action}`,
      severity: data.action === "cancel" ? "warning" : "info",
      message: `${goal.name} ${data.action === "pause" ? "paused" : data.action === "resume" ? "resumed" : "cancelled"}.`,
      payload: { next_run_at: goal.next_run_at ?? null },
    });
    return goal;
  });

export const runAutonomousGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), trigger: z.string().trim().max(80).default("manual") }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: goal, error } = await sb
      .from("autonomous_goals")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error || !goal) throw new Error(error?.message ?? "Autonomous goal not found.");
    if (goal.status !== "active") throw new Error("Resume this goal before running it.");

    const startedAt = new Date().toISOString();
    const { data: run, error: runError } = await sb
      .from("autonomous_goal_runs")
      .insert({
        goal_id: goal.id,
        user_id: context.userId,
        status: "planning",
        trigger: data.trigger,
        started_at: startedAt,
        queued_at: startedAt,
        heartbeat_at: startedAt,
      })
      .select("id")
      .maybeSingle();
    if (runError || !run) throw new Error(runError?.message ?? "Could not start autonomous goal.");

    await event(sb, {
      goal_id: goal.id,
      run_id: run.id,
      user_id: context.userId,
      event_type: "planning_started",
      message: "Blackstar is selecting specialists and building the execution plan.",
    });

    try {
      const result = await orchestrateGoal({
        sb,
        userId: context.userId,
        goal: goal.objective,
        workforceId: goal.workforce_id ?? null,
        orgId: goal.org_id ?? null,
      });
      const executionStatus = String(result.execution?.run?.status ?? "running");
      const finalStatus =
        executionStatus === "completed" || executionStatus === "succeeded"
          ? "completed"
          : executionStatus === "waiting_for_approval"
            ? "waiting_for_approval"
            : executionStatus === "failed"
              ? "failed"
              : executionStatus === "cancelled"
                ? "cancelled"
                : "running";
      const workflowRunId = result.execution?.run?.id ?? null;
      const now = new Date().toISOString();
      await persistFleet(sb, {
        goalId: goal.id,
        runId: run.id,
        userId: context.userId,
        plan: result.plan,
      });
      await sb
        .from("autonomous_goal_runs")
        .update({
          status: finalStatus,
          workflow_id: result.workflow?.id ?? null,
          workflow_run_id: workflowRunId,
          plan: result.plan ?? null,
          summary: result.plan?.summary ?? null,
          heartbeat_at: now,
          completed_at: ["completed", "failed", "cancelled"].includes(finalStatus) ? now : null,
        })
        .eq("id", run.id)
        .eq("user_id", context.userId);
      await sb
        .from("autonomous_goal_fleet_assignments")
        .update({ status: finalStatus === "completed" ? "completed" : finalStatus })
        .eq("run_id", run.id)
        .eq("user_id", context.userId);
      await sb
        .from("autonomous_goals")
        .update({ last_run_at: now })
        .eq("id", goal.id)
        .eq("user_id", context.userId);
      await event(sb, {
        goal_id: goal.id,
        run_id: run.id,
        user_id: context.userId,
        event_type: finalStatus === "completed" ? "goal_completed" : "execution_started",
        severity: finalStatus === "completed" ? "success" : finalStatus === "failed" ? "error" : "info",
        message:
          finalStatus === "completed"
            ? "Goal completed successfully."
            : finalStatus === "waiting_for_approval"
              ? "Execution is waiting for approval."
              : finalStatus === "failed"
                ? "The specialist workflow failed."
                : "Specialist fleet is executing the generated workflow.",
        payload: {
          workflow_id: result.workflow?.id ?? null,
          workflow_run_id: workflowRunId,
          assignments: result.plan?.assignments?.length ?? 0,
        },
      });
      return { run_id: run.id, ...result };
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Autonomous goal execution failed.";
      await sb
        .from("autonomous_goal_runs")
        .update({
          status: "failed",
          error: message,
          heartbeat_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .eq("id", run.id)
        .eq("user_id", context.userId);
      await event(sb, {
        goal_id: goal.id,
        run_id: run.id,
        user_id: context.userId,
        event_type: "goal_failed",
        severity: "error",
        message,
      });
      throw cause;
    }
  });
