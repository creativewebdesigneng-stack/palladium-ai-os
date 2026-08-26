/**
 * Runtime loop wiring for the Atomic-Agent-derived guard: conservative parallel
 * read batching, message ordering, approval transitions, and parity between the
 * streaming and non-streaming loops. All model and tool calls are stubbed.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabase } from "./fake-supabase";

const gateway = vi.hoisted(() => ({ runChat: vi.fn(), streamChat: vi.fn() }));
vi.mock("../model-gateway.server", async () => {
  const actual = await vi.importActual<any>("../model-gateway.server");
  return { ...actual, runChat: gateway.runChat, streamChat: gateway.streamChat };
});

const toolsMod = vi.hoisted(() => ({ executeTool: vi.fn(), grants: new Map<string, any>() }));
vi.mock("../tools.server", async () => {
  const actual = await vi.importActual<any>("../tools.server");
  return {
    ...actual,
    executeTool: toolsMod.executeTool,
    resolveGrantedTools: vi.fn(async () => ({ defs: [], grants: toolsMod.grants })),
  };
});

const entitlements = vi.hoisted(() => ({
  getEntitlements: vi.fn(),
  recordUsage: vi.fn(async () => {}),
}));
vi.mock("@/lib/platform/entitlements.server", async () => {
  const actual = await vi.importActual<any>("@/lib/platform/entitlements.server");
  return {
    ...actual,
    getEntitlements: entitlements.getEntitlements,
    recordUsage: entitlements.recordUsage,
  };
});

const notifications = vi.hoisted(() => ({
  notify: vi.fn(async () => true),
  notifyUsageThreshold: vi.fn(async () => {}),
}));
vi.mock("@/lib/notifications/notify.server", () => notifications);

vi.mock("@/lib/memory/memory.server", () => ({
  retrieveRelevantMemory: vi.fn(async () => null),
  renderMemoryPrompt: () => "",
  storeMemory: vi.fn(async () => ({})),
  searchMemory: vi.fn(async () => []),
}));
vi.mock("@/lib/platform/audit.server", () => ({ writeAudit: vi.fn(async () => {}) }));
vi.mock("@/lib/devapi/webhooks.server", () => ({ dispatchWebhookEvent: vi.fn(async () => {}) }));

let adminDb: any;
vi.mock("@/integrations/supabase/client.server", () => ({
  get supabaseAdmin() {
    return adminDb;
  },
}));

import { executeRun, prepareRun, streamRun } from "../runtime.server";

const USER = "user-1";
const AGENT = {
  id: "agent-1",
  user_id: USER,
  org_id: null,
  org_id_fk: null,
  name: "Atlas",
  description: null,
  purpose: null,
  personality: null,
  instructions: null,
  system_prompt: null,
  model_provider: "openai",
  model: "gpt-5-mini",
  temperature: 0.3,
  max_tokens: 1024,
  memory_enabled: false,
  allowed_tools: ["web_search", "current_time", "connected_service"],
  requires_approval: false,
  autonomy: "supervised",
  status: "active",
  category: "general",
};

function db() {
  const sb = createFakeSupabase({
    personal_agents: [AGENT],
    agent_tasks: [],
    agent_activities: [],
    personal_memories: [],
    tool_permissions: [],
    tools: [],
    tool_executions: [],
  });
  adminDb = sb;
  return sb as any;
}

function grant(slug: string, requiresApproval = false) {
  return [slug, { slug, requiresApproval, allowedDomains: [], spendCap: null }] as const;
}

function toolResult(calls: Array<{ id: string; name: string; arguments: any }>) {
  return {
    text: "",
    toolCalls: calls,
    usage: { input: 5, output: 5 },
    provider: "openai" as const,
    model: "gpt-5-mini",
  };
}

function finalResult(text = "Done.") {
  return {
    text,
    toolCalls: [],
    usage: { input: 5, output: 5 },
    provider: "openai" as const,
    model: "gpt-5-mini",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  entitlements.getEntitlements.mockResolvedValue({
    planCode: "builder",
    planName: "Builder",
    status: "active",
    limits: { agents: 10, tasks_per_month: 100, seats: 3, storage_mb: 1000 },
    features: [],
    usage: { agents: 1, tasksThisMonth: 1, seats: 1 },
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  });
  toolsMod.grants = new Map([grant("web_search"), grant("current_time")]);
});

/** Records concurrency: how many tool executions overlapped in time. */
function trackingExecutor(delay = 20) {
  let active = 0;
  let peak = 0;
  toolsMod.executeTool.mockImplementation(async (name: string) => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((r) => setTimeout(r, delay));
    active -= 1;
    return { ok: true, output: { tool: name } };
  });
  return () => peak;
}

