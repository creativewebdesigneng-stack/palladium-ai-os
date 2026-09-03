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
    expect(scheduler).toContain('trigger: "autonomous_os"');
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
});
