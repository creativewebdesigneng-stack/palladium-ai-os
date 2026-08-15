import { beforeEach, describe, expect, it, vi } from "vitest";

const gateway = vi.hoisted(() => ({ runChat: vi.fn() }));

vi.mock("@/lib/runtime/model-gateway.server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/runtime/model-gateway.server")>(
    "@/lib/runtime/model-gateway.server",
  );
  return { ...actual, runChat: gateway.runChat };
});

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

describe("personal task execution", () => {
  beforeEach(() => {
    gateway.runChat.mockReset();
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

    const result = await executePersonalTask({
      sb: sb as any,
      userId: "user-1",
      task,
      agent: { id: "agent-1", name: "Ops", model_provider: "openai", model: "gpt-test" },
    });

    expect(result).toMatchObject({ status: "completed", provider: "openai", model: "gpt-test" });
    expect(gateway.runChat).toHaveBeenCalledTimes(1);
    // No canned completion: the stored summary is the model text.
    const completed = sb.updates.find((u) => u.patch["status"] === "completed");
    expect((completed?.patch["result"] as any).summary).toBe("Here is the plan.");
    expect(completed?.filters).toMatchObject({ id: "task-1", user_id: "user-1" });
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

  it("scopes every write to the owning user", async () => {
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
