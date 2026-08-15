import { describe, expect, it } from "vitest";
import {
  processQueuedWorkflowRuns,
  requeueAbandonedWorkflowRuns,
} from "../workflow-queue.server";
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
          claimed_at: "2026-08-15T10:00:00.000Z",
        },
      ],
    });

    await requeueAbandonedWorkflowRuns(sb as never);

    const run = workflowRun(sb);
    expect(run["status"]).toBe("queued");
    expect(run["claimed_at"]).toBeNull();
    expect(run["worker_attempts"]).toBe(1);
    expect(run["worker_error"]).toContain("lease expired");
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
    expect(run["worker_error"]).toContain("expired too many times");
    expect(run["completed_at"]).toBeTruthy();
  });

  it("allows only one competing worker to claim the same queued run", async () => {
    const sb = createFakeSupabase({
      workflow_runs: [
        {
          id: "run-3",
          workflow_id: "workflow-3",
          user_id: "user-1",
          org_id: null,
          status: "queued",
          queued_at: "2026-08-15T10:00:00.000Z",
          worker_attempts: 0,
          worker_heartbeat_at: null,
          cancel_requested: true,
        },
      ],
    });

    const [first, second] = await Promise.all([
      processQueuedWorkflowRuns(1, sb as never),
      processQueuedWorkflowRuns(1, sb as never),
    ]);

    const run = workflowRun(sb);
    expect(first.claimed + second.claimed).toBe(1);
    expect(run["worker_attempts"]).toBe(1);
    expect(run["status"]).toBe("cancelled");
  });

  it("fails a claimed run when an assigned agent is outside the queued owner scope", async () => {
    const sb = createFakeSupabase({
      workflow_runs: [
        {
          id: "run-4",
          workflow_id: "workflow-4",
          workforce_id: null,
          user_id: "user-1",
          org_id: null,
          status: "queued",
          queued_at: "2026-08-15T10:00:00.000Z",
          worker_attempts: 0,
          worker_heartbeat_at: null,
          cancel_requested: false,
          input: "Do the work",
          step_results: [],
        },
      ],
      workflows: [
        {
          id: "workflow-4",
          name: "Scoped workflow",
          org_id: null,
          user_id: "user-1",
          workforce_id: null,
          status: "active",
        },
      ],
      workflow_steps: [
        {
          id: "step-4",
          workflow_id: "workflow-4",
          position: 0,
          name: "Foreign agent step",
          kind: "agent",
          agent_id: "agent-foreign",
          mode: "sequential",
          depends_on: [],
          condition: null,
          input_template: null,
          max_retries: 0,
          retry_delay_ms: 0,
          timeout_ms: 30_000,
          continue_on_error: false,
          requires_approval: false,
          config: null,
        },
      ],
      personal_agents: [
        {
          id: "agent-foreign",
          user_id: "user-2",
          org_id: null,
          org_id_fk: null,
          status: "active",
        },
      ],
    });

    const result = await processQueuedWorkflowRuns(1, sb as never);

    expect(result).toEqual({ claimed: 1, succeeded: 0, failed: 1 });
    const run = workflowRun(sb);
    expect(run["status"]).toBe("failed");
    expect(run["worker_attempts"]).toBe(1);
    expect(run["worker_error"]).toContain("outside its allowed scope");
  });
});
