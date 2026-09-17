import type {
  FoodDeliveryActionRequest,
  FoodDeliveryCapability,
  FoodDeliveryProviderId,
} from "./contracts";

export type FoodDeliveryActionResult = {
  provider: FoodDeliveryProviderId;
  capability: FoodDeliveryCapability;
  providerResourceId?: string;
  status: "completed" | "accepted" | "pending";
  evidence: Record<string, unknown>;
};

export interface FoodDeliveryProviderAdapter {
  readonly provider: FoodDeliveryProviderId;
  readonly capabilities: ReadonlySet<FoodDeliveryCapability>;

  execute(request: FoodDeliveryActionRequest): Promise<FoodDeliveryActionResult>;
}

export function assertProviderCapability(
  adapter: FoodDeliveryProviderAdapter,
  capability: FoodDeliveryCapability,
): void {
  if (!adapter.capabilities.has(capability)) {
    throw new Error(`Provider ${adapter.provider} does not advertise ${capability}`);
  }
}
