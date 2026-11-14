/**
 * Execution receipts are derived from a persisted task row plus the
 * service-written audit entry. A task row alone is not treated as proof:
 * owners can update their own task ledger, while mission audit inserts are
 * service-role only.
 */

export type ExecutionAuditRow = {
  action?: string | null;
  target_id?: string | null;
  target_type?: string | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
};

export type ExecutionTaskRow = {
  id: string;
  agent_id?: string | null;
  status?: string | null;
  provider?: string | null;
  model?: string | null;
  tokens_in?: number | null;
  tokens_out?: number | null;
  tool_calls?: number | null;
  duration_ms?: number | null;
  output_text?: string | null;
  error?: string | null;
  completed_at?: string | null;
};

export type ExecutionReceipt = {
  version: 1;
  taskId: string;
  agentId: string | null;
  status: string;
  provider: string | null;
  model: string | null;
  tokensIn: number;
  tokensOut: number;
  toolCalls: number;
  durationMs: number | null;
  provesExecution: boolean;
  reason: string;
};

const SUCCESS = new Set(["succeeded", "completed"]);

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function count(value: unknown): number {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Math.floor(numeric);
}

export function buildExecutionReceipt(
  task: ExecutionTaskRow,
  audit?: ExecutionAuditRow | null,
): ExecutionReceipt {
  const provider = text(task.provider);
  const model = text(task.model);
  const status = text(task.status) ?? "unknown";
  const output = text(task.output_text);
  const base: ExecutionReceipt = {
    version: 1,
    taskId: task.id,
    agentId: text(task.agent_id),
    status,
    provider,
    model,
    tokensIn: count(task.tokens_in),
    tokensOut: count(task.tokens_out),
    toolCalls: count(task.tool_calls),
    durationMs: task.duration_ms == null ? null : count(task.duration_ms),
    provesExecution: false,
    reason: "No service-written run result matches this task.",
  };

  if (!SUCCESS.has(status)) {
    return {
      ...base,
      reason: output
        ? "The task is not in a successful terminal state."
        : "The task has no successful deliverable.",
    };
  }
  if (!output) return { ...base, reason: "The task has no persisted deliverable." };
  if (!provider || !model)
    return {
      ...base,
      reason: "The task record is missing the provider or model that produced it.",
    };
  if (!audit) return { ...base, reason: "No matching audit receipt is in the loaded history." };

  const auditProvider = text(audit.metadata?.["provider"]);
  const auditModel = text(audit.metadata?.["model"]);
  const sameTask = text(audit.target_id) === task.id && audit.action === "agent.run_result";
  const sameModel = auditProvider === provider && auditModel === model;
  if (!sameTask || !sameModel || audit.status === "failed") {
    return {
      ...base,
      reason: "The loaded audit entry does not match this task, provider and model.",
    };
  }
  return {
    ...base,
    provesExecution: true,
    reason: "Service-written audit matches the persisted provider, model and deliverable.",
  };
}
