/**
 * Personal task execution — live model work with the existing tool layer.
 *
 * Each personal task execution is represented by one durable `agent_tasks` row.
 * Approval-gated tool calls pause that same row and persist enough conversation
 * state to resume it after the owner decides the approval request.
 */
import { getEntitlements } from "@/lib/platform/entitlements.server";
import {
  normaliseProvider,
  ProviderError,
  resolveModel,
  runChat,
  type ChatMessage,
  type ChatResult,
  type Provider,
  type ToolDef,
} from "@/lib/runtime/model-gateway.server";
import { executeTool, resolveGrantedTools, type ToolGrant } from "@/lib/runtime/tools.server";
import {
  pauseForPersonalTaskApproval,
  type PersonalTaskApprovalResumeState,
  type PersonalTaskPendingToolCall,
} from "./personal-task-approval.server";

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
  | {
      status: "waiting_for_approval";
      approvalRequestId: string;
      toolName: string;
      runId: string;
    }
  | { status: "failed"; error: string; runId?: string };

const MAX_TOOL_ROUNDS = 4;
const PERSONAL_BROWSER_ACTIONS = [
  "navigate",
  "read",
  "extract",
  "scroll",
  "screenshot",
  "back",
  "forward",
  "wait",
] as const;
const PERSONAL_BROWSER_ACTION_SET = new Set<string>(PERSONAL_BROWSER_ACTIONS);

// Personal tasks may only execute this bounded local/read-oriented subset. A
// grant that requires approval is still exposed to the model, but it is paused
// before execution and can only run through resumePersonalTaskApproval().
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
  "browser",
]);

