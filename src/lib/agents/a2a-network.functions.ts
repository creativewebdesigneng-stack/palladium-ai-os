import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveAgentNetworkRoute, type AgentNetworkPassport } from "./a2a-network";
import type { AgentDelegationGrant } from "./agent-trust";

type Sb = { from: (table: string) => any };

const routeInput = z.object({
  sender_agent_id: z.string().uuid(),
  capability: z.string().trim().min(1).max(120),
  tool_scopes: z.array(z.string().trim().min(1).max(120)).max(50).default([]),
  provider_scopes: z.array(z.string().trim().min(1).max(120)).max(50).default([]),
  external_action: z.boolean().default(false),
  hop: z.number().int().min(0).max(4).default(0),
});

const messageInput = routeInput.extend({
  kind: z.enum(["request", "response", "event"]).default("request"),
  payload: z.record(z.string(), z.unknown()).default({}),
  correlation_id: z.string().uuid().nullable().optional(),
  expires_at: z.string().datetime({ offset: true }).nullable().optional(),
});

async function ownedAgent(sb: Sb, userId: string, agentId: string) {
  const { data, error } = await sb
    .from("personal_agents")
    .select("id,user_id,org_id,org_id_fk,status")
    .eq("id", agentId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) throw new Error(error?.message ?? "Agent not found or not owned by this account.");
  return data;
}

async function networkState(sb: Sb, userId: string) {
  const [{ data: identities, error: identityError }, { data: grants, error: grantError }] = await Promise.all([
    sb
      .from("agent_identities")
      .select("agent_id,canonical_id,status,agent_passports(capabilities,tool_scopes,provider_scopes,autonomy_tier,risk_tier)")
      .eq("user_id", userId),
    sb.from("agent_delegation_grants").select("*").eq("user_id", userId).eq("status", "active"),
  ]);
  if (identityError) throw new Error(identityError.message);
  if (grantError) throw new Error(grantError.message);

  const passports: AgentNetworkPassport[] = (identities ?? []).map((identity: any) => {
    const passport = Array.isArray(identity.agent_passports) ? identity.agent_passports[0] : identity.agent_passports;
    return {
      agent_id: identity.agent_id,
      canonical_id: identity.canonical_id,
      status: identity.status,
      capabilities: passport?.capabilities ?? [],
      tool_scopes: passport?.tool_scopes ?? [],
      provider_scopes: passport?.provider_scopes ?? [],
      autonomy_tier: passport?.autonomy_tier ?? null,
      risk_tier: passport?.risk_tier ?? null,
    };
  });
  return { passports, grants: (grants ?? []) as AgentDelegationGrant[] };
}

export const listAgentNetworkDirectory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { passports } = await networkState(sb, context.userId);
    return passports.filter((passport) => passport.status === "active");
  });

export const resolveAgentNetworkCapability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => routeInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await ownedAgent(sb, context.userId, data.sender_agent_id);
    const { passports, grants } = await networkState(sb, context.userId);
    return resolveAgentNetworkRoute(
      {
        senderAgentId: data.sender_agent_id,
        capability: data.capability,
        toolScopes: data.tool_scopes,
        providerScopes: data.provider_scopes,
        externalAction: data.external_action,
        hop: data.hop,
      },
      passports,
      grants,
    );
  });

export const queueAgentNetworkMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => messageInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const sender = await ownedAgent(sb, context.userId, data.sender_agent_id);
    const { passports, grants } = await networkState(sb, context.userId);
    const route = resolveAgentNetworkRoute(
      {
        senderAgentId: data.sender_agent_id,
        capability: data.capability,
        toolScopes: data.tool_scopes,
        providerScopes: data.provider_scopes,
        externalAction: data.external_action,
        hop: data.hop,
      },
      passports,
      grants,
    );
    if (!route) throw new Error("No authorised Blackstar agent route is available for this capability.");

    const recipient = await ownedAgent(sb, context.userId, route.recipientAgentId);
    const senderOrg = sender.org_id_fk ?? sender.org_id ?? null;
    const recipientOrg = recipient.org_id_fk ?? recipient.org_id ?? null;
    if (senderOrg !== recipientOrg) throw new Error("A2A routing cannot cross organisation boundaries.");

    const { data: message, error } = await sb
      .from("agent_a2a_messages")
      .insert({
        user_id: context.userId,
        org_id: senderOrg,
        sender_agent_id: data.sender_agent_id,
        recipient_agent_id: route.recipientAgentId,
        delegation_grant_id: route.grantId,
        correlation_id: data.correlation_id ?? null,
        scope: data.capability,
        kind: data.kind,
        payload: data.payload,
        hop: data.hop,
        status: route.requiresApproval ? "pending_approval" : "queued",
        requires_approval: route.requiresApproval,
        expires_at: data.expires_at ?? null,
      })
      .select("*")
      .maybeSingle();
    if (error || !message) throw new Error(error?.message ?? "Could not queue A2A message.");
    return { route, message };
  });
