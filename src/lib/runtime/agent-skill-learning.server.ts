import { buildVerifiedExperienceLearning } from "@/lib/agents/agent-learning";
import {
  effectiveAgentSkillsRegistry,
  type AgentSkillsRegistry,
} from "@/lib/agents/agent-skills-registry";
import { applyVerifiedSkillLearning } from "@/lib/agents/agent-skill-learning";
import {
  compileAgentSystemPrompt,
  normaliseOperatingProfile,
  type AgentOperatingProfile,
} from "@/lib/agents/agent-spec";
import type { AgentPlan, VerificationDecision } from "@/lib/agents/agent-planner";

type Sb = { from: (t: string) => any };

type AgentRow = {
  id: string;
  name?: string | null;
  user_id?: string | null;
  memory_enabled?: boolean | null;
  operating_profile?: AgentOperatingProfile | null;
  allowed_tools?: string[] | null;
  model_provider?: string | null;
  model?: string | null;
  system_prompt?: string | null;
  updated_at?: string | null;
};

async function loadAgent(sb: Sb, agentId: string): Promise<AgentRow | null> {
  const { data, error } = await sb
    .from("personal_agents")
    .select("id,name,user_id,memory_enabled,operating_profile,allowed_tools,model_provider,model,system_prompt,updated_at")
    .eq("id", agentId)
    .maybeSingle();
  if (error || !data) return null;
  return data as AgentRow;
}

/**
 * Best-effort bridge from verified runtime outcomes into the Universal Skills
 * Registry. It respects memory_enabled as the operator's durable-learning
 * control and uses optimistic concurrency so simultaneous tasks do not silently
 * overwrite one another.
 */
export async function captureVerifiedAgentSkillLearning(args: {
  sb: Sb;
  userId: string;
  taskId: string;
}) {
  try {
    const { data: task, error: taskError } = await args.sb
      .from("agent_tasks")
      .select("id,agent_id,input,output_text,planner_state,verification_state,status")
      .eq("id", args.taskId)
      .maybeSingle();
    if (taskError || !task || !["succeeded", "completed"].includes(String(task.status))) return null;
    if (!task.planner_state || !task.verification_state) return null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const agent = await loadAgent(args.sb, String(task.agent_id));
      if (!agent || agent.memory_enabled === false) return null;

      const learning = buildVerifiedExperienceLearning({
        agentName: String(agent.name ?? "Agent"),
        objective: String(task.input ?? ""),
        outcome: String(task.output_text ?? ""),
        plan: task.planner_state as AgentPlan,
        verification: task.verification_state as VerificationDecision,
      });
      if (!learning) return null;

      const profile = agent.operating_profile ?? {};
      const registry = effectiveAgentSkillsRegistry({
        registry: profile.skills_registry,
        legacySkills: profile.skills,
        allowedTools: agent.allowed_tools,
        modelProvider: agent.model_provider,
        model: agent.model,
      });
      if (!registry) return null;

      const result = applyVerifiedSkillLearning({
        registry,
        signal: {
          taskId: args.taskId,
          objective: learning.metadata.objective,
          verifiedOutcome: learning.metadata.verified_outcome,
          verificationScore: learning.metadata.verification_score,
          evidence: learning.metadata.evidence,
          completedSteps: learning.metadata.completed_steps,
        },
      });
      if (!result.changed) return result;

      const nextProfile = normaliseOperatingProfile({
        ...profile,
        skills: result.registry.skills.map((skill) => skill.name),
        skills_registry: result.registry satisfies AgentSkillsRegistry,
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

    console.warn("[agent.skill-learning] concurrent updates prevented registry persistence", {
      taskId: args.taskId,
    });
    return null;
  } catch (error) {
    console.error("[agent.skill-learning] verified skill learning failed", error);
    return null;
  }
}
