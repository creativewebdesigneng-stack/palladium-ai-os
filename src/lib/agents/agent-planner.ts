import type { AgentOperatingProfile } from "./agent-spec";

export type AgentPlanStepStatus = "pending" | "in_progress" | "completed" | "blocked" | "skipped";

export type AgentPlanStep = {
  id: string;
  title: string;
  objective: string;
  success_criteria: string[];
  status: AgentPlanStepStatus;
  evidence: string[];
};

export type AgentPlan = {
  version: 1;
  objective: string;
  assumptions: string[];
  steps: AgentPlanStep[];
  current_step_id: string | null;
  replan_count: number;
  max_replans: number;
  verification_required: boolean;
  quality_threshold: number;
};

export type VerificationDecision = {
  passed: boolean;
  score: number;
  issues: string[];
  evidence: string[];
  next_action: "complete" | "replan" | "escalate";
  revised_steps: AgentPlanStep[];
};

export type ObservationAssessment = {
  blocked: boolean;
  approvalPending: boolean;
  reason: string | null;
};

const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const cleanList = (value: unknown, limit: number, max: number): string[] =>
  Array.isArray(value)
    ? value.map((item) => clean(item, max)).filter(Boolean).slice(0, limit)
    : [];

function clamp(value: unknown, fallback: number, min: number, max: number) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(Math.max(number, min), max) : fallback;
}

function normaliseStep(value: unknown, index: number): AgentPlanStep | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const title = clean(row["title"], 180);
  const objective = clean(row["objective"], 800) || title;
  if (!title || !objective) return null;
  const rawStatus = clean(row["status"], 32);
  const status: AgentPlanStepStatus = ["pending", "in_progress", "completed", "blocked", "skipped"].includes(rawStatus)
    ? (rawStatus as AgentPlanStepStatus)
    : "pending";
  return {
    id: clean(row["id"], 80) || `step-${index + 1}`,
    title,
    objective,
    success_criteria: cleanList(row["success_criteria"], 12, 500),
    status,
    evidence: cleanList(row["evidence"], 20, 1000),
  };
}

export function createInitialPlan(args: {
  objective: string;
  profile?: AgentOperatingProfile | null;
  proposedSteps?: unknown;
  assumptions?: unknown;
}): AgentPlan {
  const objective = clean(args.objective, 12_000);
  const profile = args.profile ?? {};
  const proposed = Array.isArray(args.proposedSteps)
    ? args.proposedSteps.map(normaliseStep).filter((step): step is AgentPlanStep => Boolean(step)).slice(0, 20)
    : [];
  const steps = proposed.length
    ? proposed
    : [
        {
          id: "step-1",
          title: "Complete the requested objective",
          objective,
          success_criteria: profile.success_criteria?.slice(0, 12) ?? [],
          status: "pending" as const,
          evidence: [],
        },
      ];
  return {
    version: 1,
    objective,
    assumptions: cleanList(args.assumptions, 20, 600),
    steps,
    current_step_id: steps[0]?.id ?? null,
    replan_count: 0,
    max_replans: Math.round(clamp(profile.max_replans, 3, 0, 10)),
    verification_required: profile.verification_required !== false,
    quality_threshold: clamp(profile.quality_threshold, 0.8, 0, 1),
  };
}

/**
 * Classifies only explicit runtime failure signals. Approval waits are kept
 * separate so adaptive replanning can never route around operator approval.
 */
export function assessToolObservation(args: { ok: boolean; output: unknown }): ObservationAssessment {
  const row = args.output && typeof args.output === "object" && !Array.isArray(args.output)
    ? (args.output as Record<string, unknown>)
    : null;
  const approvalPending = Boolean(
    row &&
      (row["approval_request_id"] ||
        row["status"] === "awaiting_approval" ||
        row["status"] === "pending_approval" ||
        row["requires_approval"] === true),
  );
  if (approvalPending) return { blocked: false, approvalPending: true, reason: null };

  const error = clean(row?.["error"], 600);
  const message = clean(row?.["message"], 600);
  if (error === "repeated_no_progress_blocked") {
    return {
      blocked: true,
      approvalPending: false,
      reason: message || "The current approach repeated without making progress.",
    };
  }
  if (!args.ok) {
    return {
      blocked: true,
      approvalPending: false,
      reason: error || message || "A required tool call failed.",
    };
  }
  if (error) {
    return { blocked: true, approvalPending: false, reason: error };
  }
  if (row?.["status"] === "failed" || row?.["status"] === "error") {
    return {
      blocked: true,
      approvalPending: false,
      reason: message || `Tool returned status ${String(row["status"])}.`,
    };
  }
  return { blocked: false, approvalPending: false, reason: null };
}

