/**
 * Personal task execution — live model work with the existing read-only tool layer.
 *
 * Each personal task execution is represented by an `agent_tasks` run. That row
 * links back to `personal_tasks.task_id`, giving tool executions and memories a
 * real audit-safe agent-task identity instead of overloading the personal task
 * primary key or leaving the audit association empty.
 */
import { getEntitlements } from "@/lib/platform/entitlements.server";
import {
  normaliseProvider,
  ProviderError,
  resolveModel,
  runChat,
  type ChatMessage,
  type ChatResult,
  type ToolDef,
} from "@/lib/runtime/model-gateway.server";
import { executeTool, resolveGrantedTools, type ToolGrant } from "@/lib/runtime/tools.server";

type Sb = { from: (table: string) => any };

export type PersonalTaskRow = {
  id: string;
  request: string;
  title?: string | null;
  category?: string | null;
  required_tools?: string[] | null;
  agent_id?: string | null;
  org_id?: string | null;
};

export type PersonalAgentRow = {
  id: string;
  name?: string | null;
  category?: string | null;
  personality?: string | null;
  purpose?: string | null;
  instructions?: string | null;
  system_prompt?: string | null;
  model_provider?: string | null;
  model?: string | null;
  temperature?: number | null;
  max_tokens?: number | null;
  allowed_tools?: string[] | null;
  requires_approval?: boolean | null;
} | null;

export type PersonalTaskExecutionResult =
  | {
      status: "completed";
      summary: string;
      provider: string;
      model: string;
      usage: { input: number; output: number };
      toolCalls: number;
      runId: string;
    }
  | { status: "failed"; error: string; runId?: string };

const MAX_TOOL_ROUNDS = 4;

// These tools are read-only or local computation/storage. No external writes,
// purchases, messages, calendar proposals, HTTP POSTs, code execution, or
// browser click/type actions are reachable from the personal-task loop.
const PERSONAL_SAFE_TOOLS = new Set([
  "current_time",
  "calculator",
  "web_search",
  "web_fetch",
  "memory_search",
  "memory_write",
  "connected_service",
  "file_analysis",
  "data_analysis",
  "database_query",
]);

function systemPrompt(task: PersonalTaskRow, agent: PersonalAgentRow): string {
  const lines = [
    `You are ${agent?.name ?? "a PalladiumAI personal agent"}, working inside PalladiumAI Mission Control.`,
    "Carry out the operator's request using the read-only tools available to you when they improve accuracy.",
    "Never claim to have bought, booked, sent, posted, changed, clicked, typed into, or otherwise modified an external service in this run.",
    "If the request needs an external write or purchase, explain exactly what remains to be approved and performed; do not pretend it happened.",
    "Use tool results as evidence. Never invent prices, metrics, records, messages, or connected-service data.",
    "Answer in concise markdown.",
  ];
  if (agent?.purpose) lines.push(`Agent purpose: ${agent.purpose}`);
  if (agent?.personality) lines.push(`Tone: ${agent.personality}`);
  if (agent?.instructions) lines.push(`Operator instructions: ${agent.instructions}`);
  if (agent?.system_prompt) lines.push(agent.system_prompt);
  if (task.category) lines.push(`Task category: ${task.category}`);
  if (task.required_tools?.length)
    lines.push(`Capabilities the router flagged: ${task.required_tools.join(", ")}`);
  return lines.join("\n");
}

function safeToolSet(resolved: Awaited<ReturnType<typeof resolveGrantedTools>>): {
  defs: ToolDef[];
  grants: Map<string, ToolGrant>;
} {
  const grants = new Map<string, ToolGrant>();
  for (const [slug, grant] of resolved.grants) {
    if (PERSONAL_SAFE_TOOLS.has(slug) && !grant.requiresApproval) grants.set(slug, grant);
  }
  return {
    defs: resolved.defs.filter((def) => grants.has(def.name)),
    grants,
  };
}

function providerFailure(error: unknown): string {
  return error instanceof ProviderError && error.status === 503
    ? "AI provider is not configured."
    : "AI service temporarily unavailable.";
}

async function writeFailed(sb: Sb, userId: string, taskId: string, message: string) {
  await sb
    .from("personal_tasks")
    .update({ status: "failed", result: { error: message } })
    .eq("id", taskId)
    .eq("user_id", userId);
}

async function createAuditRun(args: {
  sb: Sb;
  userId: string;
  task: PersonalTaskRow;
  agent: PersonalAgentRow;
  provider: string;
  model: string;
}): Promise<string> {
  const now = new Date().toISOString();
  const { data, error } = await args.sb
    .from("agent_tasks")
    .insert({
      user_id: args.userId,
      org_id: args.task.org_id ?? null,
      agent_id: args.agent?.id ?? null,
      task_id: args.task.id,
      title: args.task.title ?? args.task.request.slice(0, 200),
      input: args.task.request,
      status: "running",
      provider: args.provider,
      model: args.model,
      started_at: now,
      heartbeat_at: now,
    })
    .select("id")
    .maybeSingle();
  if (error || !data?.id) {
    throw new ProviderError("Could not create an auditable agent run.", 500, false);
  }
  return String(data.id);
}

