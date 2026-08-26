/**
 * End-to-end runtime steering tests. Steering is inserted while a tool is in
 * flight, then must become visible only at the next model checkpoint.
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

vi.mock("@/lib/notifications/notify.server", () => ({
  notify: vi.fn(async () => true),
  notifyUsageThreshold: vi.fn(async () => {}),
}));
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
  allowed_tools: ["web_search"],
  allowed_providers: [],
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

function toolTurn() {
  return {
    text: "",
    toolCalls: [{ id: "call-1", name: "web_search", arguments: { q: "original plan" } }],
    usage: { input: 5, output: 5 },
    provider: "openai" as const,
    model: "gpt-5-mini",
  };
}

function finalTurn(text = "Redirected and complete.") {
  return {
    text,
    toolCalls: [],
    usage: { input: 5, output: 5 },
    provider: "openai" as const,
    model: "gpt-5-mini",
  };
}

function steeringMessage(messages: any[]) {
  return messages.find(
    (message) =>
      message.role === "user" && String(message.content).includes("OPERATOR STEERING"),
  );
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
  toolsMod.grants = new Map([
    ["web_search", { slug: "web_search", requiresApproval: false, allowedDomains: [], spendCap: null }],
  ]);
});

describe("mid-run steering checkpoints", () => {
  it("non-streaming: accepts steering during a tool but applies it only on the next model turn", async () => {
    const sb = db();
    gateway.runChat.mockResolvedValueOnce(toolTurn()).mockResolvedValueOnce(finalTurn());

    const run = await prepareRun({ sb, userId: USER, agentId: AGENT.id, input: "research suppliers" });
    let toolWasStillInFlight = false;
    toolsMod.executeTool.mockImplementationOnce(async () => {
      sb.tables.agent_activities.push({
        id: "steer-1",
        user_id: USER,
        agent_id: AGENT.id,
        kind: "operator_steering",
        message: "Stop supplier research and focus on Shopify inventory instead.",
        metadata: { task_id: run.taskId, source: "operator" },
        created_at: "2026-08-26T20:00:00Z",
      });
      toolWasStillInFlight = gateway.runChat.mock.calls.length === 1;
      expect(steeringMessage(gateway.runChat.mock.calls[0]![0].messages)).toBeUndefined();
      return { ok: true, output: { results: ["supplier-a"] } };
    });

    await executeRun({ sb, userId: USER, run });

    expect(toolWasStillInFlight).toBe(true);
    expect(gateway.runChat).toHaveBeenCalledTimes(2);
    const secondMessages = gateway.runChat.mock.calls[1]![0].messages;
    const steering = steeringMessage(secondMessages);
    expect(steering?.content).toContain("focus on Shopify inventory instead");
    expect(steering?.content).toContain("do not bypass any approval requirement");
    expect(secondMessages.filter((m: any) => String(m.content).includes("OPERATOR STEERING"))).toHaveLength(1);
  });

  it("streaming: injects the same steering on the next streamed model round", async () => {
    const sb = db();
    const script = [toolTurn(), finalTurn("Streaming redirected.")];
    let round = 0;
    gateway.streamChat.mockImplementation(async function* (args: any) {
      const current = round++;
      if (current === 1) {
        const steering = steeringMessage(args.messages);
        expect(steering?.content).toContain("prioritise inventory reconciliation");
        expect(steering?.content).toContain("do not bypass any approval requirement");
      }
      yield { type: "done", result: script[current] };
    });

    const run = await prepareRun({ sb, userId: USER, agentId: AGENT.id, input: "research suppliers" });
    toolsMod.executeTool.mockImplementationOnce(async () => {
      sb.tables.agent_activities.push({
        id: "steer-stream-1",
        user_id: USER,
        agent_id: AGENT.id,
        kind: "operator_steering",
        message: "Instead, prioritise inventory reconciliation.",
        metadata: { task_id: run.taskId, source: "operator" },
        created_at: "2026-08-26T20:00:01Z",
      });
      expect(gateway.streamChat).toHaveBeenCalledTimes(1);
      return { ok: true, output: { results: [] } };
    });

    const events: any[] = [];
    for await (const event of streamRun({ sb, userId: USER, run })) events.push(event);

    expect(gateway.streamChat).toHaveBeenCalledTimes(2);
    expect(events.some((event) => event.type === "complete")).toBe(true);
  });

  it("does not re-inject the same steering event on later checkpoints", async () => {
    const sb = db();
    gateway.runChat
      .mockResolvedValueOnce(toolTurn())
      .mockResolvedValueOnce(toolTurn())
      .mockResolvedValueOnce(finalTurn());

    const run = await prepareRun({ sb, userId: USER, agentId: AGENT.id, input: "research suppliers" });
    toolsMod.executeTool.mockImplementation(async () => {
      if (!sb.tables.agent_activities.some((row: any) => row.id === "steer-once")) {
        sb.tables.agent_activities.push({
          id: "steer-once",
          user_id: USER,
          agent_id: AGENT.id,
          kind: "operator_steering",
          message: "Use the inventory report.",
          metadata: { task_id: run.taskId, source: "operator" },
          created_at: "2026-08-26T20:00:02Z",
        });
      }
      return { ok: true, output: { ok: true } };
    });

    await executeRun({ sb, userId: USER, run });

    const finalMessages = gateway.runChat.mock.calls[2]![0].messages;
    expect(finalMessages.filter((m: any) => String(m.content).includes("OPERATOR STEERING"))).toHaveLength(1);
  });
});
