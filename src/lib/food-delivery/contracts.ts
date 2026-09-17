export type FoodDeliveryProviderId =
  | "uber-eats"
  | "deliveroo"
  | "just-eat"
  | "doordash"
  | "wolt"
  | "grubhub"
  | "glovo"
  | "foodpanda"
  | "talabat"
  | "careem"
  | "swiggy"
  | "zomato"
  | "grabfood"
  | "rappi"
  | "ifood"
  | (string & {});

export type FoodDeliveryCapability =
  | "consumer.restaurant_search"
  | "consumer.menu_read"
  | "consumer.cart_write"
  | "consumer.order_create"
  | "consumer.order_track"
  | "merchant.store_read"
  | "merchant.store_write"
  | "merchant.menu_read"
  | "merchant.menu_write"
  | "merchant.inventory_write"
  | "merchant.order_read"
  | "merchant.order_accept"
  | "merchant.order_reject"
  | "merchant.order_cancel"
  | "merchant.reporting_read"
  | "merchant.promotion_write"
  | "delivery.quote"
  | "delivery.create"
  | "delivery.track";

export type FoodDeliveryEnvironment = "sandbox" | "production";
export type FoodDeliveryConnectionStatus = "available" | "connected" | "needs_access" | "unavailable";

export interface FoodDeliveryRegion {
  countryCode: string;
  subdivisionCode?: string;
  locality?: string;
}

export interface FoodDeliveryProviderManifest {
  id: FoodDeliveryProviderId;
  displayName: string;
  environment: FoodDeliveryEnvironment;
  capabilities: readonly FoodDeliveryCapability[];
  countryCodes: readonly string[];
  requiresPartnerApproval: boolean;
  webhookSupport: boolean;
  productionReady: boolean;
}

export interface FoodDeliveryConnection {
  id: string;
  providerId: FoodDeliveryProviderId;
  status: FoodDeliveryConnectionStatus;
  environment: FoodDeliveryEnvironment;
  grantedCapabilities: readonly FoodDeliveryCapability[];
  merchantLocationId?: string;
}

export interface FoodDeliveryActionRequest {
  requestId: string;
  providerId: FoodDeliveryProviderId;
  connectionId: string;
  capability: FoodDeliveryCapability;
  input: unknown;
}

export interface FoodDeliveryActionPolicy {
  consequential: boolean;
  requiresApproval: boolean;
  exactlyOnce: boolean;
}