async function finishAuditRun(args: {
  sb: Sb;
  userId: string;
  runId: string;
  startedMs: number;
  status: "succeeded" | "failed";
  usage?: { input: number; output: number };
  toolCalls?: number;
  outputText?: string | null;
  error?: string | null;
}) {
  await args.sb
    .from("agent_tasks")
    .update({
      status: args.status,
      completed_at: new Date().toISOString(),
      duration_ms: Math.max(0, Date.now() - args.startedMs),
      tokens_in: args.usage?.input ?? 0,
      tokens_out: args.usage?.output ?? 0,
      tool_calls: args.toolCalls ?? 0,
      output_text: args.outputText ?? null,
      output: args.outputText ? { summary: args.outputText } : null,
      error: args.error ?? null,
      heartbeat_at: new Date().toISOString(),
    })
    .eq("id", args.runId)
    .eq("user_id", args.userId);
}

/**
 * Runs the personal task through the live model gateway and the same
 * server-authorised tool registry used by professional agents, restricted to a
 * read-only/local subset. Tool permission, catalogue and plan gates are still
 * resolved by resolveGrantedTools; the model never chooses its own grants.
 */
export async function executePersonalTask(args: {
  sb: Sb;
  userId: string;
  task: PersonalTaskRow;
  agent?: PersonalAgentRow;
}): Promise<PersonalTaskExecutionResult> {
  const { sb, userId, task } = args;
  const agent = args.agent ?? null;
  const provider = normaliseProvider(agent?.model_provider ?? null);
  const model = resolveModel(provider, agent?.model ?? null);
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt(task, agent) },
    { role: "user", content: String(task.request ?? "").slice(0, 8000) },
  ];
  const startedMs = Date.now();
  let runId: string | undefined;
  const usage = { input: 0, output: 0 };
  let toolCalls = 0;

  await sb
    .from("personal_tasks")
    .update({ status: "running" })
    .eq("id", task.id)
    .eq("user_id", userId);

  try {
    runId = await createAuditRun({ sb, userId, task, agent, provider, model });

    let tools: { defs: ToolDef[]; grants: Map<string, ToolGrant> } = {
      defs: [],
      grants: new Map(),
    };
    if (agent?.id && agent.allowed_tools?.length) {
      const entitlements = await getEntitlements(sb as never, userId, task.org_id ?? null);
      tools = safeToolSet(await resolveGrantedTools(sb, agent, entitlements.planCode));
    }

    let final: ChatResult | null = null;

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
      const result = await runChat({
        provider,
        model,
        messages,
        tools: round < MAX_TOOL_ROUNDS ? tools.defs : [],
        temperature: agent?.temperature ?? null,
        maxTokens: agent?.max_tokens ?? 1200,
      });
      usage.input += result.usage.input;
      usage.output += result.usage.output;

      if (!result.toolCalls.length) {
        final = result;
        break;
      }

      toolCalls += result.toolCalls.length;
      messages.push({ role: "assistant", content: result.text, tool_calls: result.toolCalls });
      for (const call of result.toolCalls) {
        const execution = await executeTool(
          call.name,
          call.arguments,
          {
            userId,
            orgId: task.org_id ?? null,
            agentId: agent?.id ?? "personal-task",
            taskId: runId,
            sb,
          },
          tools.grants,
        );
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          name: call.name,
          content: JSON.stringify(execution.output).slice(0, 8000),
        });
      }
    }

    if (!final) {
      throw new ProviderError(
        "The agent used too many tool rounds without producing an answer.",
        502,
        true,
      );
    }

    const summary = final.text.trim();
    if (!summary) throw new ProviderError("The model returned an empty response.", 502, true);

    await sb
      .from("personal_tasks")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        result: {
          summary,
          provider: final.provider,
          model: final.model,
          input_tokens: usage.input,
          output_tokens: usage.output,
          tool_calls: toolCalls,
          tools: [...tools.grants.keys()],
          agent_run_id: runId,
        },
      })
      .eq("id", task.id)
      .eq("user_id", userId);

    await finishAuditRun({
      sb,
      userId,
      runId,
      startedMs,
      status: "succeeded",
      usage,
      toolCalls,
      outputText: summary,
    });

    return {
      status: "completed",
      summary,
      provider: final.provider,
      model: final.model,
      usage,
      toolCalls,
      runId,
    };
  } catch (error) {
    const message = providerFailure(error);
    console.error("[mission] personal task execution failed", task.id, error);
    if (runId) {
      await finishAuditRun({
        sb,
        userId,
        runId,
        startedMs,
        status: "failed",
        usage,
        toolCalls,
        error: message,
      });
    }
    await writeFailed(sb, userId, task.id, message);
    return { status: "failed", error: message, ...(runId ? { runId } : {}) };
  }
}
