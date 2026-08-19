import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { analyseAgentImprovement, type AgentImprovementTask } from "./agent-improvement";

type Sb = { from: (t: string) => any };

/** Returns bounded, evidence-backed improvement recommendations for one owned agent. */
export const getAgentImprovementInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { agentId: string }) => {
    const agentId = String(input?.agentId ?? "").trim();
    if (!agentId) throw new Error("Agent id is required");
    return { agentId };
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: agent, error: agentError } = await sb
      .from("personal_agents")
      .select("id,name,model,model_provider,status,operating_profile,allowed_tools")
      .eq("id", data.agentId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (agentError) throw new Error(agentError.message);
    if (!agent) throw new Error("Agent not found");

    const { data: tasks, error: taskError } = await sb
      .from("agent_tasks")
      .select("agent_id,status,error,input,replan_count,verification_state,provider,model,duration_ms,created_at")
      .eq("agent_id", data.agentId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (taskError) throw new Error(taskError.message);

    return {
      agent,
      report: analyseAgentImprovement((tasks ?? []) as AgentImprovementTask[]),
    };
  });
