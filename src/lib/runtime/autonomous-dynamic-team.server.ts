import {
  buildDynamicTeamCandidates,
  formDynamicAgentTeam,
  type DynamicTeamPlan,
  type TeamAgentCandidate,
} from "@/lib/ai-hub/dynamic-teams";

type Sb = { from: (table: string) => any };

export function capabilityHintsFromObjective(objective: string, catalogue: string[]) {
  const haystack = objective.toLowerCase();
  return [...new Set(catalogue.filter((capability) => {
    const needle = capability.trim().toLowerCase();
    return needle.length >= 3 && haystack.includes(needle);
  }))];
}

export function selectFallbackAutonomousTeam(
  candidates: TeamAgentCandidate[],
  args: { missionId: string; objective: string; maxTeamSize: number },
): DynamicTeamPlan {
  const catalogue = [...new Set(candidates.flatMap((candidate) => candidate.capabilities))];
  const required = capabilityHintsFromObjective(args.objective, catalogue);
  if (required.length > 0) {
    return formDynamicAgentTeam(candidates, {
      missionId: args.missionId,
      requiredCapabilities: required,
      maxTeamSize: args.maxTeamSize,
      minTrustScore: 0.5,
      maxActiveWorkloads: 8,
    });
  }

  const selected = candidates
    .filter((candidate) => candidate.available)
    .sort((a, b) => {
      if (b.trustScore !== a.trustScore) return b.trustScore - a.trustScore;
      return a.agentId.localeCompare(b.agentId);
    })
    .slice(0, Math.max(1, Math.min(20, args.maxTeamSize)));

  return {
    missionId: args.missionId,
    agentIds: selected.map((candidate) => candidate.agentId),
    capabilityAssignments: {},
    coveredCapabilities: [],
    missingCapabilities: [],
    ready: selected.length > 0,
  };
}

export async function planFallbackAutonomousTeam(
  db: Sb,
  args: { userId: string; missionId: string; objective: string; maxTeamSize: number },
): Promise<DynamicTeamPlan> {
  const { data: agents, error: agentError } = await db
    .from("personal_agents")
    .select("id,allowed_tools,operating_profile")
    .eq("user_id", args.userId)
    .eq("status", "active")
    .limit(100);
  if (agentError) throw new Error(agentError.message);

  const ids = (agents ?? []).map((agent: { id: string }) => agent.id);
  let tasks: Array<{ agent_id: string; status?: string | null }> = [];
  if (ids.length) {
    const result = await db
      .from("agent_tasks")
      .select("agent_id,status")
      .eq("user_id", args.userId)
      .in("agent_id", ids)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (result.error) throw new Error(result.error.message);
    tasks = result.data ?? [];
  }

  return selectFallbackAutonomousTeam(
    buildDynamicTeamCandidates(agents ?? [], tasks),
    {
      missionId: args.missionId,
      objective: args.objective,
      maxTeamSize: args.maxTeamSize,
    },
  );
}
