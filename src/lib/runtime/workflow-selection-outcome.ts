import type { VerifiedSkillLearningResult } from "@/lib/agents/agent-skill-learning";
import type { VerifiedSkillFailureResult } from "@/lib/agents/agent-skill-confidence";

export type WorkflowSkillFeedback = {
  matched_skills: string[];
  promoted_skills: string[];
  certifications_awarded: string[];
  flagged_skills: string[];
  reduced_skills: string[];
  certifications_expired: string[];
};

export type WorkflowVerificationOutcome = {
  score: number | null;
  passed: boolean | null;
};

const clamp = (value: number) => Math.min(Math.max(value, 0), 1);

function unique(values: unknown, limit = 20): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(
    values
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim().slice(0, 180))
      .filter(Boolean),
  )].slice(0, limit);
}

export function normaliseWorkflowVerificationOutcome(
  value: unknown,
): WorkflowVerificationOutcome {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { score: null, passed: null };
  }
  const row = value as Record<string, unknown>;
  const score = Number(row["score"]);
  return {
    score: Number.isFinite(score) ? clamp(score) : null,
    passed: typeof row["passed"] === "boolean" ? row["passed"] : null,
  };
}

/**
 * Converts already-authoritative skill learning/failure results into a compact
 * workflow outcome snapshot. This is observability only: it cannot grant
 * tools, permissions, connector access, approvals, delegation or skills.
 */
export function buildWorkflowSkillFeedback(args: {
  learning?: VerifiedSkillLearningResult | null;
  failure?: VerifiedSkillFailureResult | null;
}): WorkflowSkillFeedback | null {
  const feedback: WorkflowSkillFeedback = {
    matched_skills: unique(args.learning?.matched_skills),
    promoted_skills: unique(args.learning?.promoted_skills),
    certifications_awarded: unique(args.learning?.certifications_awarded),
    flagged_skills: unique(args.failure?.matched_skills),
    reduced_skills: unique(args.failure?.reduced_skills),
    certifications_expired: unique(args.failure?.certifications_expired),
  };
  return Object.values(feedback).some((items) => items.length > 0) ? feedback : null;
}
