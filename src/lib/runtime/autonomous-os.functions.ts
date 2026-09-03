import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { orchestrateGoal } from "./orchestrator.server";

type Sb = { from: (table: string) => any };

const goalInput = z.object({
  name: z.string().trim().min(1).max(160),
  objective: z.string().trim().min(1).max(12_000),
  autonomy_level: z.enum(["assisted", "guarded", "autonomous"]).default("guarded"),
  trigger_type: z.enum(["manual", "schedule", "event", "continuous"]).default("manual"),
  schedule_cron: z.string().trim().max(120).nullable().optional(),
  timezone: z.string().trim().min(1).max(80).default("UTC"),
  max_parallel_agents: z.number().int().min(1).max(12).default(4),
  max_runtime_seconds: z.number().int().min(30).max(86_400).default(3600),
  budget_pence: z.number().int().min(0).nullable().optional(),
  require_approval_for_external_actions: z.boolean().default(true),
  allow_replanning: z.boolean().default(true),
  workforce_id: z.string().uuid().nullable().optional(),
  org_id: z.string().uuid().nullable().optional(),
  success_criteria: z.array(z.string().trim().min(1).max(500)).max(20).default([]),
});

async function event(sb: Sb, row: { goal_id: string; run_id?: string | null; user_id: string; event_type: string; severity?: string; message: string; payload?: Record<string, unknown> }) {
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

export const listAutonomousGoals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: goals, error } = await sb
      .from("autonomous_goals")
      .select("id,name,objective,status,autonomy_level,trigger_type,schedule_cron,timezone,next_run_at,last_run_at,max_parallel_agents,max_runtime_seconds,budget_pence,require_approval_for_external_actions,allow_replanning,workforce_id,org_id,success_criteria,created_at,updated_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);

    const ids = (goals ?? []).map((goal: any) => goal.id);
    let runs: any[] = [];
    let events: any[] = [];
    if (ids.length) {
      const [runsRes, eventsRes] = await Promise.all([
        sb.from("autonomous_goal_runs").select("id,goal_id,status,trigger,workflow_id,workflow_run_id,summary,error,started_at,completed_at,created_at").in("goal_id", ids).order("created_at", { ascending: false }).limit(200),
        sb.from("autonomous_goal_events").select("id,goal_id,run_id,event_type,severity,message,payload,created_at").in("goal_id", ids).order("created_at", { ascending: false }).limit(200),
      ]);
      if (!runsRes.error) runs = runsRes.data ?? [];
      if (!eventsRes.error) events = eventsRes.data ?? [];
    }
    return { goals: goals ?? [], runs, events };
  });

export const createAutonomousGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => goalInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: goal, error } = await sb.from("autonomous_goals").insert({
      user_id: context.userId,
      name: data.name,
      objective: data.objective,
      status: "active",
      autonomy_level: data.autonomy_level,
      trigger_type: data.trigger_type,
      schedule_cron: data.schedule_cron ?? null,
      timezone: data.timezone,
      max_parallel_agents: data.max_parallel_agents,
      max_runtime_seconds: data.max_runtime_seconds,
      budget_pence: data.budget_pence ?? null,
      require_approval_for_external_actions: data.require_approval_for_external_actions,
      allow_replanning: data.allow_replanning,
      workforce_id: data.workforce_id ?? null,
      org_id: data.org_id ?? null,
      success_criteria: data.success_criteria,
    }).select("*").maybeSingle();
    if (error || !goal) throw new Error(error?.message ?? "Could not create autonomous goal.");
    await event(sb, { goal_id: goal.id, user_id: context.userId, event_type: "goal_created", message: `Autonomous goal created: ${goal.name}` });
    return goal;
  });

