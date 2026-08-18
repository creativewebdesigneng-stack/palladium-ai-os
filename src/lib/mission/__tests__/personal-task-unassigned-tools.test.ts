import { beforeEach, describe, expect, it, vi } from "vitest";

const gateway = vi.hoisted(() => ({ runChat: vi.fn() }));
const toolLayer = vi.hoisted(() => ({ resolveGrantedTools: vi.fn(), executeTool: vi.fn() }));
const entitlements = vi.hoisted(() => ({ getEntitlements: vi.fn() }));

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

import { ProviderError } from "@/lib/runtime/model-gateway.server";
import { executePersonalTask } from "../personal-task-execution.server";

type Update = { table: string; patch: Record<string, unknown>; filters: Record<string, unknown> };
type Insert = { table: string; row: Record<string, unknown> };

function fakeSb() {
  const updates: Update[] = [];
  const inserts: Insert[] = [];
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
            return Promise.resolve({ data: { id: "run-hotel" }, error: null });
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

const hotelTask = {
  id: "hotel-task",
  request: "Find me three good hotels in London for next weekend.",
  title: "Find me three good hotels in London for next weekend.",
  category: "travel",
  required_tools: ["web_search", "browser", "booking"],
  agent_id: null,
  org_id: null,
};

describe("unassigned personal-task tools", () => {
  beforeEach(() => {
    gateway.runChat.mockReset();
    toolLayer.resolveGrantedTools.mockReset();
    toolLayer.executeTool.mockReset();
    entitlements.getEntitlements.mockReset();
    entitlements.getEntitlements.mockResolvedValue({ planCode: "business" });
  });

  it("derives only safe executable research candidates for an unassigned hotel task", async () => {
    const grants = new Map([
      ["web_search", { slug: "web_search", requiresApproval: false, allowedDomains: [], spendCap: null }],
      ["browser", { slug: "browser", requiresApproval: false, allowedDomains: [], spendCap: null }],
    ]);
    toolLayer.resolveGrantedTools.mockResolvedValue({
      defs: [
        { name: "web_search", description: "Search", parameters: { type: "object", properties: {}, required: [] } },
        { name: "browser", description: "Browser", parameters: { type: "object", properties: { action: { type: "string" } }, required: ["action"] } },
      ],
      grants,
    });
    gateway.runChat.mockResolvedValue({
      text: "I found three live hotel options.",
      toolCalls: [],
      provider: "openai",
      model: "gpt-5-mini",
      usage: { input: 10, output: 10 },
    });

    const sb = fakeSb();
    await executePersonalTask({ sb: sb as any, userId: "user-1", task: hotelTask });

    expect(toolLayer.resolveGrantedTools).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        id: "personal-task-default",
        allowed_tools: ["web_search", "browser"],
        requires_approval: false,
      }),
      "business",
    );
    const exposed = gateway.runChat.mock.calls[0]?.[0]?.tools ?? [];
    expect(exposed.map((tool: any) => tool.name)).toContain("web_search");
    expect(exposed.map((tool: any) => tool.name)).not.toContain("booking");
    const browser = exposed.find((tool: any) => tool.name === "browser");
    expect(browser.parameters.properties.action.enum).not.toContain("click");
    expect(browser.parameters.properties.action.enum).not.toContain("type");
  });

  it("cannot smuggle sensitive or unsupported router aliases through required_tools", async () => {
    toolLayer.resolveGrantedTools.mockResolvedValue({ defs: [], grants: new Map() });
    gateway.runChat.mockResolvedValue({
      text: "No write tools were exposed.",
      toolCalls: [],
      provider: "openai",
      model: "gpt-5-mini",
      usage: { input: 1, output: 1 },
    });
    const sb = fakeSb();
    await executePersonalTask({
      sb: sb as any,
      userId: "user-1",
      task: {
        ...hotelTask,
        required_tools: ["web_search", "booking", "checkout", "email_send", "github_write", "not-a-tool"],
      },
    });

    expect(toolLayer.resolveGrantedTools.mock.calls[0]?.[1]?.allowed_tools).toEqual(["web_search"]);
  });

  it("finalises the audit row as failed and stores only a safe provider diagnostic", async () => {
    toolLayer.resolveGrantedTools.mockResolvedValue({ defs: [], grants: new Map() });
    gateway.runChat.mockRejectedValue(new ProviderError("upstream body should not be persisted", 503, true));
    const sb = fakeSb();

    const result = await executePersonalTask({ sb: sb as any, userId: "user-1", task: hotelTask });

    expect(result).toMatchObject({ status: "failed", error: "AI provider is not configured.", runId: "run-hotel" });
    const failedRun = sb.updates.find(
      (update) => update.table === "agent_tasks" && update.patch["status"] === "failed",
    );
    expect(failedRun?.patch["completed_at"]).toBeTruthy();
    expect(failedRun?.patch["error"]).toBe("AI provider call failed (status 503, retryable yes).");
    expect(String(failedRun?.patch["error"])).not.toContain("upstream body");
    expect(failedRun?.filters).toMatchObject({ id: "run-hotel", user_id: "user-1" });
  });
});
