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

function candidateText(candidate: OrchestratorCandidate): string {
  const profile = candidate.operating_profile ?? {};
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
  ]
    .filter(Boolean)
    .join(" ");
}

/** Deterministic pre-ranking. The model only sees a bounded shortlist. */
export function scoreAgentForGoal(goal: string, candidate: OrchestratorCandidate): number {
  const wanted = tokens(goal);
  const available = tokens(candidateText(candidate));
  let score = 0;
  for (const token of wanted) if (available.has(token)) score += 4;
  const profile = candidate.operating_profile ?? {};
  if (profile.role) score += 3;
  if (profile.objective) score += 2;
  if (profile.skills?.length) score += Math.min(profile.skills.length, 5);
  if (profile.success_criteria?.length) score += 2;
  if (candidate.allowed_tools?.length) score += 1;
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
}): OrchestratorPlan {
  const row = args.value && typeof args.value === "object" && !Array.isArray(args.value)
    ? (args.value as Record<string, unknown>)
    : {};
  const allowedAgents = new Set(args.candidates.map((candidate) => candidate.id));
  const assignments = Array.isArray(row["assignments"])
    ? row["assignments"]
        .map((item, index) => normaliseAssignment(item, index, allowedAgents))
        .filter((item): item is OrchestratorAssignment => Boolean(item))
        .slice(0, 12)
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
        requires_approval: false,
      },
    ],
  };
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
      ].join("\n");
    })
    .join("\n\n");
}
