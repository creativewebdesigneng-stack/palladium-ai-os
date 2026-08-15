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

function fakeSb() {
  const updates: Update[] = [];
  return {
    updates,
    from(table: string) {
      const filters: Record<string, unknown> = {};
      const chain: any = {
        update(patch: Record<string, unknown>) {
          updates.push({ table, patch, filters });
          return chain;
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
    });
    expect(gateway.runChat).toHaveBeenCalledTimes(1);
    const completed = sb.updates.find((u) => u.patch["status"] === "completed");
    expect((completed?.patch["result"] as any).summary).toBe("Here is the plan.");
    expect(completed?.filters).toMatchObject({ id: "task-1", user_id: "user-1" });
  });

  it("runs an allowed read-only tool and feeds its output back to the model", async () => {
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

    expect(result).toMatchObject({ status: "completed", toolCalls: 1 });
    expect(toolLayer.executeTool).toHaveBeenCalledWith(
      "connected_service",
      { provider: "github", action: "notifications" },
      expect.objectContaining({ userId: "user-1", agentId: "agent-1", taskId: null }),
      grants,
    );
    expect(gateway.runChat).toHaveBeenCalledTimes(2);
    const secondMessages = gateway.runChat.mock.calls[1]?.[0]?.messages ?? [];
    expect(secondMessages.some((m: any) => m.role === "tool" && m.content.includes("Live item"))).toBe(true);
    const completed = sb.updates.find((u) => u.patch["status"] === "completed");
    expect((completed?.patch["result"] as any).tool_calls).toBe(1);
  });

  it("filters out write-capable and approval-gated tools before the model sees them", async () => {
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
        parameters: { type: "object", properties: {}, required: [] },
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
    expect(exposed.map((d: any) => d.name)).toEqual(["connected_service"]);
    expect(toolLayer.executeTool).not.toHaveBeenCalled();
  });

  it("marks the task running before the provider call", async () => {
    gateway.runChat.mockResolvedValue({
      text: "Done",
      toolCalls: [],
      provider: "openai",
      model: "gpt-test",
      usage: { input: 1, output: 1 },
    });
    const sb = fakeSb();
    await executePersonalTask({ sb: sb as any, userId: "user-1", task });
    expect(sb.updates[0]?.patch).toMatchObject({ status: "running" });
  });

  it("fails the task clearly when no provider is configured", async () => {
    gateway.runChat.mockRejectedValue(new ProviderError("no key", 503, false));
    const sb = fakeSb();

    const result = await executePersonalTask({ sb: sb as any, userId: "user-1", task });

    expect(result).toEqual({ status: "failed", error: "AI provider is not configured." });
    const failed = sb.updates.find((u) => u.patch["status"] === "failed");
    expect((failed?.patch["result"] as any).error).toBe("AI provider is not configured.");
    expect(sb.updates.some((u) => u.patch["status"] === "completed")).toBe(false);
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
    expect(sb.updates.some((u) => u.patch["status"] === "completed")).toBe(false);
  });

  it("scopes every personal-task write to the owning user", async () => {
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
