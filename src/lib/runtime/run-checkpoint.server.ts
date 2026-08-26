import type { AgentPlan } from "@/lib/agents/agent-planner";
import type { ChatMessage } from "./model-gateway.server";

export type RunCheckpointPhase = "model_boundary" | "tool_boundary" | "verification_boundary";

export type DurableRunCheckpoint = {
  schema: 1;
  phase: RunCheckpointPhase;
  safe_to_resume: true;
  saved_at: string;
  messages: ChatMessage[];
  plan: AgentPlan;
  tool_rounds: number;
  tool_call_count: number;
  usage: { input: number; output: number };
};

const MAX_MESSAGES = 24;
const MAX_MESSAGE_CHARS = 12_000;

function clampNumber(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function compactMessage(message: ChatMessage): ChatMessage {
  const content = String(message.content ?? "").slice(0, MAX_MESSAGE_CHARS);
  return {
    ...message,
    content,
    ...(Array.isArray(message.tool_calls)
      ? {
          tool_calls: message.tool_calls.slice(0, 12).map((call) => ({
            ...call,
            arguments: call.arguments && typeof call.arguments === "object" ? call.arguments : {},
          })),
        }
      : {}),
  };
}

export function createDurableRunCheckpoint(args: {
  phase: RunCheckpointPhase;
  messages: ChatMessage[];
  plan: AgentPlan;
  toolRounds: number;
  toolCallCount: number;
  usage: { input: number; output: number };
  now?: Date;
}): DurableRunCheckpoint {
  return {
    schema: 1,
    phase: args.phase,
    safe_to_resume: true,
    saved_at: (args.now ?? new Date()).toISOString(),
    messages: args.messages.slice(-MAX_MESSAGES).map(compactMessage),
    plan: args.plan,
    tool_rounds: clampNumber(args.toolRounds),
    tool_call_count: clampNumber(args.toolCallCount),
    usage: {
      input: clampNumber(args.usage.input),
      output: clampNumber(args.usage.output),
    },
  };
}

export function parseDurableRunCheckpoint(value: unknown): DurableRunCheckpoint | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (row["schema"] !== 1 || row["safe_to_resume"] !== true) return null;
  if (!["model_boundary", "tool_boundary", "verification_boundary"].includes(String(row["phase"]))) {
    return null;
  }
  if (!Array.isArray(row["messages"]) || !row["plan"] || typeof row["plan"] !== "object") return null;
  if (!row["usage"] || typeof row["usage"] !== "object") return null;

  const usage = row["usage"] as Record<string, unknown>;
  const input = Number(usage["input"]);
  const output = Number(usage["output"]);
  const toolRounds = Number(row["tool_rounds"]);
  const toolCallCount = Number(row["tool_call_count"]);
  if (![input, output, toolRounds, toolCallCount].every(Number.isFinite)) return null;

  return value as DurableRunCheckpoint;
}

export async function persistDurableRunCheckpoint(args: {
  sb: { from: (table: string) => any };
  taskId: string;
  checkpoint: DurableRunCheckpoint;
}) {
  const { error } = await args.sb
    .from("agent_tasks")
    .update({
      checkpoint_state: args.checkpoint,
      checkpoint_version: args.checkpoint.schema,
      checkpointed_at: args.checkpoint.saved_at,
      heartbeat_at: args.checkpoint.saved_at,
    })
    .eq("id", args.taskId);
  if (error) throw error;
}
