import { shortlistAgents, type OrchestratorCandidate } from "@/lib/agents/agent-orchestrator";

export type AssistantAgentMatch = {
  id: string;
  name: string;
  category: string | null;
  purpose: string | null;
  modelProvider: string | null;
  model: string | null;
  tools: string[];
};

const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

/**
 * Read-only assistant discovery over candidates already authorised for the
 * current workspace. Execution remains in Blackstar's existing agent runtime.
 */
export function discoverAssistantAgents(
  goal: string,
  authorisedCandidates: OrchestratorCandidate[],
  limit = 6,
): AssistantAgentMatch[] {
  const boundedGoal = clean(goal, 4000);
  if (!boundedGoal) return [];
  const boundedLimit = Math.min(Math.max(Math.trunc(limit) || 1, 1), 12);
  return shortlistAgents(boundedGoal, authorisedCandidates, boundedLimit).map((candidate) => ({
    id: candidate.id,
    name: candidate.name,
    category: candidate.category ?? null,
    purpose: candidate.purpose ?? null,
    modelProvider: candidate.model_provider ?? null,
    model: candidate.model ?? null,
    tools: (candidate.allowed_tools ?? []).slice(0, 30),
  }));
}

export function assistantAgentDiscoveryContext(goal: string, matches: AssistantAgentMatch[]): string {
  return [
    "BLACKSTAR AUTHORISED AGENT DISCOVERY",
    `Goal: ${clean(goal, 4000)}`,
    `Matches: ${JSON.stringify(matches)}`,
    "These are read-only discovery results from agents already authorised for this workspace. Do not invent additional agents. Discovery does not grant permission to execute an agent or an external action. Any execution must use Blackstar's existing runtime, permissions, approval and audit controls.",
  ].join("\n\n").slice(0, 16000);
}
