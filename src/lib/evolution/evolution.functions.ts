import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { evaluateEvolutionCandidate, type EvolutionMetrics } from "./evolution";

type Sb = { from: (table: string) => any };

const metricsSchema = z.object({
  successRate: z.number().min(0).max(1),
  qualityScore: z.number().min(0).max(1),
  avgCostMicros: z.number().int().nonnegative().safe(),
  avgLatencyMs: z.number().int().nonnegative().safe(),
  sampleSize: z.number().int().positive().safe(),
});

const proposalSchema = z.object({
  agentId: z.string().uuid(),
  changeType: z.enum(["prompt", "routing", "skill_policy", "memory_policy", "workflow_policy"]),
  changeSummary: z.string().trim().min(1).max(1000),
  baseline: metricsSchema,
  candidate: metricsSchema,
  evidenceRefs: z.array(z.string().trim().min(1).max(500)).max(100).default([]),
  correlationId: z.string().uuid().nullish(),
});

export const proposeAgentEvolution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => proposalSchema.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: agent, error: agentError } = await sb
      .from("personal_agents")
      .select("id,org_id,org_id_fk")
      .eq("id", data.agentId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (agentError) throw new Error(agentError.message);
    if (!agent) throw new Error("EVOLUTION_AGENT_NOT_OWNED");

    const decision = evaluateEvolutionCandidate(data.baseline as EvolutionMetrics, data.candidate as EvolutionMetrics);
    const orgId = agent.org_id_fk ?? agent.org_id ?? null;
    const { data: saved, error } = await sb
      .from("agent_evolution_proposals")
      .insert({
        user_id: context.userId,
        org_id: orgId,
        agent_id: data.agentId,
        correlation_id: data.correlationId ?? null,
        change_type: data.changeType,
        change_summary: data.changeSummary,
        baseline_metrics: data.baseline,
        candidate_metrics: data.candidate,
        evidence_refs: data.evidenceRefs,
        decision_status: decision.status,
        decision_score: decision.score,
        decision_reasons: decision.reasons,
        requires_approval: true,
        applied: false,
      })
      .select("id,created_at")
      .single();
    if (error) throw new Error(error.message);
    return { proposalId: saved.id, createdAt: saved.created_at, decision };
  });

export const listAgentEvolutionProposals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ agentId: z.string().uuid().nullish(), limit: z.number().int().min(1).max(100).default(25) }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    let query = sb
      .from("agent_evolution_proposals")
      .select("id,agent_id,change_type,change_summary,decision_status,decision_score,decision_reasons,requires_approval,applied,evidence_refs,created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.agentId) query = query.eq("agent_id", data.agentId);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return { proposals: rows ?? [] };
  });
