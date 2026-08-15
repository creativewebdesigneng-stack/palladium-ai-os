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
  request: "Send the approved update",
  title: "Communication update",
  category: "work",
  agent_id: "agent-1",
};

const agent = {
  id: "agent-1",
  name: "Comms Ops",
  model_provider: "openai",
  model: "gpt-test",
};

function def(name: string) {
  return {
    name,
    description: name,
    parameters: { type: "object", properties: {}, required: [] },
  };
}

function approvalGrant(slug: string) {
  return {
    slug,
    requiresApproval: true,
    allowedDomains: [],
    spendCap: null,
  };
}

function directGrant(slug: string) {
  return {
    slug,
    requiresApproval: false,
    allowedDomains: [],
    spendCap: null,
  };
}

async function runSelfQueuingTool(name: string, args: Record<string, unknown>) {
  const grants = new Map([[name, approvalGrant(name)]]);
  toolLayer.resolveGrantedTools.mockResolvedValue({ defs: [def(name)], grants });
  toolLayer.executeTool.mockResolvedValue({
    ok: true,
    output: { queued: true, approval_request_id: `approval-${name}`, status: "pending" },
  });
  gateway.runChat
    .mockResolvedValueOnce({
      text: "",
      toolCalls: [{ id: `${name}-1`, name, arguments: args }],
      provider: "openai",
      model: "gpt-test",
      usage: { input: 3, output: 2 },
    })
    .mockResolvedValueOnce({
      text: "Queued for approval.",
      toolCalls: [],
      provider: "openai",
      model: "gpt-test",
      usage: { input: 2, output: 2 },
    });

  const sb = fakeSb();
  const result = await executePersonalTask({
    sb: sb as any,
    userId: "user-1",
    task,
    agent: { ...agent, allowed_tools: [name] },
  });

  expect(result).toMatchObject({ status: "completed", runId: "run-1", toolCalls: 1 });
  expect(approvals.pauseForPersonalTaskApproval).not.toHaveBeenCalled();
  expect(toolLayer.executeTool).toHaveBeenCalledWith(
    name,
    args,
    expect.objectContaining({ userId: "user-1", agentId: "agent-1", taskId: "run-1" }),
    grants,
  );
}

describe("personal communication and calendar tools", () => {
  beforeEach(() => {
    gateway.runChat.mockReset();
    toolLayer.resolveGrantedTools.mockReset();
    toolLayer.executeTool.mockReset();
    entitlements.getEntitlements.mockReset();
    approvals.pauseForPersonalTaskApproval.mockReset();
    entitlements.getEntitlements.mockResolvedValue({ planCode: "business" });
  });

  it("lets email drafts queue their existing approval without a second pause layer", async () => {
    await runSelfQueuingTool("email_draft", {
      to: "customer@example.com",
      subject: "Follow-up",
      body: "Draft body",
      provider: "google",
    });
  });

  it("lets email sends queue their existing approval without a second pause layer", async () => {
    await runSelfQueuingTool("email_send", {
      to: "customer@example.com",
      subject: "Follow-up",
      body: "Send body",
      provider: "microsoft",
    });
  });

  it("lets Slack posts queue their existing approval without a second pause layer", async () => {
    await runSelfQueuingTool("slack_post", {
      channel: "C0123456789",
      text: "Deployment completed.",
    });
  });

  it("allows the calendar wrapper when it can read or self-queue an event directly", async () => {
    const grants = new Map([["calendar", directGrant("calendar")]]);
    toolLayer.resolveGrantedTools.mockResolvedValue({ defs: [def("calendar")], grants });
    toolLayer.executeTool.mockResolvedValue({
      ok: true,
      output: { proposed: true, approval_request_id: "approval-calendar", status: "awaiting_approval" },
    });
    gateway.runChat
      .mockResolvedValueOnce({
        text: "",
        toolCalls: [
          {
            id: "calendar-1",
            name: "calendar",
            arguments: {
              action: "propose",
              title: "Customer review",
              when: "2026-08-20T10:00:00Z",
              provider: "google",
            },
          },
        ],
        provider: "openai",
        model: "gpt-test",
        usage: { input: 3, output: 2 },
      })
      .mockResolvedValueOnce({
        text: "The event is awaiting approval.",
        toolCalls: [],
        provider: "openai",
        model: "gpt-test",
        usage: { input: 2, output: 2 },
      });

    const sb = fakeSb();
    const result = await executePersonalTask({
      sb: sb as any,
      userId: "user-1",
      task,
      agent: { ...agent, allowed_tools: ["calendar"] },
    });

    expect(result).toMatchObject({ status: "completed", runId: "run-1", toolCalls: 1 });
    expect(approvals.pauseForPersonalTaskApproval).not.toHaveBeenCalled();
    expect(toolLayer.executeTool).toHaveBeenCalledWith(
      "calendar",
      expect.objectContaining({ action: "propose", title: "Customer review" }),
      expect.objectContaining({ taskId: "run-1" }),
      grants,
    );
  });

  it("hides calendar if its resolved grant would create a second generic approval layer", async () => {
    const grants = new Map([["calendar", approvalGrant("calendar")]]);
    toolLayer.resolveGrantedTools.mockResolvedValue({ defs: [def("calendar")], grants });
    gateway.runChat.mockResolvedValue({
      text: "Calendar is not available under this approval policy.",
      toolCalls: [],
      provider: "openai",
      model: "gpt-test",
      usage: { input: 1, output: 1 },
    });

    const sb = fakeSb();
    await executePersonalTask({
      sb: sb as any,
      userId: "user-1",
      task,
      agent: { ...agent, allowed_tools: ["calendar"] },
    });

    const exposed = gateway.runChat.mock.calls[0]?.[0]?.tools ?? [];
    expect(exposed.map((tool: any) => tool.name)).not.toContain("calendar");
    expect(toolLayer.executeTool).not.toHaveBeenCalled();
    expect(approvals.pauseForPersonalTaskApproval).not.toHaveBeenCalled();
  });
});
