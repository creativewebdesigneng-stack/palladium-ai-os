import { buildVerifiedExperienceLearning } from "@/lib/agents/agent-learning";
import { storeMemory } from "@/lib/memory/memory.server";

type Sb = { from: (t: string) => any; rpc: (fn: string, args?: Record<string, unknown>) => any };

/**
 * Promotes a successfully verified task into durable semantic memory.
 * The operation is idempotent per task and intentionally best-effort: memory
 * capture must never turn an already successful agent run into a failed run.
 */
export async function captureVerifiedAgentExperience(args: {
  sb: Sb;
  userId: string;
  taskId: string;
}) {
  try {
    const { data: existing } = await args.sb
      .from("agent_memories")
      .select("id")
      .eq("task_id", args.taskId)
      .eq("category", "verified_experience")
      .limit(1)
      .maybeSingle();
    if (existing) return existing;

    const { data: task, error: taskError } = await args.sb
      .from("agent_tasks")
      .select("id,agent_id,org_id,input,output_text,planner_state,verification_state,status")
      .eq("id", args.taskId)
      .maybeSingle();
    if (taskError || !task || !["succeeded", "completed"].includes(String(task.status))) return null;
    if (!task.planner_state || !task.verification_state) return null;

    const { data: agent, error: agentError } = await args.sb
      .from("personal_agents")
      .select("id,name,memory_enabled")
      .eq("id", task.agent_id)
      .maybeSingle();
    if (agentError || !agent || agent.memory_enabled === false) return null;

    const learning = buildVerifiedExperienceLearning({
      agentName: String(agent.name ?? "Agent"),
      objective: String(task.input ?? ""),
      outcome: String(task.output_text ?? ""),
      plan: task.planner_state,
      verification: task.verification_state,
    });
    if (!learning) return null;

    return await storeMemory({
      sb: args.sb,
      userId: args.userId,
      input: {
        content: learning.content,
        memory_type: "long_term",
        category: "verified_experience",
        scope: "agent",
        title: learning.title,
        source: "agent_verifier",
        importance: learning.importance,
        agent_id: String(task.agent_id),
        task_id: args.taskId,
        org_id: task.org_id ? String(task.org_id) : null,
        metadata: learning.metadata,
        automatic: true,
      },
    });
  } catch (error) {
    console.error("[agent.learning] verified experience capture failed", error);
    return null;
  }
}
