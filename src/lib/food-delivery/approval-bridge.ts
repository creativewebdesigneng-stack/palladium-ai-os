import type {
  FoodDeliveryActionRequest,
  FoodDeliveryCapability,
  FoodDeliveryProviderId,
} from "./contracts";
import { foodDeliveryActionPolicy } from "./policy";

export const FOOD_DELIVERY_APPROVAL_ACTION = "integration_action" as const;
export const FOOD_DELIVERY_APPROVAL_DOMAIN = "food_delivery" as const;

export type FoodDeliveryApprovalDetails = {
  provider: FoodDeliveryProviderId;
  action: FoodDeliveryCapability;
  input: Record<string, unknown>;
  transport: string;
  domain: typeof FOOD_DELIVERY_APPROVAL_DOMAIN;
  connection_id: string;
  request_id: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Food delivery action input must be an object.");
  }
  return { ...(value as Record<string, unknown>) };
}

/**
 * Builds the immutable payload stored on Blackstar's existing external-action
 * approval request. Provider, action, input and transport are pinned before
 * review so approval cannot silently re-route the side effect afterwards.
 */
export function buildFoodDeliveryApprovalDetails(input: {
  request: FoodDeliveryActionRequest;
  transport: string;
}): FoodDeliveryApprovalDetails {
  const policy = foodDeliveryActionPolicy(input.request.capability);
  if (!policy.requiresApproval) {
    throw new Error(`Food delivery capability does not require approval: ${input.request.capability}`);
  }
  const transport = input.transport.trim();
  if (!transport) throw new Error("Food delivery approval transport is required.");

  return {
    provider: input.request.providerId,
    action: input.request.capability,
    input: asRecord(input.request.input),
    transport,
    domain: FOOD_DELIVERY_APPROVAL_DOMAIN,
    connection_id: input.request.connectionId,
    request_id: input.request.requestId,
  };
}

/**
 * Extra metadata is intentionally outside `input`: the existing approved
 * integration executor consumes provider/action/input/transport and safely
 * ignores these correlation fields while Blackstar retains them for audit.
 */
export function isFoodDeliveryApprovalDetails(value: unknown): value is FoodDeliveryApprovalDetails {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  const actionInput = row["input"];
  const transport = row["transport"];
  const connectionId = row["connection_id"];
  const requestId = row["request_id"];
  return row["domain"] === FOOD_DELIVERY_APPROVAL_DOMAIN
    && typeof row["provider"] === "string"
    && typeof row["action"] === "string"
    && Boolean(actionInput && typeof actionInput === "object" && !Array.isArray(actionInput))
    && typeof transport === "string" && transport.trim().length > 0
    && typeof connectionId === "string" && connectionId.length > 0
    && typeof requestId === "string" && requestId.length > 0;
}
