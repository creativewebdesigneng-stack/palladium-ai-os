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
  runChatPinned,
  type ChatMessage,
  type ChatResult,
  type Provider,
  type ToolDef,
} from "@/lib/runtime/model-gateway.server";
import { executeTool, resolveGrantedTools, type ToolGrant } from "@/lib/runtime/tools.server";
import { BROWSER_TOOL_DEF } from "@/lib/runtime/tools-core.server";
import {
  executeApprovedPersonalBrowserInteraction,
  PERSONAL_BROWSER_INTERACT,
  PERSONAL_BROWSER_INTERACT_DEF,
} from "./personal-browser-interaction.server";
import {
  pauseForPersonalTaskApproval,
  type PersonalTaskApprovalResumeState,
  type PersonalTaskPendingToolCall,
} from "./personal-task-approval.server";

import { requestsNoTools } from "./request-policy";
import { withPersonalBrowserUrl } from "./personal-browser-context";
import { boundedPersonalToolEvidence } from "./personal-task-evidence";
import {
  MAX_PERSONAL_TOOL_CALLS,
  personalTaskToolRoundLimit,
  shouldPinBlackstarNativeTask,
} from "./personal-task-intelligence-policy";

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
  allowed_providers?: string[] | null;
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
const PERSONAL_SELF_QUEUING_APPROVAL_TOOLS = new Set([
  "connected_service_write",
  "github_write",
  "nango_action",
  "email_draft",
  "email_send",
  "slack_post",
]);

const PERSONAL_SAFE_TOOLS = new Set([
  "current_time",
  "calculator",
  "web_search",
  "web_fetch",
  "memory_search",
  "memory_write",
  "connected_service",
  "connected_service_write",
  "nango_capabilities",
  "nango_action",
  "github_write",
  "email_draft",
  "email_send",
  "slack_post",
  "calendar",
  "file_analysis",
  "data_analysis",
  "database_query",
  "browser",
]);

// Unassigned Mission Control tasks may derive only read-only/research tools
// from the server router. resolveGrantedTools still applies the executable
// registry, catalogue state, plan gates and account-level permission rows.
const UNASSIGNED_PERSONAL_SAFE_TOOLS = new Set([
  "current_time",
  "calculator",
  "web_search",
  "web_fetch",
  "memory_search",
  "connected_service",
  "nango_capabilities",
  "nango_action",
  "file_analysis",
  "data_analysis",
  "database_query",
  "browser",
]);
const DEFAULT_PERSONAL_TASK_AGENT_ID = "personal-task-default";

function systemPrompt(task: PersonalTaskRow, agent: PersonalAgentRow): string {
  const lines = [
    `You are ${agent?.name ?? "a PalladiumAI personal agent"}, working inside PalladiumAI Mission Control.`,
    "Carry out the operator's request using the tools available to you when they improve accuracy.",
    "The browser tool supports read-only navigation and content retrieval: navigate to an allowed public URL, then read or extract its actual content. Read-only does not prohibit navigation. Use browser_interact only when clicking or typing is genuinely necessary; it always pauses for explicit operator approval before anything happens.",
    "Never use browser_interact for checkout, payment, purchases or entering payment credentials. Those actions require the dedicated purchase flow.",
    "Use nango_capabilities before nango_action to discover the connected provider's exact action name and input schema.",
    "nango_action may run verified read-only actions directly. It queues writes, destructive actions, and any action covered by a stricter agent policy for operator approval.",
    "connected_service_write, nango_action, github_write, email_draft, email_send and slack_post only queue approval-gated external actions; a queued result does not mean the external service has changed.",
    "calendar may read connected calendars or queue a proposed event for approval; a proposed event has not been created yet.",
    "Never claim to have bought, booked, sent, posted, changed, clicked, typed into, or otherwise modified an external service unless a tool result proves it happened.",
    "An approval-gated tool pauses the run before execution. Do not claim that action happened while approval is pending.",
    "Use tool results as evidence. Never invent prices, metrics, records, messages, or connected-service data.",
    "For multi-step work, form a concise internal plan, carry out only authorised steps, and check each important result against actual tool evidence before answering. Do not report planned or failed work as completed.",
    "If tools cannot complete a step, report what is verified and what remains blocked rather than guessing. Do not repeat a failed external action automatically.",
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
      "Read-only browser research. Each call uses a fresh browser session. Include the full URL for navigate, read and extract; a prior navigate does not preserve a session. Use browser_interact for approval-gated click/type sequences.",
    parameters: {
      ...def.parameters,
      properties: {
        ...properties,
        action: { type: "string", enum: [...PERSONAL_BROWSER_ACTIONS] },
        url: { type: "string", description: "Full allowed page URL, required for every navigate, read or extract call, including after navigation." },
      },
      allOf: [{ if: { properties: { action: { enum: ["navigate", "read", "extract"] } }, required: ["action"] }, then: { required: ["url"] } }],
    },
  };
}

