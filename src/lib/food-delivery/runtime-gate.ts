import type { FoodDeliveryActionRequest } from "./contracts";
import type { FoodDeliveryProviderAvailability } from "./availability";
import { assertFoodDeliveryExecutionAvailable } from "./availability";
import { capabilityRequiresApproval } from "./policy";
import type { FoodDeliveryProviderAdapter } from "./provider-adapter";
import { executeFoodDeliveryWithEvidence, type VerifiedFoodDeliveryExecution } from "./execution-evidence";

export type FoodDeliveryRuntimeDecision =
  | { status: "approval_required"; request: FoodDeliveryActionRequest }
  | { status: "executed"; result: VerifiedFoodDeliveryExecution };

/**
 * Shared preflight for agent/runtime calls. Consequential capabilities always
 * stop at Blackstar's existing approval boundary. This public runtime entry
 * point deliberately has no caller-controlled approval bypass: consequential
 * execution must return through the immutable approved integration-action
 * executor after its atomic approval claim.
 */
export async function executeFoodDeliveryRuntimeAction(input: {
  request: FoodDeliveryActionRequest;
  availability: FoodDeliveryProviderAvailability;
  adapter: FoodDeliveryProviderAdapter;
}): Promise<FoodDeliveryRuntimeDecision> {
  if (input.availability.provider.id !== input.request.providerId) {
    throw new Error("Food delivery availability does not match the requested provider.");
  }
  if (input.availability.connection?.id !== input.request.connectionId) {
    throw new Error("Food delivery availability does not match the requested connection.");
  }

  assertFoodDeliveryExecutionAvailable(input.availability, input.request.capability);

  if (capabilityRequiresApproval(input.request.capability)) {
    return { status: "approval_required", request: input.request };
  }

  const result = await executeFoodDeliveryWithEvidence({
    adapter: input.adapter,
    request: input.request,
  });
  return { status: "executed", result };
}
