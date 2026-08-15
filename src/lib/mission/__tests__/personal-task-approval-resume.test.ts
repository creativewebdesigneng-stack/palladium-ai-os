import { beforeEach, describe, expect, it, vi } from "vitest";

const gateway = vi.hoisted(() => ({ runChat: vi.fn() }));
const toolLayer = vi.hoisted(() => ({ resolveGrantedTools: vi.fn(), executeTool: vi.fn() }));
const entitlements = vi.hoisted(() => ({ getEntitlements: vi.fn() }));
const approvals = vi.hoisted(() => ({ pauseForPersonalTaskApproval: vi.fn() }));

vi.mock("@/lib/runtime/model-gateway.server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/runtime/model-gateway.server")>(
    "@/lib/runtime/model-gateway.server",
  );
  return { ...actual, runChat: gateway.runChat };
});

vi.mock("@/lib/runtime/tools.server", () => ({
  resolveGrantedTools: toolLayer.resolveGrantedTools,
  executeTool: toolLayer.executeTool,
}));

vi.mock("@/lib/platform/entitlements.server", () => ({
  getEntitlements: entitlements.getEntitlements,
}));

vi.mock("../personal-task-approval.server", async () => {
  const actual = await vi.importActual<typeof import("../personal-task-approval.server")>(
    "../personal-task-approval.server",
  );
  return { ...actual, pauseForPersonalTaskApproval: approvals.pauseForPersonalTaskApproval };
});

import {
  executePersonalTask,
  resumePersonalTaskApproval,
} from "../personal-task-execution.server";

const task = {
  id: "task-1",
  request: "Read the connected record and continue",
  title: "Connected record",
  category: "work",
  agent_id: "agent-1",
  org_id: null,
};

const agent = {
  id: "agent-1",
  name: "Ops",
  model_provider: "openai",
  model: "gpt-test",
  allowed_tools: ["connected_service"],
};

function approvalGrant() {
  return new Map([
    [
      "connected_service",
      {
        slug: "connected_service",
        requiresApproval: true,
        allowedDomains: [],
        spendCap: null,
      },
    ],
  ]);
}

