import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canonicalBlackstarAgentId } from "./agent-trust";

type Sb = { from: (table: string) => any };

const stringArray = z.array(z.string().trim().min(1).max(120)).max(100);
const passportInput = z.object({
  agent_id: z.string().uuid(),
  display_name: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(2_000).nullable().optional(),
  capabilities: stringArray.default([]),
  provider_scopes: stringArray.default([]),
  tool_scopes: stringArray.default([]),
  autonomy_tier: z.enum(["assisted", "guarded", "autonomous"]).default("guarded"),
  risk_tier: z.enum(["low", "medium", "high", "critical"]).default("medium"),
});

const grantInput = z.object({
  grantor_agent_id: z.string().uuid(),
  grantee_agent_id: z.string().uuid(),
  scopes: stringArray.min(1),
  max_hops: z.number().int().min(0).max(4).default(1),
  requires_approval: z.boolean().default(true),
  allow_external_actions: z.boolean().default(false),
  expires_at: z.string().datetime({ offset: true }).nullable().optional(),
});

async function ownedAgent(sb: Sb, userId: string, agentId: string) {
  const { data, error } = await sb
    .from("personal_agents")
    .select("id,user_id,org_id,org_id_fk,name,purpose,status")
    .eq("id", agentId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) throw new Error(error?.message ?? "Agent not found or not owned by this account.");
  return data;
}

export const listAgentPassports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb
      .from("agent_identities")
      .select("*,agent_passports(*)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertAgentPassport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => passportInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const agent = await ownedAgent(sb, context.userId, data.agent_id);
    const orgId = agent.org_id_fk ?? agent.org_id ?? null;

    const { data: identity, error: identityError } = await sb
      .from("agent_identities")
      .upsert(
        {
          agent_id: agent.id,
          user_id: context.userId,
          org_id: orgId,
          canonical_id: canonicalBlackstarAgentId(agent.id),
          status: agent.status === "archived" ? "revoked" : "active",
          issuer: "blackstar",
        },
        { onConflict: "agent_id" },
      )
      .select("id,agent_id,canonical_id,status,trust_tier")
      .maybeSingle();
    if (identityError || !identity) throw new Error(identityError?.message ?? "Could not create agent identity.");

    const { data: passport, error: passportError } = await sb
      .from("agent_passports")
      .upsert(
        {
          identity_id: identity.id,
          display_name: data.display_name ?? agent.name,
          description: data.description ?? agent.purpose ?? null,
          capabilities: data.capabilities,
          provider_scopes: data.provider_scopes,
          tool_scopes: data.tool_scopes,
          autonomy_tier: data.autonomy_tier,
          risk_tier: data.risk_tier,
        },
        { onConflict: "identity_id" },
      )
      .select("*")
      .maybeSingle();
    if (passportError || !passport) throw new Error(passportError?.message ?? "Could not update agent passport.");
    return { identity, passport };
  });

export const listAgentDelegationGrants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb
      .from("agent_delegation_grants")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createAgentDelegationGrant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => grantInput.parse(input))
  .handler(async ({ data, context }) => {
    if (data.grantor_agent_id === data.grantee_agent_id) throw new Error("An agent cannot delegate to itself.");
    const sb = context.supabase as unknown as Sb;
    const grantor = await ownedAgent(sb, context.userId, data.grantor_agent_id);
    const grantee = await ownedAgent(sb, context.userId, data.grantee_agent_id);
    const grantorOrg = grantor.org_id_fk ?? grantor.org_id ?? null;
    const granteeOrg = grantee.org_id_fk ?? grantee.org_id ?? null;
    if (grantorOrg !== granteeOrg) throw new Error("Delegation requires agents in the same owner and organisation scope.");

    const { data: grant, error } = await sb
      .from("agent_delegation_grants")
      .insert({
        user_id: context.userId,
        org_id: grantorOrg,
        grantor_agent_id: data.grantor_agent_id,
        grantee_agent_id: data.grantee_agent_id,
        scopes: [...new Set(data.scopes)],
        max_hops: data.max_hops,
        requires_approval: data.requires_approval,
        allow_external_actions: data.allow_external_actions,
        expires_at: data.expires_at ?? null,
        status: "active",
        created_by: context.userId,
      })
      .select("*")
      .maybeSingle();
    if (error || !grant) throw new Error(error?.message ?? "Could not create delegation grant.");
    return grant;
  });

export const revokeAgentDelegationGrant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: grant, error } = await sb
      .from("agent_delegation_grants")
      .update({ status: "revoked" })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .select("id,status")
      .maybeSingle();
    if (error || !grant) throw new Error(error?.message ?? "Delegation grant not found.");
    return grant;
  });
