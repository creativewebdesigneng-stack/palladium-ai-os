import { describe, expect, it, vi } from "vitest";
import {
  applyRunSteering,
  consumeRunSteering,
  createSteeringCursor,
  MAX_STEERING_LENGTH,
  queueRunSteering,
  sanitiseSteeringMessage,
} from "../run-steering.server";

function query(result: unknown) {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    contains: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => result),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return chain;
}

describe("run steering", () => {
  it("sanitises and bounds operator instructions", () => {
    expect(sanitiseSteeringMessage("  change direction  ")).toBe("change direction");
    expect(sanitiseSteeringMessage("x".repeat(MAX_STEERING_LENGTH + 50))).toHaveLength(
      MAX_STEERING_LENGTH,
    );
    expect(sanitiseSteeringMessage(null)).toBe("");
  });

  it("queues steering only for an active owner-scoped run and links through metadata", async () => {
    const taskChain = query({
      data: { id: "task-1", agent_id: "agent-1", org_id: "org-1", status: "running" },
      error: null,
    });
    const activityChain = query({
      data: { id: "steer-1", kind: "operator_steering", message: "focus on refunds" },
      error: null,
    });
    const sb = {
      from: vi.fn((table: string) => (table === "agent_tasks" ? taskChain : activityChain)),
    } as any;

    await queueRunSteering({
      sb,
      userId: "user-1",
      taskId: "task-1",
      message: " focus on refunds ",
    });

    expect(activityChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        agent_id: "agent-1",
        kind: "operator_steering",
        message: "focus on refunds",
        metadata: { task_id: "task-1", source: "operator" },
      }),
    );
    expect(activityChain.insert.mock.calls[0]?.[0]).not.toHaveProperty("task_id");
  });

  it("rejects steering after a run reaches an approval or terminal state", async () => {
    const taskChain = query({
      data: { id: "task-1", agent_id: "agent-1", org_id: null, status: "waiting_for_approval" },
      error: null,
    });
    const sb = { from: vi.fn(() => taskChain) } as any;

    await expect(
      queueRunSteering({ sb, userId: "user-1", taskId: "task-1", message: "do something else" }),
    ).rejects.toThrow("no longer accepting steering");
  });

  it("consumes each steering event once per run cursor", async () => {
    const activities = query({
      data: [
        { id: "a", message: "first", created_at: "2026-08-26T18:00:00Z" },
        { id: "b", message: "second", created_at: "2026-08-26T18:00:01Z" },
      ],
      error: null,
    });
    const sb = { from: vi.fn(() => activities) } as any;
    const cursor = createSteeringCursor();

    const first = await consumeRunSteering({ sb, taskId: "task-1", cursor });
    const second = await consumeRunSteering({ sb, taskId: "task-1", cursor });

    expect(first.map((row) => row.id)).toEqual(["a", "b"]);
    expect(second).toEqual([]);
    expect(activities.contains).toHaveBeenCalledWith("metadata", { task_id: "task-1" });
  });

  it("injects steering as a new operator message without changing prior tool context", async () => {
    const activities = query({
      data: [{ id: "a", message: "prioritise the cheapest verified option", created_at: null }],
      error: null,
    });
    const sb = { from: vi.fn(() => activities) } as any;
    const cursor = createSteeringCursor();
    const messages: any[] = [
      { role: "assistant", content: "checking options" },
      { role: "tool", tool_call_id: "call-1", name: "web_search", content: "{}" },
    ];

    const count = await applyRunSteering({ sb, taskId: "task-1", cursor, messages });

    expect(count).toBe(1);
    expect(messages).toHaveLength(3);
    expect(messages[1]?.role).toBe("tool");
    expect(messages[2]?.role).toBe("user");
    expect(messages[2]?.content).toContain("prioritise the cheapest verified option");
    expect(messages[2]?.content).toContain("do not bypass any approval requirement");
  });

  it("fails closed to no steering when activity lookup fails", async () => {
    const activities = query({ data: null, error: { message: "temporary lookup failure" } });
    const sb = { from: vi.fn(() => activities) } as any;
    const cursor = createSteeringCursor();

    await expect(consumeRunSteering({ sb, taskId: "task-1", cursor })).resolves.toEqual([]);
  });
});
