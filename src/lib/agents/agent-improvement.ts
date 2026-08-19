export type AgentImprovementTask = {
  agent_id?: string | null;
  status?: string | null;
  error?: string | null;
  input?: string | null;
  replan_count?: number | null;
  verification_state?: unknown;
  provider?: string | null;
  model?: string | null;
  duration_ms?: number | null;
};

export type AgentFailurePattern = {
  kind: "verification" | "tool" | "timeout" | "replan" | "model" | "execution";
  count: number;
  examples: string[];
};

export type AgentImprovementRecommendation = {
  priority: "high" | "medium" | "low";
  area: "instructions" | "success_criteria" | "tools" | "model" | "planning" | "reliability";
  title: string;
  recommendation: string;
  evidence: string[];
};

export type AgentImprovementReport = {
  runs: number;
  failed_runs: number;
  high_replan_runs: number;
  patterns: AgentFailurePattern[];
  recommendations: AgentImprovementRecommendation[];
};

const TERMINAL = new Set(["succeeded", "completed", "failed", "cancelled"]);
const clean = (value: unknown, max = 500) => typeof value === "string" ? value.trim().slice(0, max) : "";

function verificationIssues(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const row = value as Record<string, unknown>;
  return Array.isArray(row["issues"])
    ? row["issues"].map((item) => clean(item, 400)).filter(Boolean).slice(0, 10)
    : [];
}

function classifyError(error: string): AgentFailurePattern["kind"] {
  const text = error.toLowerCase();
  if (/timeout|time budget|timed out/.test(text)) return "timeout";
  if (/tool|browser|github|api|integration|connection|fetch/.test(text)) return "tool";
  if (/model|provider|rate limit|token|context/.test(text)) return "model";
  if (/verification|threshold|verifier/.test(text)) return "verification";
  return "execution";
}

function pushPattern(
  map: Map<AgentFailurePattern["kind"], AgentFailurePattern>,
  kind: AgentFailurePattern["kind"],
  example?: string,
) {
  const current = map.get(kind) ?? { kind, count: 0, examples: [] };
  current.count += 1;
  if (example && current.examples.length < 4 && !current.examples.includes(example)) current.examples.push(example);
  map.set(kind, current);
}

function recommendation(
  priority: AgentImprovementRecommendation["priority"],
  area: AgentImprovementRecommendation["area"],
  title: string,
  text: string,
  evidence: string[],
): AgentImprovementRecommendation {
  return { priority, area, title, recommendation: text, evidence: evidence.slice(0, 4) };
}

/** Builds operator-facing recommendations from bounded recent execution evidence. */
export function analyseAgentImprovement(tasks: AgentImprovementTask[]): AgentImprovementReport {
  const rows = tasks.filter((task) => TERMINAL.has(String(task.status ?? ""))).slice(0, 50);
  const patterns = new Map<AgentFailurePattern["kind"], AgentFailurePattern>();
  let failedRuns = 0;
  let highReplanRuns = 0;

  for (const task of rows) {
    const status = String(task.status ?? "");
    const error = clean(task.error, 500);
    const issues = verificationIssues(task.verification_state);
    const replans = Math.max(0, Number(task.replan_count ?? 0) || 0);

    if (status === "failed" || status === "cancelled") failedRuns += 1;
    if (replans >= 2) {
      highReplanRuns += 1;
      pushPattern(patterns, "replan", `Required ${replans} re-plans`);
    }
    for (const issue of issues) pushPattern(patterns, "verification", issue);
    if (error) pushPattern(patterns, classifyError(error), error);
  }

  const sortedPatterns = [...patterns.values()].sort((a, b) => b.count - a.count || a.kind.localeCompare(b.kind));
  const recommendations: AgentImprovementRecommendation[] = [];
  const byKind = new Map(sortedPatterns.map((pattern) => [pattern.kind, pattern]));
  const runs = rows.length;

  const verification = byKind.get("verification");
  if (verification && verification.count >= 2) {
    recommendations.push(recommendation(
      verification.count >= 4 ? "high" : "medium",
      "success_criteria",
      "Tighten the agent's verification contract",
      "Add explicit, measurable success criteria covering the recurring verifier failures, and make the required evidence format part of the agent instructions.",
      verification.examples,
    ));
  }

  const replan = byKind.get("replan");
  if (replan && replan.count >= 2) {
    recommendations.push(recommendation(
      replan.count >= 4 ? "high" : "medium",
      "planning",
      "Reduce repeated re-planning",
      "Clarify expected inputs, outputs and decision boundaries in the operating profile so the initial plan is less ambiguous and needs fewer corrective passes.",
      replan.examples,
    ));
  }

  const tool = byKind.get("tool");
  if (tool && tool.count >= 2) {
    recommendations.push(recommendation(
      tool.count >= 4 ? "high" : "medium",
      "tools",
      "Review the agent's tool set and tool instructions",
      "Check that required integrations are granted and healthy, remove irrelevant tools, and add clearer tool-use instructions for the recurring failing action.",
      tool.examples,
    ));
  }

  const model = byKind.get("model");
  if (model && model.count >= 2) {
    recommendations.push(recommendation(
      model.count >= 4 ? "high" : "medium",
      "model",
      "Review model/provider suitability",
      "Test a more capable or more reliable configured model/provider for this agent, especially if failures involve context limits, provider errors or repeated weak outputs.",
      model.examples,
    ));
  }

  const timeout = byKind.get("timeout");
  if (timeout && timeout.count >= 2) {
    recommendations.push(recommendation(
      timeout.count >= 4 ? "high" : "medium",
      "reliability",
      "Shorten or split long-running objectives",
      "Break large objectives into smaller workflow steps, reduce unnecessary tool rounds, or tighten the agent's scope so work completes within runtime budgets.",
      timeout.examples,
    ));
  }

  const failureRate = runs ? failedRuns / runs : 0;
  if (runs >= 5 && failureRate >= 0.4) {
    recommendations.push(recommendation(
      failureRate >= 0.6 ? "high" : "medium",
      "instructions",
      "Rework the agent's core instructions",
      "The recent failure rate is high enough to justify revisiting the role, objective, constraints and expected output format before increasing autonomy.",
      [`${failedRuns}/${runs} recent terminal runs failed or were cancelled`],
    ));
  }

  return {
    runs,
    failed_runs: failedRuns,
    high_replan_runs: highReplanRuns,
    patterns: sortedPatterns.slice(0, 8),
    recommendations: recommendations.slice(0, 8),
  };
}
