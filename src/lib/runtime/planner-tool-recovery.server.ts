/**
 * Safe tool-failure recovery for planned PalladiumAI runs.
 *
 * A planned agent may revise its approach immediately after a clearly failed
 * read-only tool call. External writes, approvals, ambiguous dispatches and
 * unknown tools never auto-replan here: those remain under their existing
 * approval/verification/error semantics so Palladium never retries a possibly
 * completed real-world action by accident.
 */
import type { AgentPlan, VerificationDecision } from "@/lib/agents/agent-planner";
import { normaliseVerificationDecision } from "@/lib/agents/agent-planner";
import { SAFE_PARALLEL_READ_TOOLS } from "./atomic-loop-guard.server";
import type { ToolGrant } from "./tools.server";

const SAFE_READS = new Set(SAFE_PARALLEL_READ_TOOLS);

export type PlannedToolRecovery = {
  shouldReplan: boolean;
  decision: VerificationDecision | null;
  reason: string | null;
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

/** True when a failed result could mean an external action was already dispatched. */
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
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
  return `${tool} failed: ${detail}`;
}

/**
 * Automatic replanning is intentionally narrow. Only explicitly known
 * side-effect-free reads with an approval-free grant qualify.
 */
export function classifyPlannedToolFailure(args: {
  plan: unknown;
  tool: string;
  ok: boolean;
  output: unknown;
  grant?: ToolGrant | null | undefined;
}): PlannedToolRecovery {
  const plan = args.plan as AgentPlan;
  if (args.ok) return { shouldReplan: false, decision: null, reason: null };
  if (isApprovalWait(args.output)) return { shouldReplan: false, decision: null, reason: null };
  if (isAmbiguousExternalFailure(args.output)) {
    return { shouldReplan: false, decision: null, reason: "ambiguous_external_failure" };
  }
  if (!SAFE_READS.has(args.tool)) {
    return { shouldReplan: false, decision: null, reason: "tool_not_safe_for_automatic_replan" };
  }
  if (!args.grant || args.grant.requiresApproval !== false) {
    return { shouldReplan: false, decision: null, reason: "tool_not_approval_free" };
  }
  if (plan.replan_count >= plan.max_replans) {
    return { shouldReplan: false, decision: null, reason: "replan_budget_exhausted" };
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
    objective:
      `Find a different safe route to satisfy the objective after this failed ${args.tool} call. ` +
      "Do not repeat the exact failed request unless new information or changed inputs justify it.",
    success_criteria: ["Use new evidence or a materially different safe approach"],
    status: "pending",
    evidence: [reason],
  });

  return {
    shouldReplan: true,
    reason,
    decision: normaliseVerificationDecision({
      passed: false,
      score: 0,
      issues: [reason],
      evidence: [reason],
      next_action: "replan",
      revised_steps: revised,
    }),
  };
}
