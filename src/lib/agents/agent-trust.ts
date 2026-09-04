export type AgentDelegationGrant = {
  id: string;
  grantor_agent_id: string;
  grantee_agent_id: string;
  scopes: unknown;
  max_hops: number;
  requires_approval: boolean;
  allow_external_actions: boolean;
  status: string;
  expires_at?: string | null;
};

export type DelegationRequest = {
  grantorAgentId: string;
  granteeAgentId: string;
  scope: string;
  hop: number;
  externalAction?: boolean;
};

export type DelegationDecision = {
  allowed: boolean;
  requiresApproval: boolean;
  reason: string;
  grantId?: string;
};

function scopesFrom(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function evaluateAgentDelegation(
  grant: AgentDelegationGrant | null | undefined,
  request: DelegationRequest,
  now = new Date(),
): DelegationDecision {
  if (!grant) return { allowed: false, requiresApproval: true, reason: "No delegation grant exists." };
  if (grant.grantor_agent_id !== request.grantorAgentId || grant.grantee_agent_id !== request.granteeAgentId)
    return { allowed: false, requiresApproval: true, reason: "Delegation identities do not match the grant." };
  if (grant.status !== "active")
    return { allowed: false, requiresApproval: true, reason: `Delegation grant is ${grant.status}.` };
  if (grant.expires_at && new Date(grant.expires_at).getTime() <= now.getTime())
    return { allowed: false, requiresApproval: true, reason: "Delegation grant has expired." };
  if (!Number.isInteger(request.hop) || request.hop < 0 || request.hop > grant.max_hops)
    return { allowed: false, requiresApproval: true, reason: "Delegation hop limit exceeded." };

  const scopes = scopesFrom(grant.scopes);
  if (!scopes.includes(request.scope) && !scopes.includes("*"))
    return { allowed: false, requiresApproval: true, reason: "Requested scope is not delegated." };
  if (request.externalAction && !grant.allow_external_actions)
    return { allowed: false, requiresApproval: true, reason: "External actions are not delegated." };

  return {
    allowed: true,
    requiresApproval: grant.requires_approval || Boolean(request.externalAction),
    reason: grant.requires_approval || request.externalAction ? "Delegation is allowed with approval." : "Delegation is allowed.",
    grantId: grant.id,
  };
}

export function canonicalBlackstarAgentId(agentId: string) {
  return `urn:blackstar:agent:${agentId}`;
}
