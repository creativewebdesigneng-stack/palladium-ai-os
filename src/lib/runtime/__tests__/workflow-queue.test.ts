import { describe, expect, it } from "vitest";
import { requeueAbandonedWorkflowRuns } from "../workflow-queue.server";
import { createFakeSupabase } from "./fake-supabase";

function staleHeartbeat() {
  return new Date(Date.now() - 20 * 60 * 1000).toISOString();
}

function workflowRun(sb: ReturnType<typeof createFakeSupabase>, index = 0) {
  const run = sb.tables["workflow_runs"]?.[index];
  if (!run) throw new Error(`Expected workflow run fixture at index ${index}.`);
  return run;
}

describe("durable workflow queue", () => {
  it("requeues a stale running lease while retry budget remains", async () => {
    const sb = createFakeSupabase({
      workflow_runs: [
        {
          id: "run-1",
          status: "running",
          worker_attempts: 1,
          worker_heartbeat_at: staleHeartbeat(),
          worker_claimed_at: "2026-08-15T10:00:00.000Z",
        },
      ],
    });

    await requeueAbandonedWorkflowRuns(sb as never);

    const run = workflowRun(sb);
    expect(run["status"]).toBe("queued");
    expect(run["worker_claimed_at"]).toBeNull();
    expect(run["worker_attempts"]).toBe(1);
    expect(run["worker_error"]).toContain("heartbeat expired");
    expect(run["queued_at"]).toBeTruthy();
  });

  it("fails a stale run after the worker retry budget is exhausted", async () => {
    const sb = createFakeSupabase({
      workflow_runs: [
        {
          id: "run-2",
          status: "running",
          worker_attempts: 3,
          worker_heartbeat_at: staleHeartbeat(),
        },
      ],
    });

    await requeueAbandonedWorkflowRuns(sb as never);

    const run = workflowRun(sb);
    expect(run["status"]).toBe("failed");
    expect(run["worker_error"]).toContain("heartbeat expired");
    expect(run["completed_at"]).toBeTruthy();
  });
});