import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveCollectiveConsensus, type CollectiveProposal } from "./collective-intelligence";

type Sb = { from: (table: string) => any };

const proposalInput = z.object({
  agentId: z.string().uuid(),
  answerKey: z.string().trim().min(1).max(500),
  confidence: z.number().min(0).max(1),
  evidenceRefs: z.array(z.string().trim().min(1).max(500)).max(100).default([]),
});

const collectiveInput = z.object({
  topic: z.string().trim().min(1).max(500),
  correlationId: z.string().uuid().nullish(),
  proposals: z.array(proposalInput).min(2).max(20),
});

export const runCollectiveDeliberation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => collectiveInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const requestedIds = [...new Set(data.proposals.map((proposal) => proposal.agentId))];
    if (requestedIds.length !== data.proposals.length) throw new Error("COLLECTIVE_DUPLICATE_AGENT");

    const { data: agents, error: agentError } = await sb
      .from("personal_agents")
      .select("id,org_id,org_id_fk")
      .eq("user_id", context.userId)
      .in("id", requestedIds);
    if (agentError) throw new Error(agentError.message);
    if ((agents ?? []).length !== requestedIds.length) throw new Error("COLLECTIVE_AGENT_NOT_OWNED");

    const orgScopes = new Set((agents ?? []).map((agent: any) => agent.org_id_fk ?? agent.org_id ?? null));
    if (orgScopes.size !== 1) throw new Error("COLLECTIVE_CROSS_ORG_FORBIDDEN");
    const orgId = [...orgScopes][0] ?? null;

    const { data: identities, error: identityError } = await sb
      .from("agent_identities")
      .select("agent_id,canonical_id,status")
      .eq("user_id", context.userId)
      .in("agent_id", requestedIds);
    if (identityError) throw new Error(identityError.message);
    const identityByAgent = new Map<string, { canonical_id: string; status: string }>();
    for (const identity of identities ?? []) {
      if (identity.status === "active") identityByAgent.set(identity.agent_id, identity);
    }
    if (identityByAgent.size !== requestedIds.length) throw new Error("COLLECTIVE_TRUST_IDENTITY_REQUIRED");

    const proposals: CollectiveProposal[] = data.proposals.map((proposal) => {
      const identity = identityByAgent.get(proposal.agentId);
      if (!identity) throw new Error("COLLECTIVE_TRUST_IDENTITY_REQUIRED");
      return {
        agentId: proposal.agentId,
        canonicalId: identity.canonical_id,
        answerKey: proposal.answerKey,
        confidence: proposal.confidence,
        evidenceRefs: proposal.evidenceRefs,
      };
    });
    const consensus = resolveCollectiveConsensus(proposals);

    const { data: saved, error } = await sb
      .from("agent_collective_deliberations")
      .insert({
        user_id: context.userId,
        org_id: orgId,
        correlation_id: data.correlationId ?? null,
        topic: data.topic,
        participant_agent_ids: requestedIds,
        proposals,
        consensus,
        status: consensus.status,
        selected_answer_key: consensus.selectedAnswerKey,
        confidence: consensus.confidence,
        agreement_ratio: consensus.agreementRatio,
      })
      .select("id,created_at")
      .single();
    if (error) throw new Error(error.message);
    return { deliberationId: saved.id, createdAt: saved.created_at, consensus };
  });

export const listCollectiveDeliberations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ limit: z.number().int().min(1).max(100).default(25) }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: rows, error } = await sb
      .from("agent_collective_deliberations")
      .select("id,topic,status,selected_answer_key,confidence,agreement_ratio,participant_agent_ids,consensus,created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return { deliberations: rows ?? [] };
  });
