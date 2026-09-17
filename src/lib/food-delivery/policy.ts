import type { FoodDeliveryActionPolicy, FoodDeliveryCapability } from "./contracts";

const CONSEQUENTIAL_CAPABILITIES = new Set<FoodDeliveryCapability>([
  "consumer.cart_write",
  "consumer.order_create",
  "merchant.store_write",
  "merchant.menu_write",
  "merchant.inventory_write",
  "merchant.order_accept",
  "merchant.order_reject",
  "merchant.order_cancel",
  "merchant.promotion_write",
  "delivery.create",
]);

export function foodDeliveryActionPolicy(capability: FoodDeliveryCapability): FoodDeliveryActionPolicy {
  const consequential = CONSEQUENTIAL_CAPABILITIES.has(capability);
  return {
    consequential,
    requiresApproval: consequential,
    exactlyOnce: consequential,
  };
}

export function capabilityRequiresApproval(capability: FoodDeliveryCapability): boolean {
  return foodDeliveryActionPolicy(capability).requiresApproval;
}

export function assertFoodDeliveryCapabilityGranted(
  capability: FoodDeliveryCapability,
  grantedCapabilities: readonly FoodDeliveryCapability[],
): void {
  if (!grantedCapabilities.includes(capability)) {
    throw new Error(`Food delivery capability not granted: ${capability}`);
  }
}