export const controlAutonomousGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), action: z.enum(["pause", "resume", "cancel"]) }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const status = data.action === "pause" ? "paused" : data.action === "resume" ? "active" : "cancelled";
    const { data: goal, error } = await sb.from("autonomous_goals").update({ status }).eq("id", data.id).eq("user_id", context.userId).select("id,name,status").maybeSingle();
    if (error || !goal) throw new Error(error?.message ?? "Autonomous goal not found.");
    if (data.action === "cancel") {
      await sb.from("autonomous_goal_runs").update({ status: "cancelled", completed_at: new Date().toISOString() }).eq("goal_id", data.id).eq("user_id", context.userId).in("status", ["queued", "planning", "running"]);
    }
    await event(sb, { goal_id: data.id, user_id: context.userId, event_type: `goal_${data.action}`, severity: data.action === "cancel" ? "warning" : "info", message: `${goal.name} ${data.action === "pause" ? "paused" : data.action === "resume" ? "resumed" : "cancelled"}.` });
    return goal;
  });

export const runAutonomousGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), trigger: z.string().trim().max(80).default("manual") }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: goal, error } = await sb.from("autonomous_goals").select("*").eq("id", data.id).eq("user_id", context.userId).maybeSingle();
    if (error || !goal) throw new Error(error?.message ?? "Autonomous goal not found.");
    if (goal.status !== "active") throw new Error("Resume this goal before running it.");

    const { data: run, error: runError } = await sb.from("autonomous_goal_runs").insert({
      goal_id: goal.id,
      user_id: context.userId,
      status: "planning",
      trigger: data.trigger,
      started_at: new Date().toISOString(),
    }).select("id").maybeSingle();
    if (runError || !run) throw new Error(runError?.message ?? "Could not start autonomous goal.");

    await event(sb, { goal_id: goal.id, run_id: run.id, user_id: context.userId, event_type: "planning_started", message: "Blackstar is selecting specialists and building the execution plan." });

    try {
      const result = await orchestrateGoal({
        sb,
        userId: context.userId,
        goal: goal.objective,
        workforceId: goal.workforce_id ?? null,
        orgId: goal.org_id ?? null,
      });
      const executionStatus = String(result.execution?.status ?? "running");
      const finalStatus = executionStatus === "completed" || executionStatus === "succeeded" ? "completed" : executionStatus === "waiting_for_approval" ? "waiting_for_approval" : executionStatus === "failed" ? "failed" : "running";
      const now = new Date().toISOString();
      await sb.from("autonomous_goal_runs").update({
        status: finalStatus,
        workflow_id: result.workflow?.id ?? null,
        workflow_run_id: result.execution?.run_id ?? result.execution?.id ?? null,
        plan: result.plan ?? null,
        summary: result.plan?.summary ?? null,
        completed_at: finalStatus === "completed" || finalStatus === "failed" ? now : null,
      }).eq("id", run.id).eq("user_id", context.userId);
      await sb.from("autonomous_goals").update({
        last_run_at: now,
        status: finalStatus === "completed" && goal.trigger_type === "manual" ? "completed" : goal.status,
      }).eq("id", goal.id).eq("user_id", context.userId);
      await event(sb, {
        goal_id: goal.id,
        run_id: run.id,
        user_id: context.userId,
        event_type: finalStatus === "completed" ? "goal_completed" : "execution_started",
        severity: finalStatus === "completed" ? "success" : "info",
        message: finalStatus === "completed" ? "Goal completed successfully." : finalStatus === "waiting_for_approval" ? "Execution is waiting for approval." : "Specialist fleet is executing the generated workflow.",
        payload: { workflow_id: result.workflow?.id ?? null, workflow_run_id: result.execution?.run_id ?? result.execution?.id ?? null, assignments: result.plan?.assignments?.length ?? 0 },
      });
      return { run_id: run.id, ...result };
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Autonomous goal execution failed.";
      await sb.from("autonomous_goal_runs").update({ status: "failed", error: message, completed_at: new Date().toISOString() }).eq("id", run.id).eq("user_id", context.userId);
      await event(sb, { goal_id: goal.id, run_id: run.id, user_id: context.userId, event_type: "goal_failed", severity: "error", message });
      throw cause;
    }
  });
