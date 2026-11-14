import { describe, expect, it } from "vitest";
import { buildMissionOperations } from "./mission-operations";

const now = "2026-11-14T12:00:00.000Z";
const sources = {
  agents: { available: true },
  agentRuns: { available: true },
  workforces: { available: true },
  workflowRuns: { available: true },
  workflows: { available: true },
  goals: { available: true },
  audit: { available: true },
};

describe("mission operations from real ledgers", () => {
  it("marks ownership, stale workers, schedules and audit-backed receipts without inventing zeros", () => {
    const operations = buildMissionOperations({
      now,
      sources,
      agents: [{ id: "agent-1", name: "Atlas" }],
      agentRuns: [
        {
          id: "task-live",
          agent_id: "agent-1",
          title: "Research",
          input: "Research the brief",
          status: "running",
          heartbeat_at: "2026-11-14T11:50:00.000Z",
          has_checkpoint: true,
          replan_count: 1,
        },
        {
          id: "task-done",
          agent_id: "agent-1",
          title: "Write",
          input: "Write the note",
          status: "succeeded",
          provider: "openai",
          model: "gpt-5-mini",
          output_text: "The note",
          tool_calls: 2,
          completed_at: "2026-11-14T11:00:00.000Z",
        },
        {
          id: "task-other",
          agent_id: "missing-agent",
          title: "Foreign",
          status: "failed",
          resume_count: 3,
        },
      ],
      workforces: [{ id: "wf-1", name: "Ops", status: "active" }],
      workflowRuns: [
        {
          id: "run-1",
          workforce_id: "wf-1",
          status: "running",
          worker_heartbeat_at: "2026-11-14T11:59:00.000Z",
          started_at: "2026-11-14T11:00:00.000Z",
        },
        {
          id: "run-2",
          status: "succeeded",
          started_at: "2026-11-14T10:00:00.000Z",
          completed_at: "2026-11-14T10:00:02.000Z",
        },
      ],
      workflows: [
        {
          id: "flow-1",
          name: "Morning",
          status: "active",
          schedule: "0 9 * * 1-5",
          trigger_type: "schedule",
        },
      ],
      goals: [
        {
          id: "goal-1",
          name: "Watch",
          status: "active",
          trigger_type: "schedule",
          schedule_cron: "*/15 * * * *",
          timezone: "UTC",
          next_run_at: "2026-11-14T12:15:00.000Z",
        },
      ],
      audit: [
        {
          action: "agent.run_result",
          target_id: "task-done",
          status: "success",
          metadata: { provider: "openai", model: "gpt-5-mini" },
          created_at: now,
        },
      ],
    });

    expect(operations.ownership).toEqual({
      available: true,
      owned: 2,
      unassigned: 0,
      unmatched: 1,
    });
    expect(operations.executions.find((row) => row.id === "task-live")).toMatchObject({
      worker: "stale",
      assignment: "owned",
      canCancel: true,
    });
    expect(operations.recovery.find((row) => row.id === "task-live")?.kind).toBe(
      "scheduler_recoverable",
    );
    expect(operations.recovery.find((row) => row.id === "task-other")?.kind).toBe(
      "resume_exhausted",
    );
    expect(operations.workers.find((row) => row.id === "workflow:run-1")?.status).toBe("healthy");
    expect(operations.receipts.find((row) => row.taskId === "task-done")?.provesExecution).toBe(
      true,
    );
    expect(operations.schedules.goals?.[0]?.cron).toBe("*/15 * * * *");
    expect(operations.schedules.workflows?.[0]?.schedule).toBe("0 9 * * 1-5");
    expect(operations.workforceReport.averageDurationMs).toBe(2000);
    expect(operations.workforceReport.activeWorkforces).toBe(1);
  });

  it("does not present an unavailable workforce ledger as an empty real report", () => {
    const operations = buildMissionOperations({
      now,
      sources: {
        ...sources,
        workforces: { available: false },
        workflowRuns: { available: false },
        goals: { available: false },
        workflows: { available: false },
        audit: { available: false },
      },
      agents: [],
      agentRuns: [],
      workforces: [],
      workflowRuns: [],
      workflows: [],
      goals: [],
      audit: [],
    });

    expect(operations.workforceReport.available).toBe(false);
    expect(operations.workforceReport.workforces).toBeNull();
    expect(operations.workforceReport.runs).toBeNull();
    expect(operations.schedules.goals).toBeNull();
    expect(operations.schedules.workflows).toBeNull();
    expect(operations.receipts).toEqual([]);
  });
});
