import type { AgentPlan, VerificationDecision } from "./agent-planner";

export type VerifiedExperienceLearning = {
  title: string;
  content: string;
  importance: "medium" | "high";
  metadata: {
    kind: "verified_experience";
    objective: string;
    verified_outcome: string;
    verification_score: number;
    replan_count: number;
    evidence: string[];
    completed_steps: string[];
  };
};

const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const cleanList = (value: unknown, limit: number, max: number) =>
  Array.isArray(value)
    ? value.map((item) => clean(item, max)).filter(Boolean).slice(0, limit)
    : [];

/**
 * Promote only verifier-approved work into durable agent experience memory.
 * This deliberately stores the objective, verified outcome and evidence rather
 * than hidden reasoning or chain-of-thought.
 */
export function buildVerifiedExperienceLearning(args: {
  agentName: string;
  objective: string;
  outcome: string;
  plan: AgentPlan;
  verification: VerificationDecision;
}): VerifiedExperienceLearning | null {
  if (!args.verification.passed || args.verification.next_action !== "complete") return null;
  if (args.verification.score < args.plan.quality_threshold) return null;

  const objective = clean(args.objective, 3000);
  const outcome = clean(args.outcome, 5000);
  if (!objective || !outcome) return null;

  const evidence = cleanList(args.verification.evidence, 10, 700);
  const completedSteps = args.plan.steps
    .filter((step) => step.status === "completed")
    .map((step) => clean(step.title || step.objective, 240))
    .filter(Boolean)
    .slice(0, 10);

  const lines = [
    `Objective: ${objective}`,
    `Verified outcome: ${outcome}`,
    `Verification score: ${Math.round(args.verification.score * 100)}%`,
  ];
  if (completedSteps.length) lines.push(`Successful execution steps: ${completedSteps.join(" | ")}`);
  if (evidence.length) lines.push(`Verification evidence: ${evidence.join(" | ")}`);
  if (args.plan.replan_count > 0) {
    lines.push(`The agent required ${args.plan.replan_count} re-plan(s) before verified completion.`);
  }

  return {
    title: `${clean(args.agentName, 80) || "Agent"} verified experience: ${objective.slice(0, 120)}`,
    content: lines.join("\n"),
    importance: args.verification.score >= 0.9 ? "high" : "medium",
    metadata: {
      kind: "verified_experience",
      objective,
      verified_outcome: outcome,
      verification_score: args.verification.score,
      replan_count: args.plan.replan_count,
      evidence,
      completed_steps: completedSteps,
    },
  };
}
