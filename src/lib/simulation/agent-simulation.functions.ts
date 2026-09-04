import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { simulateAgentPlan } from "./agent-simulation";

type Sb = { from: (table: string) => any };

const stepSchema = z.object({
  id: z.string().trim().min(1).max(120),
  action: z.enum(["reasoning", "model", "tool_read", "tool_write", "external_write", "financial"]),
  risk: z.enum(["low", "medium", "high", "critical"]),
  estimatedCostMicros: z.number().int().min(0).safe(),
  requiresApproval: z.boolean().optional(),
});

const simulationSchema = z.object({
  agentId: z.string().uuid().nullish(),
  orgId: z.string().uuid().nullish(),
  correlationId: z.string().uuid().nullish(),
  steps: z.array(stepSchema).max(200),
  policy: z.object({
    maxCostMicros: z.number().int().min(0).safe(),
    maxRiskScore: z.number().int().min(0).max(10_000),
    approvalRisk: z.enum(["high", "critical"]),
  }),
});

async function assertOwnedAgent(sb: Sb, userId: string, agentId: string | null | undefined) {
  if (!agentId) return;
  const { data, error } = await sb.from("personal_agents").select("id").eq("id", agentId).eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("AGENT_NOT_OWNED");
}

export const runAgentSimulation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => simulationSchema.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await assertOwnedAgent(sb, context.userId, data.agentId);
    const result = simulateAgentPlan(data.steps, data.policy);

    const row = {
      user_id: context.userId,
      org_id: data.orgId ?? null,
      agent_id: data.agentId ?? null,
      correlation_id: data.correlationId ?? null,
      scenario: { steps: data.steps, policy: data.policy },
      result,
      status: result.status,
      projected_cost_micros: result.projectedCostMicros,
      risk_score: result.riskScore,
    };
    const { data: saved, error } = await sb.from("agent_simulation_runs").insert(row).select("id,created_at").single();
    if (error) throw new Error(error.message);
    return { simulationId: saved.id, createdAt: saved.created_at, result };
  });

export const listAgentSimulations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ agentId: z.string().uuid().nullish(), limit: z.number().int().min(1).max(100).default(25) }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await assertOwnedAgent(sb, context.userId, data.agentId);
    let query = sb.from("agent_simulation_runs").select("id,agent_id,status,projected_cost_micros,risk_score,result,created_at").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(data.limit);
    if (data.agentId) query = query.eq("agent_id", data.agentId);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return { simulations: rows ?? [] };
  });
