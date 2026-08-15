export type IntegrationHealthState =
  | "healthy"
  | "reconnect_required"
  | "pending"
  | "disconnected";

export type IntegrationHealth = {
  state: IntegrationHealthState;
  healthy: boolean;
  reconnectRequired: boolean;
  missingScopes: string[];
  reason: string | null;
};

type HealthInput = {
  providerName: string;
  requiredScopes: string[];
  status?: string | null;
  grantedScopes?: string[] | null;
  expiresAt?: string | null;
  hasRefreshToken?: boolean;
  lastError?: string | null;
  nowMs?: number;
};

const normaliseScope = (value: string) => value.trim().toLowerCase();

/**
 * Pure integration-health policy. It intentionally receives only a boolean for
 * refresh-token presence; token material never needs to leave trusted server code.
 */
export function assessIntegrationHealth(input: HealthInput): IntegrationHealth {
  const status = String(input.status ?? "disconnected").toLowerCase();
  const required = input.requiredScopes.filter(Boolean);
  const granted = new Set((input.grantedScopes ?? []).map(normaliseScope));
  const missingScopes = required.filter((scope) => !granted.has(normaliseScope(scope)));

  if (status === "pending") {
    return {
      state: "pending",
      healthy: false,
      reconnectRequired: false,
      missingScopes: [],
      reason: "Connection authorisation is still pending.",
    };
  }

  if (status !== "connected") {
    const reconnectRequired = status === "error";
    return {
      state: reconnectRequired ? "reconnect_required" : "disconnected",
      healthy: false,
      reconnectRequired,
      missingScopes: [],
      reason: reconnectRequired
        ? input.lastError?.trim() || `${input.providerName} needs to be connected again.`
        : null,
    };
  }

  if (missingScopes.length) {
    return {
      state: "reconnect_required",
      healthy: false,
      reconnectRequired: true,
      missingScopes,
      reason: `${input.providerName} is connected but is missing permissions required by the current PalladiumAI integration. Reconnect to grant the updated permissions.`,
    };
  }

  const expiryMs = input.expiresAt ? Date.parse(input.expiresAt) : Number.NaN;
  const expired = Number.isFinite(expiryMs) && expiryMs <= (input.nowMs ?? Date.now());
  if (expired && !input.hasRefreshToken) {
    return {
      state: "reconnect_required",
      healthy: false,
      reconnectRequired: true,
      missingScopes: [],
      reason: `${input.providerName} access has expired and cannot be refreshed. Reconnect the account.`,
    };
  }

  return {
    state: "healthy",
    healthy: true,
    reconnectRequired: false,
    missingScopes: [],
    reason: null,
  };
}