function safeToolSet(resolved: Awaited<ReturnType<typeof resolveGrantedTools>>): {
  defs: ToolDef[];
  grants: Map<string, ToolGrant>;
} {
  const grants = new Map<string, ToolGrant>();
  for (const [slug, grant] of resolved.grants) {
    if (!PERSONAL_SAFE_TOOLS.has(slug)) continue;
    if (slug === "calendar" && grant.requiresApproval) continue;
    // nango_action is mixed-mode: safe reads can run without approval, while
    // writes classify and queue themselves. Other self-queuing tools are
    // intentionally unavailable unless their grant explicitly requires approval.
    if (
      PERSONAL_SELF_QUEUING_APPROVAL_TOOLS.has(slug) &&
      slug !== "nango_action" &&
      !grant.requiresApproval
    )
      continue;
    grants.set(slug, grant);
  }
  const defs = resolved.defs.filter((def) => grants.has(def.name)).map(restrictBrowserDefinition);
  const browserGrant = grants.get("browser");
  if (browserGrant) {
    // The shared registry prefers browser_task when approval is required.
    // Personal tasks already own a durable approval/resume loop and exclude
    // browser_task, so retain the canonical granted one-step read tool here.
    if (!defs.some((def) => def.name === "browser")) {
      defs.push(restrictBrowserDefinition(BROWSER_TOOL_DEF));
    }
    grants.set(PERSONAL_BROWSER_INTERACT, {
      ...browserGrant,
      slug: PERSONAL_BROWSER_INTERACT,
      requiresApproval: true,
      spendCap: null,
    });
    defs.push(PERSONAL_BROWSER_INTERACT_DEF);
  }
  return { defs, grants };
}

function providerFailure(error: unknown): string {
  return error instanceof ProviderError && error.status === 503
    ? "AI provider is not configured."
    : "AI service temporarily unavailable.";
}

function providerFailureAudit(error: unknown): string {
  if (error instanceof ProviderError) {
    if (error.status === 503 && !error.retryable) return "AI provider is not configured.";
    return `AI provider call failed (status ${error.status}, retryable ${error.retryable ? "yes" : "no"}).`;
  }
  return "AI runtime failed before the task could complete.";
}

export function connectedServiceReadFallbackSpec(task: PersonalTaskRow): {
  provider: "github";
  action: "repositories_list";
  limit: number;
} | null {
  const request = String(task.request ?? "");
  const tools = new Set(task.required_tools ?? []);
  if (!tools.has("connected_service") || !/\bgithub\b/i.test(request)) return null;
  if (!/\b(list|show|get|find)\b[\s\S]{0,80}\b(repositories|repository|repos?)\b/i.test(request))
    return null;
  const numeric = /\b([1-9]|1\d|2[0-5])\b/.exec(request)?.[1];
  const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 };
  const word = /\b(one|two|three|four|five)\b/i.exec(request)?.[1]?.toLowerCase();
  return {
    provider: "github",
    action: "repositories_list",
    limit: numeric ? Number(numeric) : words[word ?? ""] ?? 3,
  };
}

function githubRepositorySummary(output: unknown, limit: number): string | null {
  if (!output || typeof output !== "object" || Array.isArray(output)) return null;
  const result = output as Record<string, any>;
  if (result["error"] || !Array.isArray(result["data"])) return null;
  const repositories = result["data"].slice(0, limit);
  if (!repositories.length) return null;
  const rows = repositories.map((repository: Record<string, unknown>, index: number) => {
    const name = String(repository["full_name"] ?? repository["name"] ?? `Repository ${index + 1}`);
    const url = typeof repository["html_url"] === "string" ? repository["html_url"] : null;
    const updated = typeof repository["updated_at"] === "string" ? repository["updated_at"] : null;
    return `${index + 1}. ${url ? `[${name}](${url})` : name}${updated ? ` — updated ${updated}` : ""}`;
  });
  const transport = result["transport"] === "nango" ? " through Nango" : "";
  return `### Recently updated GitHub repositories\n\n${rows.join("\n")}\n\n_Read-only GitHub data retrieved${transport}; no repository was changed._`;
}

