import type {
  FoodDeliveryProviderManifest,
  FoodDeliveryRegion,
} from "./contracts";

export const FOOD_DELIVERY_PROVIDERS: readonly FoodDeliveryProviderManifest[] = [
  {
    id: "uber-eats",
    displayName: "Uber Eats",
    environment: "sandbox",
    capabilities: [
      "merchant.store_read",
      "merchant.store_write",
      "merchant.menu_read",
      "merchant.menu_write",
      "merchant.order_read",
      "merchant.order_accept",
      "merchant.order_reject",
      "merchant.order_cancel",
    ],
    countryCodes: [],
    requiresPartnerApproval: true,
    webhookSupport: true,
    productionReady: false,
  },
  {
    id: "deliveroo",
    displayName: "Deliveroo",
    environment: "sandbox",
    capabilities: [
      "merchant.store_read",
      "merchant.store_write",
      "merchant.menu_read",
      "merchant.menu_write",
      "merchant.inventory_write",
      "merchant.order_read",
      "merchant.order_accept",
      "merchant.order_reject",
      "delivery.quote",
      "delivery.create",
      "delivery.track",
    ],
    countryCodes: [],
    requiresPartnerApproval: true,
    webhookSupport: true,
    productionReady: false,
  },
  {
    id: "just-eat",
    displayName: "Just Eat",
    environment: "sandbox",
    capabilities: [],
    countryCodes: [],
    requiresPartnerApproval: true,
    webhookSupport: false,
    productionReady: false,
  },
];

export function providersForRegion(
  region: FoodDeliveryRegion,
  manifests: readonly FoodDeliveryProviderManifest[] = FOOD_DELIVERY_PROVIDERS,
): FoodDeliveryProviderManifest[] {
  const countryCode = region.countryCode.trim().toUpperCase();
  if (!countryCode) return [];

  return manifests.filter(
    (provider) => provider.countryCodes.length === 0 || provider.countryCodes.includes(countryCode),
  );
}

export function productionReadyProviders(
  manifests: readonly FoodDeliveryProviderManifest[] = FOOD_DELIVERY_PROVIDERS,
): FoodDeliveryProviderManifest[] {
  return manifests.filter((provider) => provider.productionReady);
}
