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

function fakeSb(options: { auditRunError?: boolean } = {}) {
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
            return Promise.resolve(
              options.auditRunError
                ? { data: null, error: { message: "audit insert failed" } }
                : { data: { id: "run-1" }, error: null },
            );
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
  request: "Draft a supplier follow-up plan",
  title: "Supplier follow-up",
  category: "work",
  required_tools: ["research"],
  agent_id: "agent-1",
};

const agent = {
  id: "agent-1",
  name: "Ops",
  model_provider: "openai",
  model: "gpt-test",
};

describe("personal task execution", () => {
  beforeEach(() => {
    gateway.runChat.mockReset();
    toolLayer.resolveGrantedTools.mockReset();
    toolLayer.executeTool.mockReset();
    entitlements.getEntitlements.mockReset();
    entitlements.getEntitlements.mockResolvedValue({ planCode: "business" });
    toolLayer.resolveGrantedTools.mockResolvedValue({ defs: [], grants: new Map() });
  });

  it("creates an auditable agent run linked to the personal task", async () => {
    gateway.runChat.mockResolvedValue({
      text: "Here is the plan.",
      toolCalls: [],
      provider: "openai",
      model: "gpt-test",
      usage: { input: 20, output: 30 },
    });
    const sb = fakeSb();

    const result = await executePersonalTask({ sb: sb as any, userId: "user-1", task, agent });

    expect(result).toMatchObject({ status: "completed", runId: "run-1" });
    const createdRun = sb.inserts.find((i) => i.table === "agent_tasks");
    expect(createdRun?.row).toMatchObject({
      user_id: "user-1",
      agent_id: "agent-1",
      task_id: "task-1",
      title: "Supplier follow-up",
      input: task.request,
      status: "running",
      provider: "openai",
      model: "gpt-test",
    });
    const completedRun = sb.updates.find(
      (u) => u.table === "agent_tasks" && u.patch["status"] === "succeeded",
    );
    expect(completedRun?.patch).toMatchObject({
      tokens_in: 20,
      tokens_out: 30,
      tool_calls: 0,
      output_text: "Here is the plan.",
    });
    expect(completedRun?.filters).toMatchObject({ id: "run-1", user_id: "user-1" });
  });

  it("runs a real model turn and stores the model output as the result", async () => {
    gateway.runChat.mockResolvedValue({
      text: "Here is the plan.",
      toolCalls: [],
      provider: "openai",
      model: "gpt-test",
      usage: { input: 20, output: 30 },
    });
    const sb = fakeSb();

    const result = await executePersonalTask({ sb: sb as any, userId: "user-1", task, agent });

    expect(result).toMatchObject({
      status: "completed",
      provider: "openai",
      model: "gpt-test",
      toolCalls: 0,
      runId: "run-1",
    });
    expect(gateway.runChat).toHaveBeenCalledTimes(1);
    const completed = sb.updates.find(
      (u) => u.table === "personal_tasks" && u.patch["status"] === "completed",
    );
    expect((completed?.patch["result"] as any).summary).toBe("Here is the plan.");
    expect((completed?.patch["result"] as any).agent_run_id).toBe("run-1");
    expect(completed?.filters).toMatchObject({ id: "task-1", user_id: "user-1" });
  });

  it("runs an allowed read-only tool with the agent run as its audit task", async () => {
    const grants = new Map([
      [
        "connected_service",
        {
          slug: "connected_service",
          requiresApproval: false,
          allowedDomains: [],
          spendCap: null,
        },
      ],
    ]);
    toolLayer.resolveGrantedTools.mockResolvedValue({
      defs: [
        {
          name: "connected_service",
          description: "Read a connected service",
          parameters: { type: "object", properties: {}, required: [] },
        },
      ],
      grants,
    });
    toolLayer.executeTool.mockResolvedValue({
      ok: true,
      output: { connected: true, items: [{ title: "Live item" }] },
    });
    gateway.runChat
      .mockResolvedValueOnce({
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
        usage: { input: 10, output: 5 },
      })
      .mockResolvedValueOnce({
        text: "I found the live item.",
        toolCalls: [],
        provider: "openai",
        model: "gpt-test",
        usage: { input: 12, output: 8 },
      });
    const sb = fakeSb();

    const result = await executePersonalTask({
      sb: sb as any,
      userId: "user-1",
      task,
      agent: { ...agent, allowed_tools: ["connected_service"] },
    });

    expect(result).toMatchObject({ status: "completed", toolCalls: 1, runId: "run-1" });
    expect(toolLayer.executeTool).toHaveBeenCalledWith(
      "connected_service",
      { provider: "github", action: "notifications" },
      expect.objectContaining({ userId: "user-1", agentId: "agent-1", taskId: "run-1" }),
      grants,
    );
    expect(gateway.runChat).toHaveBeenCalledTimes(2);
    const secondMessages = gateway.runChat.mock.calls[1]?.[0]?.messages ?? [];
    expect(secondMessages.some((m: any) => m.role === "tool" && m.content.includes("Live item"))).toBe(true);
  });

  it("exposes browser as a read-only schema while still filtering approval/write tools", async () => {
    const grants = new Map([
      ["connected_service", { slug: "connected_service", requiresApproval: false, allowedDomains: [], spendCap: null }],
      ["connected_service_write", { slug: "connected_service_write", requiresApproval: true, allowedDomains: [], spendCap: null }],
      ["github_write", { slug: "github_write", requiresApproval: true, allowedDomains: [], spendCap: null }],
      ["browser", { slug: "browser", requiresApproval: false, allowedDomains: ["example.com"], spendCap: null }],
    ]);
    toolLayer.resolveGrantedTools.mockResolvedValue({
      defs: [...grants.keys()].map((name) => ({
        name,
        description: name,
        parameters: {
          type: "object",
          properties:
            name === "browser"
              ? { action: { type: "string", enum: ["navigate", "read", "click", "type"] } }
              : {},
          required: [],
        },
      })),
      grants,
    });
    gateway.runChat.mockResolvedValue({
      text: "Safe answer",
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
      agent: {
        ...agent,
        allowed_tools: ["connected_service", "connected_service_write", "github_write", "browser"],
      },
    });

    const exposed = gateway.runChat.mock.calls[0]?.[0]?.tools ?? [];
    expect(exposed.map((d: any) => d.name)).toEqual(["connected_service", "browser"]);
    const browserDef = exposed.find((d: any) => d.name === "browser");
    expect(browserDef.parameters.properties.action.enum).toEqual([
      "navigate",
      "read",
      "extract",
      "scroll",
      "screenshot",
      "back",
      "forward",
      "wait",
    ]);
    expect(browserDef.parameters.properties.action.enum).not.toContain("click");
    expect(browserDef.parameters.properties.action.enum).not.toContain("type");
  });

  it("executes an allowed browser read action through the shared tool layer", async () => {
    const grants = new Map([
      ["browser", { slug: "browser", requiresApproval: false, allowedDomains: ["example.com"], spendCap: null }],
    ]);
    toolLayer.resolveGrantedTools.mockResolvedValue({
      defs: [
        {
          name: "browser",
          description: "Browser",
          parameters: { type: "object", properties: { action: { type: "string" } }, required: ["action"] },
        },
      ],
      grants,
    });
    toolLayer.executeTool.mockResolvedValue({ ok: true, output: { text: "Live page" } });
    gateway.runChat
      .mockResolvedValueOnce({
        text: "",
        toolCalls: [{ id: "browser-1", name: "browser", arguments: { action: "read", url: "https://example.com" } }],
        provider: "openai",
        model: "gpt-test",
        usage: { input: 2, output: 1 },
      })
      .mockResolvedValueOnce({
        text: "I read the live page.",
        toolCalls: [],
        provider: "openai",
        model: "gpt-test",
        usage: { input: 2, output: 2 },
      });
    const sb = fakeSb();

    await executePersonalTask({
      sb: sb as any,
      userId: "user-1",
      task,
      agent: { ...agent, allowed_tools: ["browser"] },
    });

    expect(toolLayer.executeTool).toHaveBeenCalledWith(
      "browser",
      { action: "read", url: "https://example.com" },
      expect.objectContaining({ taskId: "run-1" }),
      grants,
    );
  });

  it("blocks and audits browser click/type even if the model emits an out-of-schema call", async () => {
    const grants = new Map([
      ["browser", { slug: "browser", requiresApproval: false, allowedDomains: ["example.com"], spendCap: null }],
    ]);
    toolLayer.resolveGrantedTools.mockResolvedValue({
      defs: [
        {
          name: "browser",
          description: "Browser",
          parameters: { type: "object", properties: { action: { type: "string" } }, required: ["action"] },
        },
      ],
      grants,
    });
    gateway.runChat
      .mockResolvedValueOnce({
        text: "",
        toolCalls: [{ id: "browser-1", name: "browser", arguments: { action: "click", selector: "#submit" } }],
        provider: "openai",
        model: "gpt-test",
        usage: { input: 2, output: 1 },
      })
      .mockResolvedValueOnce({
        text: "That action needs approval.",
        toolCalls: [],
        provider: "openai",
        model: "gpt-test",
        usage: { input: 2, output: 2 },
      });
    const sb = fakeSb();

    await executePersonalTask({
      sb: sb as any,
      userId: "user-1",
      task,
      agent: { ...agent, allowed_tools: ["browser"] },
    });

    expect(toolLayer.executeTool).not.toHaveBeenCalled();
    const blocked = sb.inserts.find((i) => i.table === "tool_executions" && i.row.tool === "browser");
    expect(blocked?.row).toMatchObject({
      user_id: "user-1",
      agent_id: "agent-1",
      agent_task_id: "run-1",
      status: "failed",
      input: { action: "click" },
    });
    const secondMessages = gateway.runChat.mock.calls[1]?.[0]?.messages ?? [];
    expect(
      secondMessages.some(
        (m: any) => m.role === "tool" && m.content.includes("not permitted in a read-only personal-task run"),
      ),
    ).toBe(true);
  });

  it("marks the personal task running before the provider call", async () => {
    gateway.runChat.mockResolvedValue({
      text: "Done",
      toolCalls: [],
      provider: "openai",
      model: "gpt-test",
      usage: { input: 1, output: 1 },
    });
    const sb = fakeSb();
    await executePersonalTask({ sb: sb as any, userId: "user-1", task });
    expect(sb.updates[0]).toMatchObject({ table: "personal_tasks", patch: { status: "running" } });
  });

  it("fails the task and audit run clearly when no provider is configured", async () => {
    gateway.runChat.mockRejectedValue(new ProviderError("no key", 503, false));
    const sb = fakeSb();

    const result = await executePersonalTask({ sb: sb as any, userId: "user-1", task });

    expect(result).toEqual({
      status: "failed",
      error: "AI provider is not configured.",
      runId: "run-1",
    });
    const failed = sb.updates.find(
      (u) => u.table === "personal_tasks" && u.patch["status"] === "failed",
    );
    expect((failed?.patch["result"] as any).error).toBe("AI provider is not configured.");
    const failedRun = sb.updates.find(
      (u) => u.table === "agent_tasks" && u.patch["status"] === "failed",
    );
    expect(failedRun?.patch["error"]).toBe("AI provider is not configured.");
  });

  it("fails rather than fabricating a result when the model returns empty text", async () => {
    gateway.runChat.mockResolvedValue({
      text: "   ",
      toolCalls: [],
      provider: "openai",
      model: "gpt-test",
      usage: { input: 1, output: 0 },
    });
    const sb = fakeSb();

    const result = await executePersonalTask({ sb: sb as any, userId: "user-1", task });

    expect(result.status).toBe("failed");
    expect(
      sb.updates.some((u) => u.table === "personal_tasks" && u.patch["status"] === "completed"),
    ).toBe(false);
    expect(
      sb.updates.some((u) => u.table === "agent_tasks" && u.patch["status"] === "failed"),
    ).toBe(true);
  });

  it("does not run the model when an auditable execution row cannot be created", async () => {
    const sb = fakeSb({ auditRunError: true });

    const result = await executePersonalTask({ sb: sb as any, userId: "user-1", task, agent });

    expect(result).toEqual({ status: "failed", error: "AI service temporarily unavailable." });
    expect(gateway.runChat).not.toHaveBeenCalled();
    expect(toolLayer.executeTool).not.toHaveBeenCalled();
  });

  it("scopes personal-task and audit-run updates to the owning user", async () => {
    gateway.runChat.mockResolvedValue({
      text: "ok",
      toolCalls: [],
      provider: "openai",
      model: "gpt-test",
      usage: { input: 1, output: 1 },
    });
    const sb = fakeSb();
    await executePersonalTask({ sb: sb as any, userId: "user-9", task });
    expect(sb.updates.every((u) => u.filters["user_id"] === "user-9")).toBe(true);
  });
});