export function shouldReplanAfterObservation(plan: AgentPlan, assessment: ObservationAssessment): boolean {
  return (
    assessment.blocked &&
    !assessment.approvalPending &&
    Boolean(plan.current_step_id) &&
    plan.replan_count < plan.max_replans
  );
}

export function updatePlanAfterObservation(
  plan: AgentPlan,
  args: { stepId: string; evidence?: unknown; completed?: boolean; blocked?: boolean },
): AgentPlan {
  const evidence = cleanList(args.evidence, 20, 1000);
  const steps = plan.steps.map((step) => {
    if (step.id !== args.stepId) return step;
    const status: AgentPlanStepStatus = args.blocked
      ? "blocked"
      : args.completed
        ? "completed"
        : "in_progress";
    return { ...step, status, evidence: [...step.evidence, ...evidence].slice(-20) };
  });
  const next = steps.find((step) => step.status === "pending" || step.status === "in_progress");
  return { ...plan, steps, current_step_id: next?.id ?? null };
}

export function applyReplan(plan: AgentPlan, decision: VerificationDecision): AgentPlan {
  if (decision.next_action !== "replan" || plan.replan_count >= plan.max_replans) return plan;
  const revised = decision.revised_steps.length ? decision.revised_steps : plan.steps;
  const next = revised.find((step) => step.status === "pending" || step.status === "in_progress");
  return {
    ...plan,
    steps: revised,
    current_step_id: next?.id ?? null,
    replan_count: plan.replan_count + 1,
  };
}

export function normaliseVerificationDecision(value: unknown): VerificationDecision {
  const row = value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
  const nextRaw = clean(row["next_action"], 32);
  const next_action: VerificationDecision["next_action"] = ["complete", "replan", "escalate"].includes(nextRaw)
    ? (nextRaw as VerificationDecision["next_action"])
    : row["passed"] === true
      ? "complete"
      : "replan";
  const revised_steps = Array.isArray(row["revised_steps"])
    ? row["revised_steps"]
        .map(normaliseStep)
        .filter((step): step is AgentPlanStep => Boolean(step))
        .slice(0, 20)
    : [];
  return {
    passed: row["passed"] === true,
    score: clamp(row["score"], 0, 0, 1),
    issues: cleanList(row["issues"], 20, 600),
    evidence: cleanList(row["evidence"], 30, 1000),
    next_action,
    revised_steps,
  };
}

export function shouldComplete(plan: AgentPlan, decision: VerificationDecision): boolean {
  if (!plan.verification_required) return true;
  return decision.passed && decision.score >= plan.quality_threshold;
}

export function shouldReplan(plan: AgentPlan, decision: VerificationDecision): boolean {
  return (
    plan.verification_required &&
    !shouldComplete(plan, decision) &&
    decision.next_action === "replan" &&
    plan.replan_count < plan.max_replans
  );
}

export function renderPlannerPrompt(plan: AgentPlan): string {
  const steps = plan.steps
    .map(
      (step, index) =>
        `${index + 1}. [${step.status}] ${step.title}\n   Objective: ${step.objective}${step.success_criteria.length ? `\n   Success: ${step.success_criteria.join(" | ")}` : ""}`,
    )
    .join("\n");
  return [
    "PALLADIUM EXECUTION PLAN",
    `Objective: ${plan.objective}`,
    plan.assumptions.length ? `Assumptions: ${plan.assumptions.join(" | ")}` : "Assumptions: none recorded",
    `Re-plans: ${plan.replan_count}/${plan.max_replans}`,
    `Verification: ${plan.verification_required ? "required" : "optional"} at ${Math.round(plan.quality_threshold * 100)}% quality threshold`,
    "Steps:",
    steps,
    "Execution rule: work through the plan, use tool results as evidence, revise when evidence invalidates assumptions, and do not claim completion before the verification contract is met.",
  ].join("\n");
}
