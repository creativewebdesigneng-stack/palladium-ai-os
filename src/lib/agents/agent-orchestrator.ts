import {
  performanceSelectionBonus,
  similaritySelectionBonus,
  type AgentPerformanceSnapshot,
  type AgentSimilaritySnapshot,
} from "./agent-performance";
import {
  effectiveAgentSkillsRegistry,
  registrySearchText,
  registrySelectionBonus,
} from "./agent-skills-registry";
import type { AgentOperatingProfile } from "./agent-spec";

export type OrchestratorCandidate = {
  id: string;
  name: string;
  category?: string | null;
  purpose?: string | null;
  allowed_tools?: string[] | null;
  model_provider?: string | null;
  model?: string | null;
  operating_profile?: AgentOperatingProfile | null;
  performance?: AgentPerformanceSnapshot | null;
  similar_performance?: AgentSimilaritySnapshot | null;
  trust_score?: number | null;
};

export type OrchestratorAssignment = {
  id: string;
  title: string;
  objective: string;
  agent_id: string;
  depends_on: string[];
  success_criteria: string[];
  requires_approval: boolean;
};

export type OrchestratorPlan = {
  version: 1;
  goal: string;
  summary: string;
  assignments: OrchestratorAssignment[];
};

const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const cleanList = (value: unknown, limit: number, max: number) =>
  Array.isArray(value) ? value.map((item) => clean(item, max)).filter(Boolean).slice(0, limit) : [];

function tokens(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2),
  );
}

function skillsRegistryForCandidate(candidate: OrchestratorCandidate) {
  const profile = candidate.operating_profile ?? {};
  return effectiveAgentSkillsRegistry({
    registry: profile.skills_registry,
    legacySkills: profile.skills,
    allowedTools: candidate.allowed_tools,
    modelProvider: candidate.model_provider,
    model: candidate.model,
  });
}

function candidateText(candidate: OrchestratorCandidate): string {
  const profile = candidate.operating_profile ?? {};
  const registry = skillsRegistryForCandidate(candidate);
  return [
    candidate.name,
    candidate.category,
    candidate.purpose,
    profile.role,
    profile.objective,
    ...(profile.responsibilities ?? []),
    ...(profile.skills ?? []),
    ...(profile.expected_inputs ?? []),
    ...(profile.expected_outputs ?? []),
    ...(profile.success_criteria ?? []),
    ...(candidate.allowed_tools ?? []),
    registrySearchText(registry),
  ]
    .filter(Boolean)
    .join(" ");
}

function trustSelectionBonus(trustScore: number | null | undefined): number {
  if (trustScore === null || trustScore === undefined || !Number.isFinite(trustScore)) return 0;
  return Math.round(Math.min(Math.max(trustScore, 0), 1) * 4);
}

/**
 * Deterministic pre-ranking. Declared role/skill fit remains primary; verified
 * registry evidence, trust, global history and similar-task history supply only
 * bounded secondary bonuses.
 */
export function scoreAgentForGoal(goal: string, candidate: OrchestratorCandidate): number {
  const wanted = tokens(goal);
  const available = tokens(candidateText(candidate));
  let score = 0;
  for (const token of wanted) if (available.has(token)) score += 4;
  const profile = candidate.operating_profile ?? {};
  const registry = skillsRegistryForCandidate(candidate);
  if (profile.role) score += 3;
  if (profile.objective) score += 2;
  if (profile.skills?.length) score += Math.min(profile.skills.length, 5);
  if (profile.success_criteria?.length) score += 2;
  if (candidate.allowed_tools?.length) score += 1;
  score += registrySelectionBonus(goal, registry);
  score += trustSelectionBonus(candidate.trust_score);
  score += performanceSelectionBonus(candidate.performance);
  score += similaritySelectionBonus(candidate.similar_performance);
  return score;
}