function systemPrompt(task: PersonalTaskRow, agent: PersonalAgentRow): string {
  const lines = [
    `You are ${agent?.name ?? "a PalladiumAI personal agent"}, working inside PalladiumAI Mission Control.`,
    "Carry out the operator's request using the tools available to you when they improve accuracy.",
    "Browser access is research-only: you may navigate, read, extract, scroll, screenshot, go back/forward or wait, but you may not click controls or type into websites.",
    "Never claim to have bought, booked, sent, posted, changed, clicked, typed into, or otherwise modified an external service unless a tool result proves it happened.",
    "An approval-gated tool pauses the run before execution. Do not claim that action happened while approval is pending.",
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

function restrictBrowserDefinition(def: ToolDef): ToolDef {
  if (def.name !== "browser") return def;
  const properties =
    def.parameters["properties"] && typeof def.parameters["properties"] === "object"
      ? (def.parameters["properties"] as Record<string, unknown>)
      : {};
  return {
    ...def,
    description:
      "Read-only browser research: navigate, read, extract, scroll, screenshot, go back/forward or wait. Click and type are not available in personal-task runs.",
    parameters: {
      ...def.parameters,
      properties: {
        ...properties,
        action: { type: "string", enum: [...PERSONAL_BROWSER_ACTIONS] },
      },
    },
  };
}

function safeToolSet(resolved: Awaited<ReturnType<typeof resolveGrantedTools>>): {
  defs: ToolDef[];
  grants: Map<string, ToolGrant>;
} {
  const grants = new Map<string, ToolGrant>();
  for (const [slug, grant] of resolved.grants) {
    if (PERSONAL_SAFE_TOOLS.has(slug)) grants.set(slug, grant);
  }
  return {
    defs: resolved.defs.filter((def) => grants.has(def.name)).map(restrictBrowserDefinition),
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
      waiting_approval_request_id: null,
      approval_resume_state: null,
    })
    .eq("id", args.runId)
    .eq("user_id", args.userId);
}

async function blockedPersonalBrowserCall(args: {
  sb: Sb;
  userId: string;
  orgId: string | null;
  agentId: string | null;
  runId: string;
  action: string;
}) {
  const error = `Browser action "${args.action}" is not permitted in a personal-task run.`;
  await args.sb.from("tool_executions").insert({
    user_id: args.userId,
    org_id: args.orgId,
    agent_id: args.agentId,
    agent_task_id: args.runId,
    tool: "browser",
    input: { action: args.action },
    status: "failed",
    duration_ms: 0,
    error,
  });
  return {
    ok: false,
    output: {
      error,
      note: "Clicking or typing on an external site is not available in the personal-task tool set.",
    },
  };
}

async function resolvePersonalTools(args: {
  sb: Sb;
  userId: string;
  orgId: string | null;
  agent: PersonalAgentRow;
}) {
  if (!args.agent?.id || !args.agent.allowed_tools?.length) {
    return { defs: [] as ToolDef[], grants: new Map<string, ToolGrant>() };
  }
  const entitlements = await getEntitlements(args.sb as never, args.userId, args.orgId);
  return safeToolSet(await resolveGrantedTools(args.sb, args.agent, entitlements.planCode));
}

function toolMessage(call: PersonalTaskPendingToolCall, output: unknown): ChatMessage {
  return {
    role: "tool",
    tool_call_id: call.id,
    name: call.name,
    content: JSON.stringify(output).slice(0, 8000),
  };
}

async function runConversation(args: {
  sb: Sb;
  userId: string;
  task: PersonalTaskRow;
  agent: PersonalAgentRow;
  runId: string;
  provider: Provider;
  model: string;
  messages: ChatMessage[];
  tools: { defs: ToolDef[]; grants: Map<string, ToolGrant> };
  usage: { input: number; output: number };
  toolCalls: number;
}): Promise<
  | { kind: "final"; final: ChatResult; usage: { input: number; output: number }; toolCalls: number }
  | { kind: "paused"; approvalRequestId: string; toolName: string; usage: { input: number; output: number }; toolCalls: number }
> {
  let toolCalls = args.toolCalls;
  for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
    const result = await runChat({
      provider: args.provider,
      model: args.model,
      messages: args.messages,
      tools: round < MAX_TOOL_ROUNDS ? args.tools.defs : [],
      temperature: args.agent?.temperature ?? null,
      maxTokens: args.agent?.max_tokens ?? 1200,
    });
    args.usage.input += result.usage.input;
    args.usage.output += result.usage.output;

    if (!result.toolCalls.length) {
      return { kind: "final", final: result, usage: args.usage, toolCalls };
    }

    toolCalls += result.toolCalls.length;
    args.messages.push({ role: "assistant", content: result.text, tool_calls: result.toolCalls });

    const approvalCall = result.toolCalls.find((call) => args.tools.grants.get(call.name)?.requiresApproval);
    if (approvalCall) {
      const skippedCalls = result.toolCalls
        .filter((call) => call.id !== approvalCall.id)
        .map((call) => ({ id: call.id, name: call.name, arguments: call.arguments }));
      const resumeState: PersonalTaskApprovalResumeState = {
        version: 1,
        provider: args.provider,
        model: args.model,
        messages: args.messages,
        usage: { ...args.usage },
        toolCalls,
        pendingCall: {
          id: approvalCall.id,
          name: approvalCall.name,
          arguments: approvalCall.arguments,
        },
        skippedCalls,
      };
      const pause = await pauseForPersonalTaskApproval({
        sb: args.sb,
        userId: args.userId,
        orgId: args.task.org_id ?? null,
        personalTaskId: args.task.id,
        runId: args.runId,
        agentId: args.agent?.id ?? null,
        agentName: args.agent?.name ?? null,
        call: resumeState.pendingCall,
        resumeState,
      });
      await args.sb
        .from("personal_tasks")
        .update({ status: "awaiting_approval" })
        .eq("id", args.task.id)
        .eq("user_id", args.userId);
      return {
        kind: "paused",
        approvalRequestId: pause.approvalRequestId,
        toolName: pause.toolName,
        usage: args.usage,
        toolCalls,
      };
    }

    for (const call of result.toolCalls) {
      const action = String(call.arguments["action"] ?? "read");
      const execution =
        call.name === "browser" && !PERSONAL_BROWSER_ACTION_SET.has(action)
          ? await blockedPersonalBrowserCall({
              sb: args.sb,
              userId: args.userId,
              orgId: args.task.org_id ?? null,
              agentId: args.agent?.id ?? null,
              runId: args.runId,
              action,
            })
          : await executeTool(
              call.name,
              call.arguments,
              {
                userId: args.userId,
                orgId: args.task.org_id ?? null,
                agentId: args.agent?.id ?? "personal-task",
                taskId: args.runId,
                sb: args.sb,
              },
              args.tools.grants,
            );
      args.messages.push(toolMessage(call, execution.output));
    }
  }
  throw new ProviderError(
    "The agent used too many tool rounds without producing an answer.",
    502,
    true,
  );
}

