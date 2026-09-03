import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { nextAutonomousRun, nextCronRun } from "../autonomous-schedule";

const workerRoute = readFileSync(
  fileURLToPath(new URL("../../../routes/api/internal/workflow-runs.ts", import.meta.url)),
  "utf8",
);
const scheduler = readFileSync(
  fileURLToPath(new URL("../autonomous-os.scheduler.server.ts", import.meta.url)),
  "utf8",
);
const orchestrator = readFileSync(
  fileURLToPath(new URL("../orchestrator.server.ts", import.meta.url)),
  "utf8",
);
const autonomousFunctions = readFileSync(
  fileURLToPath(new URL("../autonomous-os.functions.ts", import.meta.url)),
  "utf8",
);
const autonomousScreen = readFileSync(
  fileURLToPath(new URL("../../../screens/AutonomousOS.jsx", import.meta.url)),
  "utf8",
);
const migration = readFileSync(
  fileURLToPath(
    new URL("../../../../supabase/migrations/20260903224000_autonomous_os_scheduler.sql", import.meta.url),
  ),
  "utf8",
);
const cancellationMigration = readFileSync(
  fileURLToPath(
    new URL(
      "../../../../supabase/migrations/20260903225500_autonomous_os_cancel_propagation.sql",
      import.meta.url,
    ),
  ),
  "utf8",
);
const eventMigration = readFileSync(
  fileURLToPath(
    new URL(
      "../../../../supabase/migrations/20260904000500_autonomous_os_notification_events.sql",
      import.meta.url,
    ),
  ),
  "utf8",
);
const guardrailMigration = readFileSync(
  fileURLToPath(
    new URL(
      "../../../../supabase/migrations/20260904001800_autonomous_os_hard_guardrails.sql",
      import.meta.url,
    ),
  ),
  "utf8",
);
const fleetStateMigration = readFileSync(
  fileURLToPath(
    new URL(
      "../../../../supabase/migrations/20260904003000_autonomous_os_fleet_step_state.sql",
      import.meta.url,
    ),
  ),
  "utf8",
);

describe("Autonomous OS scheduling", () => {
  it("resolves standard five-field cron schedules in the requested timezone", () => {
    const next = nextCronRun("0 8 * * 1-5", "Europe/London", new Date("2026-09-03T22:00:00Z"));
    expect(next.toISOString()).toBe("2026-09-04T07:00:00.000Z");
  });

  it("uses standard cron OR semantics when both month-day and weekday are restricted", () => {
    const next = nextCronRun("0 8 1 * 1", "UTC", new Date("2026-09-03T22:00:00Z"));
    expect(next.toISOString()).toBe("2026-09-07T08:00:00.000Z");
  });

  it("schedules continuous goals on a bounded five-minute cadence", () => {
    const after = new Date("2026-09-03T22:00:00.000Z");
    expect(nextAutonomousRun({ triggerType: "continuous", after })?.toISOString()).toBe(
      "2026-09-03T22:05:00.000Z",
    );
  });

  it("rejects malformed cron expressions", () => {
    expect(() => nextCronRun("every morning", "UTC")).toThrow(/five-field cron/i);
  });
});

describe("Autonomous OS durable worker contract", () => {
  it("reuses the authenticated workflow runner instead of exposing a new public scheduler", () => {
    expect(workerRoute).toContain('isValidRuntimeWorkerToken("workflow_runner"');
    expect(workerRoute).toContain("processDueAutonomousGoals");
    expect(workerRoute).toContain("autonomous_goals");
  });

  it("splits orchestration planning from execution and hands work to the durable queue", () => {
    expect(orchestrator).toContain("export async function planOrchestratedGoal");
    expect(orchestrator).toContain("const prepared = await planOrchestratedGoal(args)");
    expect(scheduler).toContain("planOrchestratedGoal");
    expect(scheduler).toContain("queueWorkflowRun");
    expect(scheduler).toContain('"autonomous_os_event"');
  });

  it("uses leases, planning heartbeats, reconciliation and bounded retries", () => {
    expect(scheduler).toContain("scheduler_lease_until");
    expect(scheduler).toContain("heartbeat_at");
    expect(scheduler).toContain("LEASE_MS");
    expect(scheduler).toContain("retryMinutes");
    expect(scheduler).toContain("scheduler_attempts");
    expect(scheduler).toContain("reconcileAutonomousGoalRuns");
    expect(scheduler).toContain("hasActiveGoalRun");
  });

  it("persists specialist fleet assignments behind owner RLS", () => {
    expect(migration).toContain("autonomous_goal_fleet_assignments");
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("to authenticated");
    expect(migration).toContain("auth.uid()");
  });

  it("propagates cancellation into an owner-matched active workflow run", () => {
    expect(cancellationMigration).toContain("propagate_autonomous_run_cancellation");
    expect(cancellationMigration).toContain("cancel_requested = true");
    expect(cancellationMigration).toContain("user_id = new.user_id");
    expect(cancellationMigration).toContain("waiting_for_approval");
  });

  it("wakes event goals only on explicit non-autonomous notification matches", () => {
    expect(eventMigration).toContain("trigger_autonomous_goals_from_notification");
    expect(eventMigration).toContain("autonomous_os");
    expect(eventMigration).toContain("nullif(trim(g.event_match), '') is not null");
    expect(autonomousFunctions).toContain("Event-triggered goals need a notification match phrase.");
    expect(autonomousScreen).toContain("Wake when a notification contains");
    expect(scheduler).toContain('["schedule", "continuous", "event"]');
    expect(scheduler).toContain("pending_event_context");
  });

  it("enforces real spend and runtime ceilings independently of the browser", () => {
    expect(guardrailMigration).toContain("enforce_autonomous_goal_guardrails");
    expect(guardrailMigration).toContain("sum(at.cost_pence)");
    expect(guardrailMigration).toContain("max_runtime_seconds");
    expect(guardrailMigration).toContain("cancel_requested = true");
    expect(guardrailMigration).toContain("* * * * *");
  });

  it("syncs each fleet assignment from its real workflow step state", () => {
    expect(fleetStateMigration).toContain("sync_autonomous_fleet_step_state");
    expect(fleetStateMigration).toContain("orchestrator_assignment_id");
    expect(fleetStateMigration).toContain("workflow_step_runs");
    expect(fleetStateMigration).toContain("autonomous_goal_fleet_assignments");
  });
});