describe("conservative parallel batching in the non-streaming loop", () => {
  it("runs an all-safe two-read batch concurrently and preserves message order", async () => {
    const sb = db();
    const peak = trackingExecutor();
    gateway.runChat
      .mockResolvedValueOnce(
        toolResult([
          { id: "a", name: "web_search", arguments: { q: "x" } },
          { id: "b", name: "current_time", arguments: {} },
        ]),
      )
      .mockResolvedValueOnce(finalResult());

    const run = await prepareRun({ sb, userId: USER, agentId: "agent-1", input: "go" });
    await executeRun({ sb, userId: USER, run });

    expect(peak()).toBe(2);
    const messages = gateway.runChat.mock.calls[1][0].messages;
    const toolMsgs = messages.filter((m: any) => m.role === "tool");
    expect(toolMsgs.map((m: any) => m.tool_call_id)).toEqual(["a", "b"]);
    expect(toolMsgs.map((m: any) => m.name)).toEqual(["web_search", "current_time"]);
  });

  it("stays sequential when the batch mixes a safe read with a sensitive tool", async () => {
    const sb = db();
    toolsMod.grants = new Map([grant("web_search"), grant("connected_service")]);
    const peak = trackingExecutor();
    gateway.runChat
      .mockResolvedValueOnce(
        toolResult([
          { id: "a", name: "web_search", arguments: { q: "x" } },
          { id: "b", name: "connected_service", arguments: { provider: "github" } },
        ]),
      )
      .mockResolvedValueOnce(finalResult());

    const run = await prepareRun({ sb, userId: USER, agentId: "agent-1", input: "go" });
    await executeRun({ sb, userId: USER, run });
    expect(peak()).toBe(1);
  });

  it("stays sequential when a grant requires approval", async () => {
    const sb = db();
    toolsMod.grants = new Map([grant("web_search"), grant("current_time", true)]);
    const peak = trackingExecutor();
    gateway.runChat
      .mockResolvedValueOnce(
        toolResult([
          { id: "a", name: "web_search", arguments: { q: "x" } },
          { id: "b", name: "current_time", arguments: {} },
        ]),
      )
      .mockResolvedValueOnce(finalResult());

    const run = await prepareRun({ sb, userId: USER, agentId: "agent-1", input: "go" });
    await executeRun({ sb, userId: USER, run });
    expect(peak()).toBe(1);
  });
});

describe("guard behaviour inside the loop", () => {
  it("vetoes a repeated no-progress call without invoking the tool again", async () => {
    const sb = db();
    toolsMod.executeTool.mockResolvedValue({ ok: true, output: { rows: [] } });
    const repeat = () => toolResult([{ id: "a", name: "web_search", arguments: { q: "same" } }]);
    for (let i = 0; i < 5; i += 1) gateway.runChat.mockResolvedValueOnce(repeat());
    gateway.runChat.mockResolvedValue(finalResult());

    const run = await prepareRun({ sb, userId: USER, agentId: "agent-1", input: "go" });
    await executeRun({ sb, userId: USER, run });

    // Five identical rounds, but the fifth is blocked before execution.
    expect(toolsMod.executeTool.mock.calls.length).toBe(4);
    const lastMessages = gateway.runChat.mock.calls.at(-1)![0].messages;
    const toolMsgs = lastMessages.filter((m: any) => m.role === "tool");
    expect(toolMsgs.at(-1).content).toContain("repeated_no_progress_blocked");
    expect(toolMsgs.some((m: any) => m.content.includes("already made this exact"))).toBe(true);
  });

  it("compacts an oversized tool result before feeding it back", async () => {
    const sb = db();
    toolsMod.executeTool.mockResolvedValue({
      ok: true,
      output: { blob: "B".repeat(40_000), tail_error: "PARTIAL_RESULT" },
    });
    gateway.runChat
      .mockResolvedValueOnce(toolResult([{ id: "a", name: "web_search", arguments: { q: "x" } }]))
      .mockResolvedValueOnce(finalResult());

    const run = await prepareRun({ sb, userId: USER, agentId: "agent-1", input: "go" });
    await executeRun({ sb, userId: USER, run });

    const toolMsg = gateway.runChat.mock.calls[1][0].messages.find((m: any) => m.role === "tool");
    expect(toolMsg.content).toContain("PALLADIUM_TRUNCATED");
    expect(toolMsg.content).toContain("PARTIAL_RESULT");
    expect(toolMsg.content.length).toBeLessThan(7_000);
  });

  it("still moves the run to waiting_for_approval when a tool defers", async () => {
    const sb = db();
    toolsMod.executeTool.mockResolvedValue({
      ok: true,
      output: { status: "awaiting_approval", approval_request_id: "req-1" },
    });
    gateway.runChat
      .mockResolvedValueOnce(toolResult([{ id: "a", name: "web_search", arguments: { q: "x" } }]))
      .mockResolvedValueOnce(finalResult());

    const run = await prepareRun({ sb, userId: USER, agentId: "agent-1", input: "go" });
    await executeRun({ sb, userId: USER, run });

    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({ type: "agent.input_required" }),
    );
  });
});

describe("streaming loop parity", () => {
  it("applies the same batching, ordering and compaction", async () => {
    const sb = db();
    const peak = trackingExecutor();
    const script = [
      toolResult([
        { id: "a", name: "web_search", arguments: { q: "x" } },
        { id: "b", name: "current_time", arguments: {} },
      ]),
      finalResult(),
    ];
    let round = 0;
    gateway.streamChat.mockImplementation(async function* () {
      yield { type: "done", result: script[round++] };
    });

    const run = await prepareRun({ sb, userId: USER, agentId: "agent-1", input: "go" });
    const events: any[] = [];
    for await (const event of streamRun({ sb, userId: USER, run })) events.push(event);

    expect(events.some((e) => e.type === "complete")).toBe(true);
    expect(peak()).toBe(2);
    const toolEvents = events.filter((e) => e.type === "tool");
    expect(toolEvents.map((e) => e.name)).toEqual(["web_search", "current_time"]);
  });
});
