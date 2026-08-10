/**
 * Public API rate limits, derived from the subscription plan.
 * Client-safe (no secrets, no server-only imports) so the portal UI can show
 * the same numbers the server enforces.
 */

export type ApiPlanCode = "explorer" | "builder" | "business" | "enterprise";

export type ApiPlanLimits = {
  label: string;
  requestsPerMinute: number;
  requestsPerDay: number;
  /** Whether the plan may call execution endpoints (agent runs, workflow runs). */
  execution: boolean;
  /** Execution calls allowed per day (0 = none). */
  executionsPerDay: number;
  maxKeys: number;
  maxWebhooks: number;
};

export const API_PLAN_LIMITS: Record<ApiPlanCode, ApiPlanLimits> = {
  explorer: {
    label: "Explorer",
    requestsPerMinute: 20,
    requestsPerDay: 500,
    execution: false,
    executionsPerDay: 0,
    maxKeys: 1,
    maxWebhooks: 1,
  },
  builder: {
    label: "Builder",
    requestsPerMinute: 120,
    requestsPerDay: 20_000,
    execution: true,
    executionsPerDay: 500,
    maxKeys: 5,
    maxWebhooks: 5,
  },
  business: {
    label: "Business",
    requestsPerMinute: 600,
    requestsPerDay: 200_000,
    execution: true,
    executionsPerDay: 10_000,
    maxKeys: 25,
    maxWebhooks: 25,
  },
  enterprise: {
    label: "Enterprise",
    requestsPerMinute: 3_000,
    requestsPerDay: 2_000_000,
    execution: true,
    executionsPerDay: 250_000,
    maxKeys: 100,
    maxWebhooks: 100,
  },
};

export function apiLimitsFor(planCode: string | null | undefined): ApiPlanLimits {
  const code = (planCode ?? "explorer") as ApiPlanCode;
  return API_PLAN_LIMITS[code] ?? API_PLAN_LIMITS.explorer;
}

export const API_SCOPES = [
  "agents:read",
  "agents:write",
  "agents:run",
  "tasks:read",
  "tasks:write",
  "workflows:read",
  "workflows:run",
  "workforces:read",
  "marketplace:read",
  "usage:read",
] as const;

export const WEBHOOK_EVENT_TYPES = [
  "agent.completed",
  "agent.failed",
  "task.completed",
  "workflow.completed",
  "approval.required",
  "purchase.completed",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENT_TYPES)[number];
