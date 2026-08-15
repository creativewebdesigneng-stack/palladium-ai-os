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
  request: "Create a branch for the onboarding fix",
  title: "Create GitHub branch",
  category: "work",
  agent_id: "agent-1",
};

const agent = {
  id: "agent-1",
  name: "Code Ops",
  model_provider: "openai",
  model: "gpt-test",
  allowed_tools: ["github_write"],
};

const def = {
  name: "github_write",
  description: "Queue a GitHub change for approval",
  parameters: {
    type: "object",
    properties: {
      action: { type: "string" },
      repository: { type: "string" },
      branch: { type: "string" },
      base_sha: { type: "string" },
    },
    required: ["action", "repository", "branch"],
  },
};

describe("personal GitHub write approval handoff", () => {
  beforeEach(() => {
    gateway.runChat.mockReset();
    toolLayer.resolveGrantedTools.mockReset();
    toolLayer.executeTool.mockReset();
    entitlements.getEntitlements.mockReset();
    approvals.pauseForPersonalTaskApproval.mockReset();
    entitlements.getEntitlements.mockResolvedValue({ planCode: "business" });
  });

  it("queues one immutable GitHub approval instead of using the generic pause layer", async () => {
    const grants = new Map([
      [
        "github_write",
        {
          slug: "github_write",
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
        approval_request_id: "approval-github-1",
        status: "pending",
        provider: "github",
        action: "github_branch_create",
        risk_level: "high",
        mutation_executed: false,
      },
    });
    gateway.runChat
      .mockResolvedValueOnce({
        text: "",
        toolCalls: [
          {
            id: "github-1",
            name: "github_write",
            arguments: {
              action: "github_branch_create",
              repository: "acme/app",
              branch: "fix/onboarding",
              base_sha: "0123456789abcdef0123456789abcdef01234567",
            },
          },
        ],
        provider: "openai",
        model: "gpt-test",
        usage: { input: 4, output: 2 },
      })
      .mockResolvedValueOnce({
        text: "The GitHub branch change is queued for your approval.",
        toolCalls: [],
        provider: "openai",
        model: "gpt-test",
        usage: { input: 3, output: 3 },
      });

    const sb = fakeSb();
    const result = await executePersonalTask({ sb: sb as any, userId: "user-1", task, agent });

    expect(result).toMatchObject({ status: "completed", runId: "run-1", toolCalls: 1 });
    expect(approvals.pauseForPersonalTaskApproval).not.toHaveBeenCalled();
    expect(toolLayer.executeTool).toHaveBeenCalledWith(
      "github_write",
      expect.objectContaining({
        action: "github_branch_create",
        repository: "acme/app",
        branch: "fix/onboarding",
      }),
      expect.objectContaining({ userId: "user-1", agentId: "agent-1", taskId: "run-1" }),
      expect.any(Map),
    );
    const secondMessages = gateway.runChat.mock.calls[1]?.[0]?.messages ?? [];
    expect(
      secondMessages.some(
        (message: any) =>
          message.role === "tool" &&
          message.name === "github_write" &&
          message.content.includes("approval-github-1") &&
          message.content.includes('"mutation_executed":false'),
      ),
    ).toBe(true);
  });

  it("does not expose GitHub writes unless the resolved grant still requires approval", async () => {
    toolLayer.resolveGrantedTools.mockResolvedValue({
      defs: [def],
      grants: new Map([
        [
          "github_write",
          {
            slug: "github_write",
            requiresApproval: false,
            allowedDomains: [],
            spendCap: null,
          },
        ],
      ]),
    });
    gateway.runChat.mockResolvedValue({
      text: "No GitHub write tool is available.",
      toolCalls: [],
      provider: "openai",
      model: "gpt-test",
      usage: { input: 1, output: 1 },
    });

    const sb = fakeSb();
    await executePersonalTask({ sb: sb as any, userId: "user-1", task, agent });

    const exposed = gateway.runChat.mock.calls[0]?.[0]?.tools ?? [];
    expect(exposed.map((tool: any) => tool.name)).not.toContain("github_write");
    expect(toolLayer.executeTool).not.toHaveBeenCalled();
    expect(approvals.pauseForPersonalTaskApproval).not.toHaveBeenCalled();
  });
});
