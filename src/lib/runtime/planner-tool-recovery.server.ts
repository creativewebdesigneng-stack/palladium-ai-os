/**
 * Safe tool-failure recovery for planned Blackstar runs.
 *
 * Blackstar's self-healing policy is the decision layer over the existing
 * planner recovery path. It never creates a second executor: safe read failures
 * can consume the existing bounded replan budget, while ambiguous writes,
 * approvals and policy failures remain fail-closed under existing semantics.
 */
import type { AgentPlan, VerificationDecision } from "@/lib/agents/agent-planner";
import { normaliseVerificationDecision } from "@/lib/agents/agent-planner";
import { decideRecovery, type HealingDecision } from "@/lib/ai-hub/self-healing";
import { SAFE_PARALLEL_READ_TOOLS } from "./atomic-loop-guard.server";

const SAFE_READS = new Set(SAFE_PARALLEL_READ_TOOLS);

type RecoveryGrant = { requiresApproval: boolean };

export type PlannedToolRecovery = {
  shouldReplan: boolean;
  decision: VerificationDecision | null;
  reason: string | null;
  healing: HealingDecision;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function isApprovalWait(output: unknown): boolean {
  const row = asRecord(output);
  return Boolean(
    row &&
      (row["approval_request_id"] ||
        row["status"] === "awaiting_approval" ||
        row["requires_approval"] === true),
  );
}

export function isAmbiguousExternalFailure(output: unknown): boolean {
  const row = asRecord(output);
  if (!row) return false;
  if (row["ambiguous"] === true) return true;
  if (row["failover_safe"] === false || row["safe_to_failover"] === false) return true;
  const phase = String(row["failure_phase"] ?? row["phase"] ?? "").toLowerCase();
  return ["dispatch", "post_dispatch", "response", "unknown"].includes(phase);
}

function failureReason(tool: string, output: unknown): string {
  const row = asRecord(output);
  const detail = String(
    row?.["message"] ?? row?.["error"] ?? row?.["reason"] ?? "tool returned an unsuccessful result",
  ).replace(/\s+/g, " ").trim().slice(0, 500);
  return `${tool} failed: ${detail}`;
}

const failClosed = (reason: string): HealingDecision => ({
  action: "fail_closed",
  automatic: false,
  reason,
});

export function classifyPlannedToolFailure(args: {
  plan: unknown;
  tool: string;
  ok: boolean;
  output: unknown;
  grant?: RecoveryGrant | null;
}): PlannedToolRecovery {
  const plan = args.plan as AgentPlan;
  if (args.ok) return { shouldReplan: false, decision: null, reason: null, healing: failClosed("no_failure") };
  if (isApprovalWait(args.output)) {
    return { shouldReplan: false, decision: null, reason: null, healing: { action: "pause_for_approval", automatic: false, reason: "existing_approval_wait" } };
  }
  if (isAmbiguousExternalFailure(args.output)) {
    const healing = decideRecovery({ id: `${args.tool}:${plan.current_step_id ?? "unknown"}`, failureClass: "unknown", attempt: plan.replan_count, mutationOccurred: true });
    return { shouldReplan: false, decision: null, reason: "ambiguous_external_failure", healing };
  }
  if (!SAFE_READS.has(args.tool)) {
    return { shouldReplan: false, decision: null, reason: "tool_not_safe_for_automatic_replan", healing: failClosed("tool_not_safe_for_automatic_replan") };
  }
  if (!args.grant || args.grant.requiresApproval !== false) {
    return { shouldReplan: false, decision: null, reason: "tool_not_approval_free", healing: { action: "pause_for_approval", automatic: false, reason: "tool_not_approval_free" } };
  }

  const healing = decideRecovery(
    { id: `${args.tool}:${plan.current_step_id ?? "unknown"}`, failureClass: "transient", attempt: plan.replan_count },
    { maxRetries: plan.max_replans },
  );
  if (healing.action !== "retry") {
    return { shouldReplan: false, decision: null, reason: "replan_budget_exhausted", healing };
  }

  const reason = failureReason(args.tool, args.output);
  const current = plan.current_step_id;
  const revised = plan.steps.map((step) =>
    step.id === current
      ? { ...step, status: "blocked" as const, evidence: [...step.evidence, reason].slice(-20) }
      : step,
  );
  revised.push({
    id: `recovery-${plan.replan_count + 1}`,
    title: `Recover from ${args.tool} failure`,
    objective: `Find a different safe route to satisfy the objective after this failed ${args.tool} call. Do not repeat the exact failed request unless new information or changed inputs justify it.`,
    success_criteria: ["Use new evidence or a materially different safe approach"],
    status: "pending",
    evidence: [reason],
  });

  return {
    shouldReplan: true,
    reason,
    healing,
    decision: normaliseVerificationDecision({ passed: false, score: 0, issues: [reason], evidence: [reason], next_action: "replan", revised_steps: revised }),
  };
}