async function completePersonalTask(args: {
  sb: Sb;
  userId: string;
  task: PersonalTaskRow;
  runId: string;
  startedMs: number;
  final: ChatResult;
  usage: { input: number; output: number };
  toolCalls: number;
  tools: { grants: Map<string, ToolGrant> };
}): Promise<PersonalTaskExecutionResult> {
  const summary = args.final.text.trim();
  if (!summary) throw new ProviderError("The model returned an empty response.", 502, true);

  await args.sb
    .from("personal_tasks")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      result: {
        summary,
        provider: args.final.provider,
        model: args.final.model,
        input_tokens: args.usage.input,
        output_tokens: args.usage.output,
        tool_calls: args.toolCalls,
        tools: [...args.tools.grants.keys()],
        agent_run_id: args.runId,
      },
    })
    .eq("id", args.task.id)
    .eq("user_id", args.userId);

  await finishAuditRun({
    sb: args.sb,
    userId: args.userId,
    runId: args.runId,
    startedMs: args.startedMs,
    status: "succeeded",
    usage: args.usage,
    toolCalls: args.toolCalls,
    outputText: summary,
  });

  return {
    status: "completed",
    summary,
    provider: args.final.provider,
    model: args.final.model,
    usage: args.usage,
    toolCalls: args.toolCalls,
    runId: args.runId,
  };
}

function validResumeState(value: unknown): PersonalTaskApprovalResumeState | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const state = value as Partial<PersonalTaskApprovalResumeState>;
  if (
    state.version !== 1 ||
    typeof state.provider !== "string" ||
    typeof state.model !== "string" ||
    !Array.isArray(state.messages) ||
    !state.usage ||
    typeof state.usage.input !== "number" ||
    typeof state.usage.output !== "number" ||
    typeof state.toolCalls !== "number" ||
    !state.pendingCall ||
    typeof state.pendingCall.id !== "string" ||
    typeof state.pendingCall.name !== "string" ||
    !state.pendingCall.arguments ||
    typeof state.pendingCall.arguments !== "object" ||
    Array.isArray(state.pendingCall.arguments)
  ) return null;
  return state as PersonalTaskApprovalResumeState;
}

