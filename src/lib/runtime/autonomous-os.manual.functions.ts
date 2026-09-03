import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { planOrchestratedGoal } from "./orchestrator.server";
import { queueWorkflowRun } from "./workflow-queue.server";

type Sb = { from: (table: string) => any };

async function event(
  sb: Sb,
  args: {
    goalId: string;
    runId?: string | null;
    userId: string;
    type: string;
    severity?: string;
    message: string;
    payload?: Record<string, unknown>;
  },
) {
  await sb.from("autonomous_goal_events").insert({
    goal_id: args.goalId,
    run_id: args.runId ?? null,
    user_id: args.userId,
    event_type: args.type,
    severity: args.severity ?? "info",
    message: args.message,
    payload: args.payload ?? {},
  });
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
    status: "queued",
  }));
  const { error } = await sb.from("autonomous_goal_fleet_assignments").insert(rows);
  if (error) throw new Error(error.message);
}

export const queueAutonomousGoalNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: goal, error } = await sb
      .from("autonomous_goals")
      .select("id,user_id,org_id,workforce_id,name,objective,status")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error || !goal) throw new Error(error?.message ?? "Autonomous goal not found.");
    if (goal.status !== "active") throw new Error("Resume this goal before running it.");

    const { data: active } = await sb
      .from("autonomous_goal_runs")
      .select("id,status")
      .eq("goal_id", goal.id)
      .eq("user_id", context.userId)
      .in("status", ["queued", "planning", "running", "waiting_for_approval"])
      .limit(1)
      .maybeSingle();
    if (active?.id) throw new Error("This goal already has an active run.");

    const now = new Date().toISOString();
    const { data: run, error: runError } = await sb
      .from("autonomous_goal_runs")
      .insert({
        goal_id: goal.id,
        user_id: context.userId,
        status: "planning",
        trigger: "manual",
        started_at: now,
        queued_at: now,
        heartbeat_at: now,
        attempt: 1,
      })
      .select("id")
      .maybeSingle();
    if (runError || !run?.id) throw new Error(runError?.message ?? "Could not start autonomous goal.");

    await event(sb, {
      goalId: goal.id,
      runId: run.id,
      userId: context.userId,
      type: "planning_started",
      message: "Blackstar is selecting specialists for this manual autonomous run.",
    });

    try {
      const prepared = await planOrchestratedGoal({
        sb,
        userId: context.userId,
        goal: goal.objective,
        workforceId: goal.workforce_id ?? null,
        orgId: goal.org_id ?? null,
      });
      await persistFleet(sb, {
        goalId: goal.id,
        runId: run.id,
        userId: context.userId,
        plan: prepared.plan,
      });
      const queued = await queueWorkflowRun({
        sb,
        userId: context.userId,
        workflowId: prepared.workflow.id,
        input: goal.objective,
        trigger: "autonomous_os_manual",
      });
      const workflowRunId = String(queued.run.id);
      const queuedAt = new Date().toISOString();
      await sb
        .from("autonomous_goal_runs")
        .update({
          status: "queued",
          workflow_id: prepared.workflow.id,
          workflow_run_id: workflowRunId,
          plan: prepared.plan,
          summary: prepared.plan?.summary ?? null,
          heartbeat_at: queuedAt,
        })
        .eq("id", run.id)
        .eq("user_id", context.userId)
        .eq("status", "planning");
      await sb
        .from("autonomous_goals")
        .update({ last_run_at: queuedAt })
        .eq("id", goal.id)
        .eq("user_id", context.userId);
      await event(sb, {
        goalId: goal.id,
        runId: run.id,
        userId: context.userId,
        type: "workflow_queued",
        message: "Manual autonomous run handed to Blackstar's durable workflow worker.",
        payload: {
          workflow_id: prepared.workflow.id,
          workflow_run_id: workflowRunId,
          assignments: prepared.plan?.assignments?.length ?? 0,
        },
      });
      return {
        run_id: run.id,
        workflow_id: prepared.workflow.id,
        workflow_run_id: workflowRunId,
        status: "queued",
        assignments: prepared.plan?.assignments?.length ?? 0,
      };
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Could not queue autonomous run.";
      await sb
        .from("autonomous_goal_runs")
        .update({ status: "failed", error: message.slice(0, 1000), completed_at: new Date().toISOString() })
        .eq("id", run.id)
        .eq("user_id", context.userId);
      await event(sb, {
        goalId: goal.id,
        runId: run.id,
        userId: context.userId,
        type: "goal_run_failed",
        severity: "error",
        message: message.slice(0, 600),
      });
      throw cause;
    }
  });
