import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { nextAutonomousRunAt } from "./autonomous-schedule";

type Sb = { from: (table: string) => any };

const autonomyLevel = z.enum(["assisted", "guarded", "autonomous"]);
const triggerType = z.enum(["manual", "schedule", "event", "continuous"]);
const MAX_AUTONOMOUS_RUNTIME_SECONDS = 10 * 60;
const eventSource = z.enum(["notification"]);

const createGoalInput = z
  .object({
    name: z.string().trim().min(1).max(120),
    objective: z.string().trim().min(1).max(12_000),
    autonomy_level: autonomyLevel.default("guarded"),
    trigger_type: triggerType.default("manual"),
    schedule_cron: z.string().trim().max(120).nullable().optional(),
    event_source: eventSource.nullable().optional(),
    event_match: z.string().trim().max(160).nullable().optional(),
    timezone: z.string().trim().min(1).max(80).default("UTC"),
    workforce_id: z.string().uuid().nullable().optional(),
    max_parallel_agents: z.number().int().min(1).max(12).default(4),
    max_runtime_seconds: z.number().int().min(30).max(MAX_AUTONOMOUS_RUNTIME_SECONDS).default(600),
    budget_pence: z.number().int().min(0).max(10_000_000).nullable().optional(),
    require_approval_for_external_actions: z.boolean().default(true),
    allow_replanning: z.boolean().default(true),
    success_criteria: z.record(z.string(), z.unknown()).default({}),
  })
  .superRefine((value, ctx) => {
    if (value.trigger_type === "schedule" && !value.schedule_cron?.trim()) {
      ctx.addIssue({ code: "custom", path: ["schedule_cron"], message: "Scheduled goals need a cron schedule." });
    }
    if (value.trigger_type === "event") {
      if (value.event_source !== "notification") {
        ctx.addIssue({ code: "custom", path: ["event_source"], message: "Choose a supported event source." });
      }
      if (!value.event_match?.trim()) {
        ctx.addIssue({ code: "custom", path: ["event_match"], message: "Event goals need a notification match phrase." });
      }
    }
  });

function initialNextRun(trigger: z.infer<typeof triggerType>, cron: string | null | undefined, timezone: string) {
  if (trigger === "continuous") return nextAutonomousRunAt({ triggerType: trigger, timezone });
  if (trigger === "schedule" && cron)
    return nextAutonomousRunAt({ triggerType: trigger, scheduleCron: cron, timezone });
  return null;
}

export const listAutonomousGoals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb
      .from("autonomous_goals")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listAutonomousGoalRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb
      .from("autonomous_goal_runs")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listAutonomousFleetAssignments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb
      .from("autonomous_goal_fleet_assignments")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createAutonomousGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createGoalInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const nextRun = initialNextRun(data.trigger_type, data.schedule_cron, data.timezone);
    const triggerConfig =
      data.trigger_type === "event"
        ? { source: data.event_source, match: data.event_match?.trim() }
        : {};
    const { data: goal, error } = await sb
      .from("autonomous_goals")
      .insert({
        user_id: context.userId,
        org_id: context.orgId ?? null,
        workforce_id: data.workforce_id ?? null,
        name: data.name,
        objective: data.objective,
        status: "active",
        autonomy_level: data.autonomy_level,
        trigger_type: data.trigger_type,
        schedule_cron: data.trigger_type === "schedule" ? data.schedule_cron : null,
        trigger_config: triggerConfig,
        timezone: data.timezone,
        max_parallel_agents: data.max_parallel_agents,
        max_runtime_seconds: data.max_runtime_seconds,
        budget_pence: data.budget_pence ?? null,
        require_approval_for_external_actions: data.require_approval_for_external_actions,
        allow_replanning: data.allow_replanning,
        success_criteria: data.success_criteria,
        next_run_at: nextRun?.toISOString() ?? null,
      })
      .select("*")
      .maybeSingle();
    if (error || !goal) throw new Error(error?.message ?? "Could not create autonomous goal.");
    return goal;
  });

export const updateAutonomousGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      id: z.string().uuid(),
      name: z.string().trim().min(1).max(120).optional(),
      objective: z.string().trim().min(1).max(12_000).optional(),
      autonomy_level: autonomyLevel.optional(),
      max_parallel_agents: z.number().int().min(1).max(12).optional(),
      max_runtime_seconds: z.number().int().min(30).max(MAX_AUTONOMOUS_RUNTIME_SECONDS).optional(),
      budget_pence: z.number().int().min(0).max(10_000_000).nullable().optional(),
      require_approval_for_external_actions: z.boolean().optional(),
      allow_replanning: z.boolean().optional(),
      success_criteria: z.record(z.string(), z.unknown()).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { id, ...patch } = data;
    const { data: goal, error } = await sb
      .from("autonomous_goals")
      .update(patch)
      .eq("id", id)
      .eq("user_id", context.userId)
      .select("*")
      .maybeSingle();
    if (error || !goal) throw new Error(error?.message ?? "Autonomous goal not found.");
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
    if (data.action === "cancel") update["next_run_at"] = null;
    if (data.action === "resume") update["next_run_at"] = nextRun?.toISOString() ?? null;

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
        .in("status", ["planning", "queued", "running", "waiting_for_approval"]);
    }
    return goal;
  });
