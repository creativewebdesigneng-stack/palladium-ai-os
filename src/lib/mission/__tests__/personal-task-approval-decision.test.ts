import { beforeEach, describe, expect, it, vi } from "vitest";

const execution = vi.hoisted(() => ({ resumePersonalTaskApproval: vi.fn() }));

vi.mock("../personal-task-execution.server", () => ({
  resumePersonalTaskApproval: execution.resumePersonalTaskApproval,
}));

import { decidePersonalTaskToolApproval } from "../personal-task-approval-decision.server";

type Fixture = {
  approval?: Record<string, unknown> | null;
  run?: Record<string, unknown> | null;
  decided?: Record<string, unknown> | null;
};

function fakeSb(fixture: Fixture) {
  return {
    from(table: string) {
      let mode: "read" | "update" = "read";
      const filters: Record<string, unknown> = {};
      const chain: any = {
        select() {
          return chain;
        },
        update() {
          mode = "update";
          return chain;
        },
        eq(column: string, value: unknown) {
          filters[column] = value;
          return chain;
        },
        maybeSingle() {
          if (table === "approval_requests" && mode === "read") {
            return Promise.resolve({ data: fixture.approval ?? null, error: null });
          }
          if (table === "approval_requests" && mode === "update") {
            return Promise.resolve({ data: fixture.decided ?? null, error: null });
          }
          if (table === "agent_tasks") {
            return Promise.resolve({ data: fixture.run ?? null, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        },
      };
      return chain;
    },
  };
}

const details = {
  personal_task_id: "task-1",
  agent_task_id: "run-1",
  tool_call_id: "call-1",
  tool_name: "connected_service_write",
};

const approval = {
  id: "approval-1",
  user_id: "user-1",
  status: "pending",
  action_type: "personal_task_tool",
  task_id: "task-1",
  details,
};

const run = {
  id: "run-1",
  user_id: "user-1",
  task_id: "task-1",
  status: "waiting_for_approval",
  waiting_approval_request_id: "approval-1",
  approval_resume_state: {
    version: 1,
    pendingCall: {
      id: "call-1",
      name: "connected_service_write",
      arguments: { provider: "linear", action: "linear_issue_create" },
    },
  },
};

describe("personal task approval decision", () => {
  beforeEach(() => {
    execution.resumePersonalTaskApproval.mockReset();
    execution.resumePersonalTaskApproval.mockResolvedValue({
      status: "completed",
      summary: "Done",
      provider: "openai",
      model: "gpt-test",
      usage: { input: 10, output: 5 },
      toolCalls: 1,
      runId: "run-1",
    });
  });

  it("approves and resumes the exact waiting agent run", async () => {
    const sb = fakeSb({ approval, run, decided: { id: "approval-1", status: "approved" } });

    const result = await decidePersonalTaskToolApproval({
      sb: sb as any,
      userId: "user-1",
      approvalRequestId: "approval-1",
      decision: "approved",
    });

    expect(result.status).toBe("approved");
    expect(result.execution).toMatchObject({ status: "completed", runId: "run-1" });
    expect(execution.resumePersonalTaskApproval).toHaveBeenCalledWith(
      expect.objectContaining({
        sb,
        userId: "user-1",
        approvalRequestId: "approval-1",
        decision: "approved",
      }),
    );
  });

  it("passes rejection into the same-run resume path", async () => {
    const sb = fakeSb({ approval, run, decided: { id: "approval-1", status: "rejected" } });

    const result = await decidePersonalTaskToolApproval({
      sb: sb as any,
      userId: "user-1",
      approvalRequestId: "approval-1",
      decision: "rejected",
      note: "Do not change the external record",
    });

    expect(result.status).toBe("rejected");
    expect(execution.resumePersonalTaskApproval).toHaveBeenCalledWith(
      expect.objectContaining({
        approvalRequestId: "approval-1",
        decision: "rejected",
        note: "Do not change the external record",
      }),
    );
  });

  it("rejects a second decision before any resume occurs", async () => {
    const sb = fakeSb({ approval: { ...approval, status: "approved" }, run });

    await expect(
      decidePersonalTaskToolApproval({
        sb: sb as any,
        userId: "user-1",
        approvalRequestId: "approval-1",
        decision: "approved",
      }),
    ).rejects.toThrow("already been decided");
    expect(execution.resumePersonalTaskApproval).not.toHaveBeenCalled();
  });

  it("rejects an approval that does not belong to the authenticated owner", async () => {
    const sb = fakeSb({ approval: { ...approval, user_id: "other-user" }, run });

    await expect(
      decidePersonalTaskToolApproval({
        sb: sb as any,
        userId: "user-1",
        approvalRequestId: "approval-1",
        decision: "approved",
      }),
    ).rejects.toThrow("Only the task owner");
    expect(execution.resumePersonalTaskApproval).not.toHaveBeenCalled();
  });

  it("rejects stale tool-call associations", async () => {
    const staleRun = {
      ...run,
      approval_resume_state: {
        ...(run.approval_resume_state as Record<string, unknown>),
        pendingCall: {
          id: "different-call",
          name: "connected_service_write",
          arguments: {},
        },
      },
    };
    const sb = fakeSb({ approval, run: staleRun });

    await expect(
      decidePersonalTaskToolApproval({
        sb: sb as any,
        userId: "user-1",
        approvalRequestId: "approval-1",
        decision: "approved",
      }),
    ).rejects.toThrow("stale or mismatched");
    expect(execution.resumePersonalTaskApproval).not.toHaveBeenCalled();
  });
});