describe("personal task approval pause/resume", () => {
  beforeEach(() => {
    gateway.runChat.mockReset();
    toolLayer.resolveGrantedTools.mockReset();
    toolLayer.executeTool.mockReset();
    entitlements.getEntitlements.mockReset();
    approvals.pauseForPersonalTaskApproval.mockReset();
    entitlements.getEntitlements.mockResolvedValue({ planCode: "business" });
  });

  it("pauses before executing an approval-gated tool", async () => {
    const grants = approvalGrant();
    toolLayer.resolveGrantedTools.mockResolvedValue({
      defs: [
        {
          name: "connected_service",
          description: "Connected service",
          parameters: { type: "object", properties: {}, required: [] },
        },
      ],
      grants,
    });
    gateway.runChat.mockResolvedValue({
      text: "",
      toolCalls: [
        {
          id: "call-1",
          name: "connected_service",
          arguments: { provider: "github", action: "notifications" },
        },
      ],
      provider: "openai",
      model: "gpt-test",
      usage: { input: 4, output: 2 },
    });
    approvals.pauseForPersonalTaskApproval.mockResolvedValue({
      kind: "paused_for_approval",
      approvalRequestId: "approval-1",
      runId: "run-1",
      toolName: "connected_service",
    });

    const updates: Array<Record<string, unknown>> = [];
    const sb = {
      from(table: string) {
        const chain: any = {
          update(patch: Record<string, unknown>) {
            updates.push({ table, ...patch });
            return chain;
          },
          insert() {
            return chain;
          },
          select() {
            return chain;
          },
          eq() {
            return chain;
          },
          maybeSingle() {
            return Promise.resolve(
              table === "agent_tasks"
                ? { data: { id: "run-1" }, error: null }
                : { data: null, error: null },
            );
          },
        };
        return chain;
      },
    };

    const result = await executePersonalTask({ sb: sb as any, userId: "user-1", task, agent });

    expect(result).toEqual({
      status: "waiting_for_approval",
      approvalRequestId: "approval-1",
      toolName: "connected_service",
      runId: "run-1",
    });
    expect(toolLayer.executeTool).not.toHaveBeenCalled();
    expect(approvals.pauseForPersonalTaskApproval).toHaveBeenCalledWith(
      expect.objectContaining({
        personalTaskId: "task-1",
        runId: "run-1",
        call: expect.objectContaining({ id: "call-1", name: "connected_service" }),
      }),
    );
    expect(
      updates.some(
        (u) => u["table"] === "personal_tasks" && u["status"] === "awaiting_approval",
      ),
    ).toBe(true);
  });

  it("resumes the existing agent_tasks row without creating a second run", async () => {
    const grants = approvalGrant();
    toolLayer.resolveGrantedTools.mockResolvedValue({
      defs: [
        {
          name: "connected_service",
          description: "Connected service",
          parameters: { type: "object", properties: {}, required: [] },
        },
      ],
      grants,
    });
    toolLayer.executeTool.mockResolvedValue({ ok: true, output: { connected: true } });
    gateway.runChat.mockResolvedValue({
      text: "Continued on the original run.",
      toolCalls: [],
      provider: "openai",
      model: "gpt-test",
      usage: { input: 3, output: 4 },
    });

    const resumeState = {
      version: 1,
      provider: "openai",
      model: "gpt-test",
      messages: [
        { role: "system", content: "system" },
        { role: "user", content: task.request },
        {
          role: "assistant",
          content: "",
          tool_calls: [
            {
              id: "call-1",
              name: "connected_service",
              arguments: { provider: "github", action: "notifications" },
            },
          ],
        },
      ],
      usage: { input: 4, output: 2 },
      toolCalls: 1,
      pendingCall: {
        id: "call-1",
        name: "connected_service",
        arguments: { provider: "github", action: "notifications" },
      },
      skippedCalls: [],
    };

    const inserts: string[] = [];
    const updates: Array<{ table: string; patch: Record<string, unknown> }> = [];
    const sb = {
      from(table: string) {
        let mode: "read" | "update" | "insert" = "read";
        const chain: any = {
          select() {
            return chain;
          },
          update(patch: Record<string, unknown>) {
            mode = "update";
            updates.push({ table, patch });
            return chain;
          },
          insert() {
            mode = "insert";
            inserts.push(table);
            return chain;
          },
          eq() {
            return chain;
          },
          maybeSingle() {
            if (table === "agent_tasks" && mode === "read") {
              return Promise.resolve({
                data: {
                  id: "run-1",
                  user_id: "user-1",
                  task_id: "task-1",
                  status: "waiting_for_approval",
                  waiting_approval_request_id: "approval-1",
                  approval_resume_state: resumeState,
                  started_at: new Date().toISOString(),
                },
                error: null,
              });
            }
            if (table === "agent_tasks" && mode === "update") {
              return Promise.resolve({ data: { id: "run-1" }, error: null });
            }
            if (table === "personal_tasks" && mode === "read") {
              return Promise.resolve({ data: task, error: null });
            }
            if (table === "personal_agents" && mode === "read") {
              return Promise.resolve({ data: agent, error: null });
            }
            return Promise.resolve({ data: null, error: null });
          },
        };
        return chain;
      },
    };

    const result = await resumePersonalTaskApproval({
      sb: sb as any,
      userId: "user-1",
      approvalRequestId: "approval-1",
      decision: "approved",
    });

    expect(result).toMatchObject({ status: "completed", runId: "run-1" });
    expect(inserts).not.toContain("agent_tasks");
    expect(toolLayer.executeTool).toHaveBeenCalledWith(
      "connected_service",
      { provider: "github", action: "notifications" },
      expect.objectContaining({ taskId: "run-1" }),
      expect.any(Map),
    );
    expect(
      updates.some(
        (u) => u.table === "agent_tasks" && u.patch["status"] === "succeeded",
      ),
    ).toBe(true);
  });
});