async function rescueConnectedServiceRead(args: {
  sb: Sb;
  userId: string;
  task: PersonalTaskRow;
  agent: PersonalAgentRow;
  runId: string;
  startedMs: number;
  tools: Awaited<ReturnType<typeof resolvePersonalTools>>;
  error: unknown;
}) {
  // A bounded, server-authorised connected-service read does not consume model
  // credits. Keep that deterministic path available both during transient model
  // outages and when the workspace has exhausted its AI-credit allowance.
  if (
    !(args.error instanceof ProviderError) ||
    (!args.error.retryable && args.error.status !== 402)
  )
    return null;
  const spec = connectedServiceReadFallbackSpec(args.task);
  if (!spec || !args.tools.grants.has("connected_service")) return null;
  const execution = await executeTool(
    "connected_service",
    spec,
    {
      userId: args.userId,
      orgId: args.task.org_id ?? null,
      agentId: args.agent?.id ?? DEFAULT_PERSONAL_TASK_AGENT_ID,
      auditAgentId: args.agent?.id ?? null,
      taskId: args.runId,
      sb: args.sb,
      ...(args.agent ? { allowedProviders: args.agent.allowed_providers ?? [] } : {}),
    },
    args.tools.grants,
  );
  if (!execution.ok) return null;
  const summary = githubRepositorySummary(execution.output, spec.limit);
  if (!summary) return null;
  return completePersonalTask({
    sb: args.sb,
    userId: args.userId,
    task: args.task,
    runId: args.runId,
    startedMs: args.startedMs,
    final: {
      text: summary,
      toolCalls: [],
      usage: { input: 0, output: 0 },
      provider: "compatible",
      model: "deterministic-read-fallback",
    },
    usage: { input: 0, output: 0 },
    toolCalls: 1,
    tools: args.tools,
  });
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
  const result = await args.sb
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
  if (result?.error) {
    console.error("[mission] could not finalise personal task audit run", args.runId, result.error);
  }
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
      note: "Use browser_interact for bounded click/type sequences that require explicit approval.",
    },
  };
}

async function resolvePersonalTools(args: {
  sb: Sb;
  userId: string;
  orgId: string | null;
  task: PersonalTaskRow;
  agent: PersonalAgentRow;
}) {
  if (requestsNoTools(args.task.request)) {
    return { defs: [] as ToolDef[], grants: new Map<string, ToolGrant>() };
  }
  const entitlements = await getEntitlements(args.sb as never, args.userId, args.orgId);

  if (args.agent?.id && args.agent.allowed_tools?.length) {
    return safeToolSet(await resolveGrantedTools(args.sb, args.agent, entitlements.planCode));
  }

  const requested = [...new Set(args.task.required_tools ?? [])].filter((slug) =>
    UNASSIGNED_PERSONAL_SAFE_TOOLS.has(slug),
  );
  if (!requested.length) {
    return { defs: [] as ToolDef[], grants: new Map<string, ToolGrant>() };
  }

  const syntheticAgent = {
    id: DEFAULT_PERSONAL_TASK_AGENT_ID,
    allowed_tools: requested,
    requires_approval: false,
  };
  return safeToolSet(await resolveGrantedTools(args.sb, syntheticAgent, entitlements.planCode));
}

