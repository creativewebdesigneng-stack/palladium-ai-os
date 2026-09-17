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
 * Shared preflight for agent/runtime calls. Consequential capabilities stop at
 * the existing Blackstar approval boundary; provider execution is impossible
 * until the caller returns through the approved integration-action executor.
 */
export async function executeFoodDeliveryRuntimeAction(input: {
  request: FoodDeliveryActionRequest;
  availability: FoodDeliveryProviderAvailability;
  adapter: FoodDeliveryProviderAdapter;
  approved?: boolean;
}): Promise<FoodDeliveryRuntimeDecision> {
  if (input.availability.provider.id !== input.request.providerId) {
    throw new Error("Food delivery availability does not match the requested provider.");
  }
  if (input.availability.connection?.id !== input.request.connectionId) {
    throw new Error("Food delivery availability does not match the requested connection.");
  }

  assertFoodDeliveryExecutionAvailable(input.availability, input.request.capability);

  if (capabilityRequiresApproval(input.request.capability) && input.approved !== true) {
    return { status: "approval_required", request: input.request };
  }

  const result = await executeFoodDeliveryWithEvidence({
    adapter: input.adapter,
    request: input.request,
  });
  return { status: "executed", result };
}
