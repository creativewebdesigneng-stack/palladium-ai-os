import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabase } from "./fake-supabase";

const { notify } = vi.hoisted(() => ({ notify: vi.fn(async () => true) }));
vi.mock("@/lib/notifications/notify.server", () => ({ notify }));

import { pauseForWorkflowApproval } from "../workflow-approval.server";

type FakeDb = ReturnType<typeof createFakeSupabase>;

function requiredRow(db: FakeDb, table: string, index = 0) {
  const value = db.tables[table]?.[index];
  if (!value) throw new Error(`Expected ${table}[${index}] to exist.`);
  return value;
}

const approvalStep = {
  id: "step-approval",
  workflow_id: "workflow-1",
  position: 1,
  name: "Owner approval",
  kind: "approval",
  config: {
    title: "Approve release",
    summary: "Review the release before continuing.",
    risk_level: "high",
  },
};

describe("workflow approval pause", () => {
  beforeEach(() => notify.mockClear());

  it("persists one durable approval gate on the existing workflow run", async () => {
    const db = createFakeSupabase({
      workflow_runs: [
        {
          id: "run-1",
          workflow_id: "workflow-1",
          user_id: "user-1",
          status: "running",
          step_results: [],
        },
      ],
    });
    const completed = [
      {
        step_id: "step-previous",
        status: "succeeded",
        output: "ready",
      },
    ];

    const pause = await pauseForWorkflowApproval({
      db,
      userId: "user-1",
      orgId: null,
      workflowId: "workflow-1",
      workflowName: "Release workflow",
      runId: "run-1",
      step: approvalStep,
      completed,
    });

    expect(pause.kind).toBe("paused_for_approval");
    expect(pause.stepId).toBe("step-approval");
    expect(requiredRow(db, "workflow_runs")).toMatchObject({
      id: "run-1",
      status: "waiting_for_approval",
      waiting_step_id: "step-approval",
      waiting_approval_request_id: pause.approvalRequestId,
      step_results: completed,
    });
    expect(db.tables["workflow_step_runs"] ?? []).toHaveLength(1);
    expect(requiredRow(db, "workflow_step_runs")).toMatchObject({
      run_id: "run-1",
      step_id: "step-approval",
      status: "waiting_for_approval",
    });
    expect(db.tables["approval_requests"] ?? []).toHaveLength(1);
    expect(requiredRow(db, "approval_requests")).toMatchObject({
      user_id: "user-1",
      action_type: "workflow_step",
      status: "pending",
      risk_level: "high",
      details: {
        workflow_run_id: "run-1",
        workflow_id: "workflow-1",
        workflow_step_id: "step-approval",
        workflow_step_run_id: pause.stepRunId,
      },
    });
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it("keeps workflow input and completed output out of approval metadata", async () => {
    const db = createFakeSupabase({
      workflow_runs: [{ id: "run-1", user_id: "user-1", status: "running" }],
    });

    await pauseForWorkflowApproval({
      db,
      userId: "user-1",
      orgId: "org-1",
      workflowId: "workflow-1",
      workflowName: "Sensitive workflow",
      runId: "run-1",
      step: approvalStep,
      completed: [{ step_id: "secret-step", output: "sensitive-output" }],
    });

    const approval = requiredRow(db, "approval_requests");
    const details = approval["details"] as Record<string, unknown>;
    expect(JSON.stringify(details)).not.toContain("sensitive-output");
    expect(Object.keys(details).sort()).toEqual([
      "workflow_id",
      "workflow_run_id",
      "workflow_step_id",
      "workflow_step_run_id",
    ]);
  });

  it("expires the approval if the run can no longer enter the waiting state", async () => {
    const db = createFakeSupabase({
      workflow_runs: [{ id: "run-1", user_id: "user-1", status: "cancelled" }],
    });

    await expect(
      pauseForWorkflowApproval({
        db,
        userId: "user-1",
        orgId: null,
        workflowId: "workflow-1",
        workflowName: "Release workflow",
        runId: "run-1",
        step: approvalStep,
        completed: [],
      }),
    ).rejects.toThrow(/could not enter approval state/i);

    expect(requiredRow(db, "approval_requests")).toMatchObject({ status: "expired" });
    expect(requiredRow(db, "workflow_runs")["status"]).toBe("cancelled");
  });
});

describe("waiting approval cancellation migration", () => {
  it("finalizes the run and cleans the approval gate when cancel_requested becomes true", () => {
    const migrationsDir = join(process.cwd(), "supabase", "migrations");
    const migrationName = readdirSync(migrationsDir).find((name) =>
      name.endsWith("workflow_approval_cancel_cleanup.sql"),
    );
    expect(migrationName).toBeTruthy();
    const sql = readFileSync(join(migrationsDir, migrationName!), "utf8");

    expect(sql).toContain("old.status = 'waiting_for_approval'");
    expect(sql).toContain("new.status := 'cancelled'");
    expect(sql).toContain("set status = 'expired'");
    expect(sql).toContain("and status = 'pending'");
    expect(sql).toContain("set status = 'cancelled'");
    expect(sql).toContain("new.waiting_approval_request_id := null");
    expect(sql).toContain("new.waiting_step_id := null");
  });
});
