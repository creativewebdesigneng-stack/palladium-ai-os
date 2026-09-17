import { INTEGRATION_PROVIDERS } from "@/lib/integrations/providers";
import type { IntegrationHealth, IntegrationHealthState } from "@/lib/integrations/integration-health";

export type AssistantConnectionHealth = Pick<
  IntegrationHealth,
  "state" | "healthy" | "reconnectRequired" | "missingScopes" | "reason"
>;

export type AssistantConnectionObservation = {
  providerId: string;
  health: AssistantConnectionHealth;
};

export type AssistantConnectionSummary = {
  providerId: string;
  name: string;
  category: string;
  state: IntegrationHealthState;
  healthy: boolean;
  reconnectRequired: boolean;
  missingScopes: string[];
  reason: string | null;
  tools: string[];
};

const safeStates = new Set<IntegrationHealthState>([
  "healthy",
  "reconnect_required",
  "pending",
  "disconnected",
]);

/**
 * Converts trusted server-side connection-health observations into a bounded,
 * token-free assistant view. It never resolves credentials or performs provider actions.
 */
export function summariseAssistantConnections(
  observations: AssistantConnectionObservation[],
): AssistantConnectionSummary[] {
  const byProvider = new Map(observations.map((item) => [item.providerId, item.health]));
  return INTEGRATION_PROVIDERS.map((provider) => {
    const observed = byProvider.get(provider.id);
    const state = observed && safeStates.has(observed.state) ? observed.state : "disconnected";
    return {
      providerId: provider.id,
      name: provider.name,
      category: provider.category,
      state,
      healthy: Boolean(observed?.healthy && state === "healthy"),
      reconnectRequired: Boolean(observed?.reconnectRequired),
      missingScopes: (observed?.missingScopes ?? []).filter(Boolean).slice(0, 30),
      reason: observed?.reason?.trim().slice(0, 500) || null,
      tools: provider.tools.slice(0, 30),
    };
  });
}

export function assistantConnectionContext(connections: AssistantConnectionSummary[]): string {
  return [
    "BLACKSTAR CONNECTION STATUS",
    JSON.stringify(connections),
    "This is read-only connection metadata. Never claim a provider is connected unless its observed state is healthy. Never request, expose or infer OAuth tokens, API keys, passwords or other credentials. Connection discovery does not authorise provider actions; use Blackstar's existing integration runtime and approval controls for execution.",
  ].join("\n\n").slice(0, 24000);
}
