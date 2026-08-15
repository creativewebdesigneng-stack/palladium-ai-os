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

import { executePersonalTask } from "../personal-task-execution.server";

function fakeSb() {
  const updates: Array<{ table: string; patch: Record<string, unknown>; filters: Record<string, unknown> }> = [];
  const inserts: Array<{ table: string; row: Record<string, unknown> }> = [];
  return {
    updates,
    inserts,
    from(table: string) {
      const filters: Record<string, unknown> = {};
      let selected = false;
      const chain: any = {
        update(patch: Record<string, unknown>) {
          updates.push({ table, patch, filters });
          return chain;
        },
        insert(row: Record<string, unknown>) {
          inserts.push({ table, row });
          return chain;
        },
        select() {
          selected = true;
          return chain;
        },
        maybeSingle() {
          if (table === "agent_tasks" && selected) {
            return Promise.resolve({ data: { id: "run-1" }, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        },
        eq(column: string, value: unknown) {
          filters[column] = value;
          return chain;
        },
      };
      return chain;
    },
  };
}

const task = {
  id: "task-1",
  request: "Create a Linear issue for the onboarding bug",
  title: "Create Linear issue",
  category: "work",
  agent_id: "agent-1",
};

const agent = {
  id: "agent-1",
  name: "Ops",
  model_provider: "openai",
  model: "gpt-test",
  allowed_tools: ["connected_service_write"],
};

const def = {
  name: "connected_service_write",
  description: "Queue a connected service write for approval",
  parameters: {
    type: "object",
    properties: {
      provider: { type: "string" },
      action: { type: "string" },
      title: { type: "string" },
    },
    required: ["provider", "action"],
  },
};

describe("personal connected-service write approval handoff", () => {
  beforeEach(() => {
    gateway.runChat.mockReset();
    toolLayer.resolveGrantedTools.mockReset();
    toolLayer.executeTool.mockReset();
    entitlements.getEntitlements.mockReset();
    approvals.pauseForPersonalTaskApproval.mockReset();
    entitlements.getEntitlements.mockResolvedValue({ planCode: "business" });
  });

  it("queues exactly one existing approval instead of adding a second pause layer", async () => {
    const grants = new Map([
      [
        "connected_service_write",
        {
          slug: "connected_service_write",
          requiresApproval: true,
          allowedDomains: [],
          spendCap: null,
        },
      ],
    ]);
    toolLayer.resolveGrantedTools.mockResolvedValue({ defs: [def], grants });
    toolLayer.executeTool.mockResolvedValue({
      ok: true,
      output: {
        queued: true,
        approval_request_id: "approval-write-1",
        status: "pending",
        provider: "linear",
        action: "linear_issue_create",
      },
    });
    gateway.runChat
      .mockResolvedValueOnce({
        text: "",
        toolCalls: [
          {
            id: "write-1",
            name: "connected_service_write",
            arguments: {
              provider: "linear",
              action: "linear_issue_create",
              team_id: "team-1",
              title: "Fix onboarding bug",
            },
          },
        ],
        provider: "openai",
        model: "gpt-test",
        usage: { input: 4, output: 2 },
      })
      .mockResolvedValueOnce({
        text: "The Linear issue is queued for your approval.",
        toolCalls: [],
        provider: "openai",
        model: "gpt-test",
        usage: { input: 3, output: 3 },
      });

    const sb = fakeSb();
    const result = await executePersonalTask({
      sb: sb as any,
      userId: "user-1",
      task,
      agent,
    });

    expect(result).toMatchObject({ status: "completed", runId: "run-1", toolCalls: 1 });
    expect(approvals.pauseForPersonalTaskApproval).not.toHaveBeenCalled();
    expect(toolLayer.executeTool).toHaveBeenCalledWith(
      "connected_service_write",
      expect.objectContaining({ provider: "linear", action: "linear_issue_create" }),
      expect.objectContaining({ userId: "user-1", agentId: "agent-1", taskId: "run-1" }),
      expect.any(Map),
    );
    expect(gateway.runChat).toHaveBeenCalledTimes(2);
    const secondMessages = gateway.runChat.mock.calls[1]?.[0]?.messages ?? [];
    expect(
      secondMessages.some(
        (message: any) =>
          message.role === "tool" &&
          message.name === "connected_service_write" &&
          message.content.includes("approval-write-1"),
      ),
    ).toBe(true);
  });

  it("does not expose a self-queuing write tool unless its grant is approval-required", async () => {
    toolLayer.resolveGrantedTools.mockResolvedValue({
      defs: [def],
      grants: new Map([
        [
          "connected_service_write",
          {
            slug: "connected_service_write",
            requiresApproval: false,
            allowedDomains: [],
            spendCap: null,
          },
        ],
      ]),
    });
    gateway.runChat.mockResolvedValue({
      text: "No write tool is available.",
      toolCalls: [],
      provider: "openai",
      model: "gpt-test",
      usage: { input: 1, output: 1 },
    });

    const sb = fakeSb();
    await executePersonalTask({ sb: sb as any, userId: "user-1", task, agent });

    const exposed = gateway.runChat.mock.calls[0]?.[0]?.tools ?? [];
    expect(exposed.map((tool: any) => tool.name)).not.toContain("connected_service_write");
    expect(toolLayer.executeTool).not.toHaveBeenCalled();
    expect(approvals.pauseForPersonalTaskApproval).not.toHaveBeenCalled();
  });
});
