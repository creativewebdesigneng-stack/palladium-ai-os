import type { FoodDeliveryActionRequest } from "./contracts";
import type { FoodDeliveryActionResult, FoodDeliveryProviderAdapter } from "./provider-adapter";
import { assertProviderCapability } from "./provider-adapter";

export type VerifiedFoodDeliveryExecution = {
  requestId: string;
  connectionId: string;
  provider: string;
  capability: string;
  providerResourceId?: string;
  status: FoodDeliveryActionResult["status"];
  evidence: Record<string, unknown>;
};

export function assertProviderSuccessEvidence(result: FoodDeliveryActionResult): void {
  if (!result.evidence || typeof result.evidence !== "object" || Array.isArray(result.evidence)) {
    throw new Error("Food delivery provider returned no verifiable success evidence.");
  }
  if (Object.keys(result.evidence).length === 0) {
    throw new Error("Food delivery provider returned empty success evidence.");
  }
}

/** Execute only through a capability-advertising provider adapter and refuse
 * to report success unless the provider returned concrete evidence. */
export async function executeFoodDeliveryWithEvidence(input: {
  adapter: FoodDeliveryProviderAdapter;
  request: FoodDeliveryActionRequest;
}): Promise<VerifiedFoodDeliveryExecution> {
  if (input.adapter.provider !== input.request.providerId) {
    throw new Error(`Food delivery provider mismatch: ${input.request.providerId}`);
  }
  assertProviderCapability(input.adapter, input.request.capability);
  const result = await input.adapter.execute(input.request);
  if (result.provider !== input.request.providerId || result.capability !== input.request.capability) {
    throw new Error("Food delivery provider response does not match the requested action.");
  }
  assertProviderSuccessEvidence(result);

  return {
    requestId: input.request.requestId,
    connectionId: input.request.connectionId,
    provider: result.provider,
    capability: result.capability,
    ...(result.providerResourceId ? { providerResourceId: result.providerResourceId } : {}),
    status: result.status,
    evidence: result.evidence,
  };
}
