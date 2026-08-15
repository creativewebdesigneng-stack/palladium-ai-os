import { beforeEach, describe, expect, it, vi } from "vitest";

const gateway = vi.hoisted(() => ({ runChat: vi.fn() }));
const toolLayer = vi.hoisted(() => ({ resolveGrantedTools: vi.fn(), executeTool: vi.fn() }));
const entitlements = vi.hoisted(() => ({ getEntitlements: vi.fn() }));
const approvals = vi.hoisted(() => ({ pauseForPersonalTaskApproval: vi.fn() }));
const browserInteraction = vi.hoisted(() => ({ executeApproved: vi.fn() }));

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

vi.mock("../personal-browser-interaction.server", async () => {
  const actual = await vi.importActual<typeof import("../personal-browser-interaction.server")>(
    "../personal-browser-interaction.server",
  );
  return { ...actual, executeApprovedPersonalBrowserInteraction: browserInteraction.executeApproved };
});

import { executePersonalTask } from "../personal-task-execution.server";

function fakeSb() {
  const updates: Array<{ table: string; patch: Record<string, unknown> }> = [];
  return {
    updates,
    from(table: string) {
      let selected = false;
      const chain: any = {
        update(patch: Record<string, unknown>) {
          updates.push({ table, patch });
          return chain;
        },
        insert() {
          return chain;
        },
        select() {
          selected = true;
          return chain;
        },
        eq() {
          return chain;
        },
        maybeSingle() {
          if (table === "agent_tasks" && selected) return Promise.resolve({ data: { id: "run-1" }, error: null });
          return Promise.resolve({ data: null, error: null });
        },
      };
      return chain;
    },
  };
}

describe("personal browser interaction approval", () => {
  beforeEach(() => {
    gateway.runChat.mockReset();
    toolLayer.resolveGrantedTools.mockReset();
    toolLayer.executeTool.mockReset();
    entitlements.getEntitlements.mockReset();
    approvals.pauseForPersonalTaskApproval.mockReset();
    browserInteraction.executeApproved.mockReset();
    entitlements.getEntitlements.mockResolvedValue({ planCode: "business" });
    approvals.pauseForPersonalTaskApproval.mockResolvedValue({
      kind: "paused_for_approval",
      approvalRequestId: "approval-browser-1",
      runId: "run-1",
      toolName: "browser_interact",
    });
  });

  it("pauses the exact browser interaction before any click or type executes", async () => {
    toolLayer.resolveGrantedTools.mockResolvedValue({
      defs: [
        {
          name: "browser",
          description: "Browser",
          parameters: { type: "object", properties: {}, required: [] },
        },
      ],
      grants: new Map([
        ["browser", { slug: "browser", requiresApproval: false, allowedDomains: ["example.com"], spendCap: null }],
      ]),
    });
    gateway.runChat.mockResolvedValue({
      text: "",
      toolCalls: [
        {
          id: "interaction-1",
          name: "browser_interact",
          arguments: {
            url: "https://example.com/contact",
            steps: [
              { action: "type", selector: "#message", text: "Hello" },
              { action: "click", selector: "button[type=submit]" },
            ],
          },
        },
      ],
      provider: "openai",
      model: "gpt-test",
      usage: { input: 5, output: 2 },
    });

    const sb = fakeSb();
    const result = await executePersonalTask({
      sb: sb as any,
      userId: "user-1",
      task: {
        id: "task-1",
        request: "Send the contact form",
        title: "Contact form",
        agent_id: "agent-1",
      },
      agent: {
        id: "agent-1",
        name: "Ops",
        model_provider: "openai",
        model: "gpt-test",
        allowed_tools: ["browser"],
      },
    });

    expect(result).toEqual({
      status: "waiting_for_approval",
      approvalRequestId: "approval-browser-1",
      toolName: "browser_interact",
      runId: "run-1",
    });
    expect(approvals.pauseForPersonalTaskApproval).toHaveBeenCalledWith(
      expect.objectContaining({
        personalTaskId: "task-1",
        runId: "run-1",
        call: expect.objectContaining({ id: "interaction-1", name: "browser_interact" }),
      }),
    );
    expect(browserInteraction.executeApproved).not.toHaveBeenCalled();
    expect(toolLayer.executeTool).not.toHaveBeenCalledWith(
      "browser_interact",
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });
});
