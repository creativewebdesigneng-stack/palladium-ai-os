import type {
  AgentSkillCertification,
  AgentSkillEvidence,
  AgentSkillsRegistry,
} from "./agent-skills-registry";

export type AgentSkillCertificationProgressStatus = "verified" | "expired" | "building";

export type AgentSkillCertificationEvidence = {
  kind: "verified_task" | "verified_failure";
  score: number | null;
};

export type AgentSkillCertificationProgress = {
  skill: string;
  certification_name: string;
  status: AgentSkillCertificationProgressStatus;
  verified_tasks: number;
  verifier_failures: number;
  current_success_streak: number;
  recent_average_score: number | null;
  tasks_remaining: number;
  required_tasks: 3;
  required_average_score: 0.9;
  quality_target_met: boolean;
  recent_evidence: AgentSkillCertificationEvidence[];
};

const REQUIRED_TASKS = 3 as const;
const REQUIRED_AVERAGE_SCORE = 0.9 as const;

function key(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function certificationName(skillName: string) {
  return `Blackstar Verified — ${skillName}`;
}

function isBlackstarCertification(
  certification: AgentSkillCertification,
  skillName: string,
) {
  return (
    key(certification.name) === key(certificationName(skillName)) &&
    key(certification.issuer ?? "") === key("Blackstar runtime verifier")
  );
}

function capabilityEvidence(evidence: AgentSkillEvidence[] | undefined) {
  return (evidence ?? []).filter((item): item is AgentSkillEvidence & {
    kind: "verified_task" | "verified_failure";
  } =>
    item.verified &&
    (item.kind === "verified_task" || item.kind === "verified_failure") &&
    typeof item.reference === "string" &&
    item.reference.length > 0,
  );
}

function scoreAverage(evidence: AgentSkillEvidence[]) {
  const scores = evidence
    .map((item) => Number(item.score))
    .filter((score) => Number.isFinite(score));
  if (!scores.length) return null;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

/**
 * Builds an operator-facing view of Blackstar's internal skill certification
 * evidence. This is read-only observability: it never grants a capability,
 * permission, connector, approval, or delegation right.
 */
export function buildAgentSkillCertificationProgress(
  registry: AgentSkillsRegistry | null | undefined,
): AgentSkillCertificationProgress[] {
  if (!registry) return [];

  return registry.skills.map((skill) => {
    const evidence = capabilityEvidence(skill.evidence);
    const verifiedTasks = evidence.filter((item) => item.kind === "verified_task").length;
    const verifierFailures = evidence.filter((item) => item.kind === "verified_failure").length;

    const currentStreak: AgentSkillEvidence[] = [];
    for (let index = evidence.length - 1; index >= 0; index -= 1) {
      const item = evidence[index];
      if (!item) continue;
      if (item.kind === "verified_failure") break;
      currentStreak.unshift(item);
    }

    const recentQualificationWindow = currentStreak.slice(-REQUIRED_TASKS);
    const recentAverageScore = scoreAverage(recentQualificationWindow);
    const qualityTargetMet =
      recentQualificationWindow.length === REQUIRED_TASKS &&
      recentAverageScore !== null &&
      recentAverageScore >= REQUIRED_AVERAGE_SCORE;

    const certifications = [
      ...(skill.certifications ?? []),
      ...(registry.certifications ?? []),
    ].filter((item) => isBlackstarCertification(item, skill.name));
    const status: AgentSkillCertificationProgressStatus = certifications.some((item) => item.status === "verified")
      ? "verified"
      : certifications.some((item) => item.status === "expired")
        ? "expired"
        : "building";

    return {
      skill: skill.name,
      certification_name: certificationName(skill.name),
      status,
      verified_tasks: verifiedTasks,
      verifier_failures: verifierFailures,
      current_success_streak: Math.min(currentStreak.length, REQUIRED_TASKS),
      recent_average_score: recentAverageScore,
      tasks_remaining: status === "verified"
        ? 0
        : Math.max(0, REQUIRED_TASKS - Math.min(currentStreak.length, REQUIRED_TASKS)),
      required_tasks: REQUIRED_TASKS,
      required_average_score: REQUIRED_AVERAGE_SCORE,
      quality_target_met: status === "verified" || qualityTargetMet,
      recent_evidence: evidence.slice(-REQUIRED_TASKS).map((item) => ({
        kind: item.kind,
        score: Number.isFinite(Number(item.score)) ? Number(item.score) : null,
      })),
    };
  });
}
