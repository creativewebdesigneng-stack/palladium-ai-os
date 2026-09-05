import {
  assessGeneralIntelligenceGoal,
  normaliseGeneralIntelligenceGoal,
  renderGeneralIntelligenceControlPrompt,
  type GeneralIntelligenceAssessment,
} from "@/lib/agents/general-intelligence-kernel";
import type { OrchestratorCandidate } from "@/lib/agents/agent-orchestrator";
import type { Agent } from "./runtime.server";

export type RuntimeIntelligenceControl = {
  assessment: GeneralIntelligenceAssessment;
  prompt: string;
};

function runtimeCandidate(agent: Agent): OrchestratorCandidate {
  return {
    id: agent.id,
    name: agent.name,
    category: agent.category,
    purpose: agent.purpose,
    allowed_tools: agent.allowed_tools,
    model_provider: agent.model_provider,
    model: agent.model,
  };
}

/**
 * Applies the bounded General Intelligence Kernel to a concrete first-party
 * agent run. The adapter is deliberately advisory: it can constrain and
 * verify a run, but it cannot manufacture extra agents, permissions or tools.
 */
export function buildRuntimeIntelligenceControl(args: {
  agent: Agent;
  input: string;
}): RuntimeIntelligenceControl {
  const goal = normaliseGeneralIntelligenceGoal({ objective: args.input });
  const forceApproval =
    args.agent.requires_approval === true ||
    args.agent.autonomy === "approval_required" ||
    args.agent.autonomy === "supervised";
  const assessment = assessGeneralIntelligenceGoal({
    goal,
    candidates: [runtimeCandidate(args.agent)],
    forceApproval,
    maxAgents: 1,
  });

  return {
    assessment,
    prompt: [
      renderGeneralIntelligenceControlPrompt(assessment),
      assessment.mode === "delegate" || assessment.mode === "collective"
        ? "Runtime boundary: this execution has one explicitly selected agent. Do not simulate other agents. Complete only work within this agent's granted tools and permissions; surface work that requires broader orchestration for a separate authorised orchestration run."
        : "Runtime boundary: execute only with this selected agent's granted tools and permissions.",
    ].join("\n"),
  };
}
