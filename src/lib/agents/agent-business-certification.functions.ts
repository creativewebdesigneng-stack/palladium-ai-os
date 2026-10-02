import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  buildAgentBusinessCertification,
  summariseAgentBusinessCertification,
} from "./agent-business-certification";
import { AGENT_BUSINESS_BENCHMARKS } from "./agent-business-benchmarks";

type Sb = { from: (table: string) => any };

const inputSchema = z.object({
  agentId: z.string().uuid(),
});

export const getAgentBusinessCertification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const agentResult = await sb
      .from("personal_agents")
      .select("id,name,allowed_tools,allowed_providers,requires_approval,autonomy,status")
      .eq("id", data.agentId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (agentResult.error) throw new Error(agentResult.error.message);
    if (!agentResult.data) throw new Error("Agent not found.");

    const [tasksResult, executionsResult, approvalsResult] = await Promise.all([
      sb
        .from("agent_tasks")
        .select("id,status,verification_state,created_at")
        .eq("agent_id", data.agentId)
        .eq("user_id", context.userId)
        .order("created_at", { ascending: true })
        .limit(200),
      sb
        .from("tool_executions")
        .select("agent_task_id,tool,status,output,error,policy_code,created_at")
        .eq("agent_id", data.agentId)
        .eq("user_id", context.userId)
        .order("created_at", { ascending: true })
        .limit(500),
      sb
        .from("approval_requests")
        .select("task_id,action_type,status,execution_status,created_at")
        .eq("agent_id", data.agentId)
        .eq("user_id", context.userId)
        .order("created_at", { ascending: true })
        .limit(200),
    ]);
    if (tasksResult.error) throw new Error(tasksResult.error.message);
    if (executionsResult.error) throw new Error(executionsResult.error.message);
    if (approvalsResult.error) throw new Error(approvalsResult.error.message);

    const capabilities = buildAgentBusinessCertification({
      allowedTools: agentResult.data.allowed_tools ?? [],
      allowedProviders: agentResult.data.allowed_providers ?? [],
      tasks: tasksResult.data ?? [],
      toolExecutions: executionsResult.data ?? [],
      approvals: approvalsResult.data ?? [],
    });

    return {
      agent: {
        id: agentResult.data.id,
        name: agentResult.data.name,
        status: agentResult.data.status,
        requiresApproval: agentResult.data.requires_approval !== false,
        autonomy: agentResult.data.autonomy ?? null,
      },
      capabilities,
      benchmarks: AGENT_BUSINESS_BENCHMARKS.map((benchmark) => ({
        id: benchmark.id,
        capability: benchmark.capability,
        kind: benchmark.kind,
        title: benchmark.title,
        objective: benchmark.objective,
        prompt: benchmark.prompt,
        expectedTools: [...benchmark.expectedTools],
        successCriteria: [...benchmark.successCriteria],
        externalSideEffect: benchmark.externalSideEffect,
      })),
      summary: summariseAgentBusinessCertification(capabilities),
      policy: {
        evidenceFloor: 0.9,
        requiredVerifiedTasks: 3,
        certificationDoesNotGrantPermissions: true,
        realMoneyAutonomy: false,
      },
    };
  });