/** Resume a previously paused personal-task run after its owner decision. */
export async function resumePersonalTaskApproval(args: {
  sb: Sb;
  userId: string;
  approvalRequestId: string;
  decision: "approved" | "rejected";
  note?: string | null;
}): Promise<PersonalTaskExecutionResult> {
  const { data: run, error: runError } = await args.sb
    .from("agent_tasks")
    .select("*")
    .eq("user_id", args.userId)
    .eq("waiting_approval_request_id", args.approvalRequestId)
    .eq("status", "waiting_for_approval")
    .maybeSingle();
  if (runError || !run) throw new Error(runError?.message ?? "Personal task run is no longer waiting for this approval.");

  const state = validResumeState(run.approval_resume_state);
  if (!state) throw new Error("Personal task approval resume state is missing or invalid.");

  const { data: task, error: taskError } = await args.sb
    .from("personal_tasks")
    .select("*")
    .eq("id", run.task_id)
    .eq("user_id", args.userId)
    .maybeSingle();
  if (taskError || !task) throw new Error(taskError?.message ?? "Personal task not found.");

  const agentRes = task.agent_id
    ? await args.sb
        .from("personal_agents")
        .select("*")
        .eq("id", task.agent_id)
        .eq("user_id", args.userId)
        .maybeSingle()
    : { data: null, error: null };
  const agent = agentRes.data ?? null;
  const tools = await resolvePersonalTools({
    sb: args.sb,
    userId: args.userId,
    orgId: task.org_id ?? null,
    agent,
  });
  const grant = tools.grants.get(state.pendingCall.name);
  if (!grant) throw new Error("The approved tool is no longer enabled for this agent.");

  const { data: claimed, error: claimError } = await args.sb
    .from("agent_tasks")
    .update({ status: "running", heartbeat_at: new Date().toISOString() })
    .eq("id", run.id)
    .eq("user_id", args.userId)
    .eq("status", "waiting_for_approval")
    .eq("waiting_approval_request_id", args.approvalRequestId)
    .select("id")
    .maybeSingle();
  if (claimError || !claimed) throw new Error(claimError?.message ?? "Personal task approval was already resumed.");

  await args.sb
    .from("personal_tasks")
    .update({ status: "running" })
    .eq("id", task.id)
    .eq("user_id", args.userId);

  const messages = [...state.messages];
  if (args.decision === "approved") {
    const approvedGrants = new Map(tools.grants);
    approvedGrants.set(state.pendingCall.name, { ...grant, requiresApproval: false });
    const execution = await executeTool(
      state.pendingCall.name,
      state.pendingCall.arguments,
      {
        userId: args.userId,
        orgId: task.org_id ?? null,
        agentId: agent?.id ?? "personal-task",
        taskId: String(run.id),
        sb: args.sb,
      },
      approvedGrants,
    );
    messages.push(toolMessage(state.pendingCall, execution.output));
  } else {
    messages.push(
      toolMessage(state.pendingCall, {
        error: "The operator rejected this tool action.",
        rejected: true,
        note: args.note?.trim().slice(0, 500) || null,
      }),
    );
  }

  for (const skipped of state.skippedCalls ?? []) {
    messages.push(
      toolMessage(skipped, {
        skipped: true,
        reason: "This parallel tool call was deferred while an approval-gated call was pending. Request it again if still needed.",
      }),
    );
  }

  const usage = { ...state.usage };
  const startedMs = run.started_at ? Date.parse(run.started_at) : Date.now();
  try {
    const outcome = await runConversation({
      sb: args.sb,
      userId: args.userId,
      task,
      agent,
      runId: String(run.id),
      provider: state.provider,
      model: state.model,
      messages,
      tools,
      usage,
      toolCalls: state.toolCalls,
    });
    if (outcome.kind === "paused") {
      return {
        status: "waiting_for_approval",
        approvalRequestId: outcome.approvalRequestId,
        toolName: outcome.toolName,
        runId: String(run.id),
      };
    }
    return await completePersonalTask({
      sb: args.sb,
      userId: args.userId,
      task,
      runId: String(run.id),
      startedMs,
      final: outcome.final,
      usage: outcome.usage,
      toolCalls: outcome.toolCalls,
      tools,
    });
  } catch (error) {
    const message = providerFailure(error);
    console.error("[mission] personal task approval resume failed", run.id, error);
    await finishAuditRun({
      sb: args.sb,
      userId: args.userId,
      runId: String(run.id),
      startedMs,
      status: "failed",
      usage,
      toolCalls: state.toolCalls,
      error: message,
    });
    await writeFailed(args.sb, args.userId, task.id, message);
    return { status: "failed", error: message, runId: String(run.id) };
  }
}

/**
 * Runs a new personal task through the live model gateway and the same
 * server-authorised tool registry used by professional agents, restricted to a
 * bounded personal-task subset.
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
    const tools = await resolvePersonalTools({
      sb,
      userId,
      orgId: task.org_id ?? null,
      agent,
    });
    const outcome = await runConversation({
      sb,
      userId,
      task,
      agent,
      runId,
      provider,
      model,
      messages,
      tools,
      usage,
      toolCalls,
    });
    toolCalls = outcome.toolCalls;

    if (outcome.kind === "paused") {
      return {
        status: "waiting_for_approval",
        approvalRequestId: outcome.approvalRequestId,
        toolName: outcome.toolName,
        runId,
      };
    }

    return await completePersonalTask({
      sb,
      userId,
      task,
      runId,
      startedMs,
      final: outcome.final,
      usage: outcome.usage,
      toolCalls: outcome.toolCalls,
      tools,
    });
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
