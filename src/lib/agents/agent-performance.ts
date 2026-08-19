export type AgentPerformanceTask = {
  agent_id?: string | null;
  status?: string | null;
  duration_ms?: number | null;
  replan_count?: number | null;
  verification_state?: unknown;
};

export type AgentPerformanceSnapshot = {
  agent_id: string;
  runs: number;
  successes: number;
  failures: number;
  verified_runs: number;
  success_rate: number;
  average_verifier_score: number | null;
  average_replans: number;
  average_duration_ms: number | null;
  performance_score: number;
};

const clamp = (value: number, min = 0, max = 1) => Math.min(Math.max(value, min), max);

function verificationScore(value: unknown): number | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const score = Number((value as Record<string, unknown>)["score"]);
  return Number.isFinite(score) ? clamp(score) : null;
}

/**
 * Summarises a bounded recent task sample into selection-safe performance data.
 * The score deliberately uses confidence weighting so a single lucky run cannot
 * overpower the Orchestrator's declared skill and role matching.
 */
export function summariseAgentPerformance(
  agentId: string,
  tasks: AgentPerformanceTask[],
): AgentPerformanceSnapshot {
  const rows = tasks.filter((task) => String(task.agent_id ?? "") === agentId).slice(0, 50);
  const terminal = rows.filter((task) =>
    ["succeeded", "completed", "failed", "cancelled"].includes(String(task.status ?? "")),
  );
  const successes = terminal.filter((task) => ["succeeded", "completed"].includes(String(task.status))).length;
  const failures = terminal.length - successes;
  const scores = terminal
    .map((task) => verificationScore(task.verification_state))
    .filter((score): score is number => score !== null);
  const replans = terminal.map((task) => Math.max(0, Number(task.replan_count ?? 0) || 0));
  const durations = terminal
    .map((task) => Number(task.duration_ms))
    .filter((duration) => Number.isFinite(duration) && duration >= 0);

  const runs = terminal.length;
  const successRate = runs ? successes / runs : 0;
  const averageVerifierScore = scores.length
    ? scores.reduce((sum, score) => sum + score, 0) / scores.length
    : null;
  const averageReplans = replans.length
    ? replans.reduce((sum, count) => sum + count, 0) / replans.length
    : 0;
  const averageDurationMs = durations.length
    ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length
    : null;

  // Confidence reaches full weight at 10 terminal runs. Verification quality is
  // the strongest signal, followed by successful completion and re-plan cost.
  const confidence = clamp(runs / 10);
  const quality = averageVerifierScore ?? successRate;
  const replanEfficiency = 1 - clamp(averageReplans / 4);
  const raw = quality * 0.55 + successRate * 0.35 + replanEfficiency * 0.1;
  const performanceScore = clamp(raw * confidence);

  return {
    agent_id: agentId,
    runs,
    successes,
    failures,
    verified_runs: scores.length,
    success_rate: successRate,
    average_verifier_score: averageVerifierScore,
    average_replans: averageReplans,
    average_duration_ms: averageDurationMs,
    performance_score: performanceScore,
  };
}

export function performanceSelectionBonus(snapshot: AgentPerformanceSnapshot | null | undefined): number {
  if (!snapshot || snapshot.runs < 2) return 0;
  return Math.round(clamp(snapshot.performance_score) * 12);
}
