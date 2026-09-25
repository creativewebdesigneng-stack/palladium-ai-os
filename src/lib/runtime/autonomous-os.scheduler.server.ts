import { nextAutonomousRun } from "./autonomous-schedule";
import { planOrchestratedGoal } from "./orchestrator.server";
import { queueWorkflowRun } from "./workflow-queue.server";
import { planFallbackAutonomousTeam } from "./autonomous-dynamic-team.server";

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

  if (!rows.length) {
    const fallback = await planFallbackAutonomousTeam(db, {
      userId: goal.user_id,
      missionId: goal.id,
      objective: goal.objective,
      maxTeamSize: Number(goal.max_parallel_agents ?? 4),
    });
    for (const agentId of fallback.agentIds) {
      rows.push({
        goal_id: goal.id,
        run_id: runId,
        user_id: goal.user_id,
        agent_id: agentId,
        assignment_id: `dynamic-team:${agentId}`,
        title: "Dynamic team fallback",
        objective: goal.objective.slice(0, 12_000),
        depends_on: [],
        success_criteria: fallback.coveredCapabilities,
        requires_approval: goal.autonomy_level !== "autonomous",
        status: "queued",
      });
    }
  }

  if (!rows.length) return;
  await db.from("autonomous_goal_fleet_assignments").insert(rows);
}