function toolMessage(call: PersonalTaskPendingToolCall, output: unknown): ChatMessage {
  return {
    role: "tool",
    tool_call_id: call.id,
    name: call.name,
    content: boundedPersonalToolEvidence(output),
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
  const maxRounds = personalTaskToolRoundLimit(args.task.request, args.task.required_tools ?? []);
  const nativePinned = shouldPinBlackstarNativeTask(args.provider, args.model);
  for (let round = 0; round <= maxRounds; round += 1) {
    // Counters survive approval/resume. Neither another approval nor a larger
    // model request can silently grant an unlimited external-action budget.
    const remainingToolCalls = Math.max(0, MAX_PERSONAL_TOOL_CALLS - toolCalls);
    const toolRoundEnabled = round < maxRounds && remainingToolCalls > 0 && args.tools.defs.length > 0;
    const result = await (nativePinned ? runChatPinned : runChat)({
      provider: args.provider,
      model: args.model,
      messages: args.messages,
      tools: toolRoundEnabled ? args.tools.defs : [],
      temperature: args.agent?.temperature ?? null,
      maxTokens: args.agent?.max_tokens ?? 1200,
      // Qwen3's prompt-only /no_think switch may still leave thinking enabled
      // on Ollama's OpenAI-compatible transport. Honour the explicit request
      // through its supported transport setting, without changing other models.
      ...(args.provider === "compatible" && /^qwen3(?::|-)/i.test(args.model) && /\/no_think\b/i.test(args.task.request)
        ? { reasoningEffort: "none" as const }
        : {}),
    });
    args.usage.input += result.usage.input;
    args.usage.output += result.usage.output;

    // A pinned native request must return the exact bound identity. A proxy
    // misconfiguration or unexpected provider response is not a verified Astra
    // execution, even if the generated text looks plausible.
    if (nativePinned && (result.provider !== args.provider || result.model !== args.model)) {
      throw new ProviderError("The native model returned a different provider/model identity; the run was not verified.", 502, false);
    }

    // The durable conversation survives approval pauses. Resolve the missing
    // URL before persisting the assistant call or queuing its exact approval.
    result.toolCalls = result.toolCalls.map((call) => withPersonalBrowserUrl(
      call, args.messages, args.tools.grants.get("browser")?.allowedDomains ?? [],
    ));

    if (!result.toolCalls.length) {
      return { kind: "final", final: result, usage: args.usage, toolCalls };
    }
    if (!toolRoundEnabled || result.toolCalls.length > remainingToolCalls) {
      throw new ProviderError("The native agent reached its authorised tool budget. No additional external action was executed.", 502, false);
    }

    toolCalls += result.toolCalls.length;
    args.messages.push({ role: "assistant", content: result.text, tool_calls: result.toolCalls });

    const approvalCall = result.toolCalls.find(
      (call) =>
        !PERSONAL_SELF_QUEUING_APPROVAL_TOOLS.has(call.name) &&
        args.tools.grants.get(call.name)?.requiresApproval,
    );
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
                agentId: args.agent?.id ?? DEFAULT_PERSONAL_TASK_AGENT_ID,
                auditAgentId: args.agent?.id ?? null,
                taskId: args.runId,
                sb: args.sb,
                ...(args.agent ? { allowedProviders: args.agent.allowed_providers ?? [] } : {}),
              },
              args.tools.grants,
            );
      args.messages.push(toolMessage(call, execution.output));
    }
  }
  throw new ProviderError(
    "The agent exceeded its bounded tool-round budget without producing an answer.",
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
    task,
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
    const execution = state.pendingCall.name === PERSONAL_BROWSER_INTERACT
      ? await executeApprovedPersonalBrowserInteraction({
          sb: args.sb,
          userId: args.userId,
          orgId: task.org_id ?? null,
          agentId: agent?.id ?? null,
          runId: String(run.id),
          input: state.pendingCall.arguments,
          allowedDomains: grant.allowedDomains,
        })
      : await (async () => {
          const approvedGrants = new Map(tools.grants);
          approvedGrants.set(state.pendingCall.name, { ...grant, requiresApproval: false });
          return executeTool(
            state.pendingCall.name,
            state.pendingCall.arguments,
            {
              userId: args.userId,
              orgId: task.org_id ?? null,
              agentId: agent?.id ?? DEFAULT_PERSONAL_TASK_AGENT_ID,
              auditAgentId: agent?.id ?? null,
              taskId: String(run.id),
              sb: args.sb,
              ...(agent ? { allowedProviders: agent.allowed_providers ?? [] } : {}),
            },
            approvedGrants,
          );
        })();
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
      error: providerFailureAudit(error),
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
  let tools: Awaited<ReturnType<typeof resolvePersonalTools>> | null = null;

  await sb
    .from("personal_tasks")
    .update({ status: "running" })
    .eq("id", task.id)
    .eq("user_id", userId);

  try {
    runId = await createAuditRun({ sb, userId, task, agent, provider, model });
    tools = await resolvePersonalTools({
      sb,
      userId,
      orgId: task.org_id ?? null,
      task,
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
    if (runId && tools) {
      const rescued = await rescueConnectedServiceRead({
        sb,
        userId,
        task,
        agent,
        runId,
        startedMs,
        tools,
        error,
      });
      if (rescued) return rescued;
    }
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
        error: providerFailureAudit(error),
      });
    }
    await writeFailed(sb, userId, task.id, message);
    return { status: "failed", error: message, ...(runId ? { runId } : {}) };
  }
}
