import { applyVerifiedSkillFailure } from "@/lib/agents/agent-skill-confidence";
import { effectiveAgentSkillsRegistry } from "@/lib/agents/agent-skills-registry";
import {
  compileAgentSystemPrompt,
  normaliseOperatingProfile,
  type AgentOperatingProfile,
} from "@/lib/agents/agent-spec";
import { normaliseVerificationDecision } from "@/lib/agents/agent-planner";

type Sb = { from: (t: string) => any };

type AgentRow = {
  id: string;
  name?: string | null;
  memory_enabled?: boolean | null;
  operating_profile?: AgentOperatingProfile | null;
  allowed_tools?: string[] | null;
  model_provider?: string | null;
  model?: string | null;
  system_prompt?: string | null;
  updated_at?: string | null;
};

const NON_CAPABILITY_VERIFIER_FAILURES = [
  "verification could not be completed",
  "verifier returned invalid structured output",
];

function isCapabilityVerifierFailure(issues: string[]) {
  if (!issues.length) return false;
  const text = issues.join(" ").toLowerCase();
  return !NON_CAPABILITY_VERIFIER_FAILURES.some((message) => text.includes(message));
}

async function loadAgent(sb: Sb, agentId: string): Promise<AgentRow | null> {
  const { data, error } = await sb
    .from("personal_agents")
    .select("id,name,memory_enabled,operating_profile,allowed_tools,model_provider,model,system_prompt,updated_at")
    .eq("id", agentId)
    .maybeSingle();
  if (error || !data) return null;
  return data as AgentRow;
}

/**
 * Persists only verifier-confirmed capability-quality failures. Callers must
 * gate this to RuntimeError code VERIFICATION_FAILED; this function then
 * independently rejects verifier infrastructure failures and weakly-grounded
 * signals before touching the skills registry.
 */
export async function captureVerifiedAgentSkillFailure(args: {
  sb: Sb;
  userId: string;
  taskId: string;
}) {
  try {
    const { data: task, error: taskError } = await args.sb
      .from("agent_tasks")
      .select("id,agent_id,verification_state,status")
      .eq("id", args.taskId)
      .maybeSingle();
    if (taskError || !task || String(task.status) !== "failed" || !task.verification_state) return null;

    const verification = normaliseVerificationDecision(task.verification_state);
    if (
      verification.passed ||
      verification.score > 0.6 ||
      verification.next_action === "escalate" ||
      !isCapabilityVerifierFailure(verification.issues)
    ) return null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const agent = await loadAgent(args.sb, String(task.agent_id));
      if (!agent || agent.memory_enabled === false) return null;

      const profile = agent.operating_profile ?? {};
      const registry = effectiveAgentSkillsRegistry({
        registry: profile.skills_registry,
        legacySkills: profile.skills,
        allowedTools: agent.allowed_tools,
        modelProvider: agent.model_provider,
        model: agent.model,
      });
      if (!registry) return null;

      const result = applyVerifiedSkillFailure({
        registry,
        signal: {
          taskId: args.taskId,
          verificationScore: verification.score,
          issues: verification.issues,
          evidence: verification.evidence,
        },
      });
      if (!result.changed) return result;

      const nextProfile = normaliseOperatingProfile({
        ...profile,
        skills: result.registry.skills.map((skill) => skill.name),
        skills_registry: result.registry,
      });
      const nextSystemPrompt = compileAgentSystemPrompt(agent.system_prompt, nextProfile).slice(0, 16_000);

      let update = args.sb
        .from("personal_agents")
        .update({
          operating_profile: nextProfile,
          system_prompt: nextSystemPrompt,
          spec_version: 2,
          updated_at: new Date().toISOString(),
        })
        .eq("id", agent.id)
        .eq("user_id", args.userId);
      if (agent.updated_at) update = update.eq("updated_at", agent.updated_at);

      const { data: saved, error: saveError } = await update
        .select("id,updated_at")
        .maybeSingle();
      if (saveError) throw new Error(saveError.message);
      if (saved) return result;
    }

    console.warn("[agent.skill-confidence] concurrent updates prevented persistence", {
      taskId: args.taskId,
    });
    return null;
  } catch (error) {
    console.error("[agent.skill-confidence] verifier failure capture failed", error);
    return null;
  }
}