export function shortlistAgents(
  goal: string,
  candidates: OrchestratorCandidate[],
  limit = 12,
): OrchestratorCandidate[] {
  return [...candidates]
    .map((candidate, index) => ({ candidate, index, score: scoreAgentForGoal(goal, candidate) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, Math.min(Math.max(limit, 1), 12))
    .map((item) => item.candidate);
}

function normaliseAssignment(
  value: unknown,
  index: number,
  allowedAgents: Set<string>,
): OrchestratorAssignment | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const agentId = clean(row["agent_id"], 100);
  const title = clean(row["title"], 180);
  const objective = clean(row["objective"], 3000);
  if (!allowedAgents.has(agentId) || !title || !objective) return null;
  return {
    id: clean(row["id"], 80) || `assignment-${index + 1}`,
    title,
    objective,
    agent_id: agentId,
    depends_on: cleanList(row["depends_on"], 12, 80),
    success_criteria: cleanList(row["success_criteria"], 12, 500),
    requires_approval: row["requires_approval"] === true,
  };
}

function assertAcyclic(assignments: OrchestratorAssignment[]) {
  const ids = new Set(assignments.map((assignment) => assignment.id));
  const done = new Set<string>();
  const remaining = [...assignments];
  while (remaining.length) {
    const ready = remaining.filter((assignment) =>
      assignment.depends_on.every((dependency) => done.has(dependency) || !ids.has(dependency)),
    );
    if (!ready.length) throw new Error("The orchestrator produced a circular delegation plan.");
    for (const assignment of ready) {
      done.add(assignment.id);
      remaining.splice(remaining.indexOf(assignment), 1);
    }
  }
}

export function normaliseOrchestratorPlan(args: {
  goal: string;
  value: unknown;
  candidates: OrchestratorCandidate[];
  maxAssignments?: number;
  forceApproval?: boolean;
}): OrchestratorPlan {
  const row = args.value && typeof args.value === "object" && !Array.isArray(args.value)
    ? (args.value as Record<string, unknown>)
    : {};
  const allowedAgents = new Set(args.candidates.map((candidate) => candidate.id));
  const assignmentLimit = Math.min(Math.max(Number(args.maxAssignments ?? 12) || 1, 1), 12);
  const assignments = Array.isArray(row["assignments"])
    ? row["assignments"]
        .map((item, index) => normaliseAssignment(item, index, allowedAgents))
        .filter((item): item is OrchestratorAssignment => Boolean(item))
        .slice(0, assignmentLimit)
    : [];

  const unique: OrchestratorAssignment[] = [];
  const seen = new Set<string>();
  for (const assignment of assignments) {
    if (seen.has(assignment.id)) continue;
    seen.add(assignment.id);
    unique.push(assignment);
  }
  const validIds = new Set(unique.map((assignment) => assignment.id));
  const cleaned = unique.map((assignment) => ({
    ...assignment,
    requires_approval: args.forceApproval === true ? true : assignment.requires_approval,
    depends_on: assignment.depends_on.filter(
      (dependency) => dependency !== assignment.id && validIds.has(dependency),
    ),
  }));
  assertAcyclic(cleaned);

  return {
    version: 1,
    goal: clean(args.goal, 12_000),
    summary: clean(row["summary"], 2000),
    assignments: cleaned,
  };
}

export function fallbackOrchestratorPlan(
  goal: string,
  candidate: OrchestratorCandidate,
  forceApproval = false,
): OrchestratorPlan {
  return {
    version: 1,
    goal: clean(goal, 12_000),
    summary: `Assigned the objective to ${candidate.name}.`,
    assignments: [
      {
        id: "assignment-1",
        title: "Complete objective",
        objective: clean(goal, 3000),
        agent_id: candidate.id,
        depends_on: [],
        success_criteria: candidate.operating_profile?.success_criteria?.slice(0, 12) ?? [],
        requires_approval: forceApproval,
      },
    ],
  };
}

function performanceLine(candidate: OrchestratorCandidate): string | null {
  const performance = candidate.performance;
  if (!performance || performance.runs < 2) return null;
  const verifier = performance.average_verifier_score === null
    ? "n/a"
    : `${Math.round(performance.average_verifier_score * 100)}%`;
  return `Recent performance: ${performance.successes}/${performance.runs} successful; verifier ${verifier}; avg replans ${performance.average_replans.toFixed(1)}`;
}

function similarityLine(candidate: OrchestratorCandidate): string | null {
  const similarity = candidate.similar_performance;
  if (!similarity || similarity.similarity_runs < 2) return null;
  const verifier = similarity.average_verifier_score === null
    ? "n/a"
    : `${Math.round(similarity.average_verifier_score * 100)}%`;
  return `Similar-task evidence: ${similarity.successes}/${similarity.similarity_runs} successful; verifier ${verifier}; match ${Math.round(similarity.average_similarity * 100)}%`;
}

function registryLine(candidate: OrchestratorCandidate): string | null {
  const registry = skillsRegistryForCandidate(candidate);
  if (!registry) return null;
  const skills = registry.skills.slice(0, 12).map((skill) => {
    const verified = (skill.evidence ?? []).some((item) => item.verified) ||
      (skill.certifications ?? []).some((item) => item.status === "verified");
    return `${skill.name}${verified ? " [verified]" : ""}`;
  });
  const parts = [
    skills.length ? `skills ${skills.join(", ")}` : "",
    registry.connectors?.length ? `connectors ${registry.connectors.join(", ")}` : "",
    registry.models?.length ? `models ${registry.models.join(", ")}` : "",
  ].filter(Boolean);
  return parts.length ? `Universal registry: ${parts.join("; ")}` : null;
}

function trustLine(candidate: OrchestratorCandidate): string | null {
  if (candidate.trust_score === null || candidate.trust_score === undefined || !Number.isFinite(candidate.trust_score)) return null;
  return `Trust score: ${Math.round(Math.min(Math.max(candidate.trust_score, 0), 1) * 100)}%`;
}

export function renderCandidateCatalogue(candidates: OrchestratorCandidate[]): string {
  return candidates
    .map((candidate) => {
      const profile = candidate.operating_profile ?? {};
      return [
        `Agent ID: ${candidate.id}`,
        `Name: ${candidate.name}`,
        `Role: ${profile.role ?? candidate.category ?? "specialist"}`,
        `Objective: ${profile.objective ?? candidate.purpose ?? "not specified"}`,
        `Skills: ${(profile.skills ?? []).join(", ") || "not specified"}`,
        `Tools: ${(candidate.allowed_tools ?? []).join(", ") || "none"}`,
        registryLine(candidate),
        trustLine(candidate),
        performanceLine(candidate),
        similarityLine(candidate),
      ].filter(Boolean).join("\n");
    })
    .join("\n\n");
}
