import {
  executeIntegrationAction,
  normalizeIntegrationProvider,
  type IntegrationExecutionResult,
} from "./agent-integration-runtime.server";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Execute an already-approved dynamic connected-service action from its
 * immutable approval payload. The transport selected during preparation is
 * forwarded verbatim so approval cannot silently re-route an action through a
 * different native API or connector after the user has reviewed it.
 */
export async function executeApprovedIntegrationAction(
  userId: string,
  details: Record<string, unknown>,
): Promise<IntegrationExecutionResult> {
  const provider = normalizeIntegrationProvider(details["provider"]);
  const action = typeof details["action"] === "string" ? details["action"].trim() : "";
  const actionInput = record(details["input"]);
  const transport = typeof details["transport"] === "string" ? details["transport"].trim() : "";

  if (!provider) {
    return { ok: false, provider: "", error: "Approved integration provider is missing.", attempts: [] };
  }
  if (!action) {
    return { ok: false, provider, error: "Approved integration action is missing.", attempts: [] };
  }
  if (!transport) {
    // Legacy approvals created before transport pinning remain executable, but
    // only through normal live routing. New approvals always persist transport.
    return executeIntegrationAction({ userId, provider, action, actionInput });
  }

  return executeIntegrationAction({
    userId,
    provider,
    action,
    actionInput,
    transport,
  });
}
