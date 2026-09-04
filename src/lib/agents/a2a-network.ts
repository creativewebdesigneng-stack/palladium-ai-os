import { evaluateAgentDelegation, type AgentDelegationGrant } from "./agent-trust";

export type AgentNetworkPassport = {
  agent_id: string;
  canonical_id: string;
  status?: string | null;
  capabilities?: string[];
  tool_scopes?: string[];
  provider_scopes?: string[];
  autonomy_tier?: string | null;
  risk_tier?: string | null;
};

export type AgentNetworkRequest = {
  senderAgentId: string;
  capability: string;
  toolScopes?: string[];
  providerScopes?: string[];
  externalAction?: boolean;
  hop?: number;
};

export type AgentNetworkRoute = {
  recipientAgentId: string;
  canonicalId: string;
  capability: string;
  score: number;
  requiresApproval: boolean;
  grantId: string;
};

export type AgentMessageEnvelope = {
  id: string;
  senderAgentId: string;
  recipientAgentId: string;
  scope: string;
  kind: "request" | "response" | "event";
  payload: Record<string, unknown>;
  correlationId?: string | null;
  hop: number;
  createdAt: string;
};

function stringSet(value: unknown): Set<string> {
  if (!Array.isArray(value)) return new Set();
  return new Set(
    value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function covers(required: string[] | undefined, available: Set<string>) {
  if (!required?.length) return true;
  return required.every((scope) => available.has(scope) || available.has("*"));
}

function capabilityMatch(capability: string, available: Set<string>) {
  if (available.has(capability)) return 40;
  if (available.has("*")) return 20;
  const namespace = capability.includes(".") ? `${capability.split(".")[0]}.*` : null;
  return namespace && available.has(namespace) ? 30 : 0;
}

const riskPenalty: Record<string, number> = {
  low: 0,
  medium: 2,
  high: 5,
  critical: 10,
};

/**
 * Resolve the best governed recipient for an agent-to-agent request.
 * Discovery is capability based, while authorisation remains delegated by Trust Fabric.
 */
export function resolveAgentNetworkRoute(
  request: AgentNetworkRequest,
  passports: AgentNetworkPassport[],
  grants: AgentDelegationGrant[],
  now = new Date(),
): AgentNetworkRoute | null {
  const routes: AgentNetworkRoute[] = [];
  const hop = request.hop ?? 0;

  for (const passport of passports) {
    if (passport.agent_id === request.senderAgentId || passport.status === "revoked") continue;

    const capabilities = stringSet(passport.capabilities);
    const matchScore = capabilityMatch(request.capability, capabilities);
    if (!matchScore) continue;
    if (!covers(request.toolScopes, stringSet(passport.tool_scopes))) continue;
    if (!covers(request.providerScopes, stringSet(passport.provider_scopes))) continue;

    for (const grant of grants) {
      const decision = evaluateAgentDelegation(
        grant,
        {
          grantorAgentId: request.senderAgentId,
          granteeAgentId: passport.agent_id,
          scope: request.capability,
          hop,
          ...(request.externalAction === undefined ? {} : { externalAction: request.externalAction }),
        },
        now,
      );
      if (!decision.allowed || !decision.grantId) continue;

      const autonomyBonus = passport.autonomy_tier === "autonomous" ? 3 : passport.autonomy_tier === "guarded" ? 1 : 0;
      const score = matchScore + autonomyBonus - (riskPenalty[passport.risk_tier ?? "medium"] ?? 2);
      routes.push({
        recipientAgentId: passport.agent_id,
        canonicalId: passport.canonical_id,
        capability: request.capability,
        score,
        requiresApproval: decision.requiresApproval,
        grantId: decision.grantId,
      });
    }
  }

  routes.sort((a, b) => b.score - a.score || a.canonicalId.localeCompare(b.canonicalId));
  return routes[0] ?? null;
}

export function createAgentMessageEnvelope(input: Omit<AgentMessageEnvelope, "createdAt">, now = new Date()): AgentMessageEnvelope {
  if (!input.id.trim()) throw new Error("A2A message id is required.");
  if (!input.senderAgentId.trim() || !input.recipientAgentId.trim()) throw new Error("A2A sender and recipient are required.");
  if (input.senderAgentId === input.recipientAgentId) throw new Error("An A2A message cannot target its sender.");
  if (!input.scope.trim()) throw new Error("A2A message scope is required.");
  if (!Number.isInteger(input.hop) || input.hop < 0 || input.hop > 4) throw new Error("A2A hop must be between 0 and 4.");
  return { ...input, createdAt: now.toISOString() };
}