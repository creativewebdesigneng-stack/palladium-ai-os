/**
 * Integration coverage for mid-run operator steering. These tests prove steering
 * is observed only on the next safe model turn after the current tool round, in
 * both non-streaming and streaming runtimes.
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

function toolResult() {
  return {
    text: "I will check the current data.",
    toolCalls: [{ id: "call-1", name: "web_search", arguments: { q: "original plan" } }],
    usage: { input: 5, output: 5 },
    provider: "openai" as const,
    model: "gpt-5-mini",
  };
}

function finalResult() {
  return {
    text: "Steered result.",
    toolCalls: [],
    usage: { input: 5, output: 5 },
    provider: "openai" as const,
    model: "gpt-5-mini",
  };
}

function snapshot(messages: any[]) {
  return messages.map((message) => ({ ...message }));
}

function steeringText(messages: any[]) {
  return messages
    .filter((message) => message.role === "user")
    .map((message) => String(message.content ?? ""))
    .find((content) => content.includes("OPERATOR STEERING"));
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
  it("injects steering into the next non-streaming model turn, not the in-flight tool turn", async () => {
    const sb = db();
    const modelTurns: any[][] = [];
    let round = 0;

    gateway.runChat.mockImplementation(async (args: any) => {
      modelTurns.push(snapshot(args.messages));
      return round++ === 0 ? toolResult() : finalResult();
    });
    toolsMod.executeTool.mockImplementation(async (_name: string, _input: unknown, ctx: any) => {
      await ctx.sb.from("agent_activities").insert({
        user_id: USER,
        agent_id: "agent-1",
        kind: "operator_steering",
        message: "Stop broad research and focus only on verified UK suppliers.",
        metadata: { task_id: ctx.taskId, source: "operator" },
      });
      return { ok: true, output: { results: [] } };
    });

    const run = await prepareRun({ sb, userId: USER, agentId: "agent-1", input: "research suppliers" });
    await executeRun({ sb, userId: USER, run });

    expect(modelTurns).toHaveLength(2);
    expect(steeringText(modelTurns[0]!)).toBeUndefined();
    const steering = steeringText(modelTurns[1]!);
    expect(steering).toContain("verified UK suppliers");
    expect(steering).toContain("do not bypass any approval requirement");
    expect(toolsMod.executeTool).toHaveBeenCalledTimes(1);
  });

  it("applies the same next-turn steering checkpoint in the streaming loop", async () => {
    const sb = db();
    const modelTurns: any[][] = [];
    let round = 0;

    gateway.streamChat.mockImplementation(async function* (args: any) {
      modelTurns.push(snapshot(args.messages));
      yield { type: "done", result: round++ === 0 ? toolResult() : finalResult() };
    });
    toolsMod.executeTool.mockImplementation(async (_name: string, _input: unknown, ctx: any) => {
      await ctx.sb.from("agent_activities").insert({
        user_id: USER,
        agent_id: "agent-1",
        kind: "operator_steering",
        message: "Switch the comparison to total delivered price only.",
        metadata: { task_id: ctx.taskId, source: "operator" },
      });
      return { ok: true, output: { results: [] } };
    });

    const run = await prepareRun({ sb, userId: USER, agentId: "agent-1", input: "compare suppliers" });
    const events: any[] = [];
    for await (const event of streamRun({ sb, userId: USER, run })) events.push(event);

    expect(modelTurns).toHaveLength(2);
    expect(steeringText(modelTurns[0]!)).toBeUndefined();
    expect(steeringText(modelTurns[1]!)).toContain("total delivered price only");
    expect(events.some((event) => event.type === "complete")).toBe(true);
    expect(toolsMod.executeTool).toHaveBeenCalledTimes(1);
  });
});
