import { resolveFoodDeliveryProviderAvailability } from "./availability";
import type { FoodDeliveryCapability, FoodDeliveryProviderId } from "./contracts";
import { hasOrderableDeliveryDestination, resolveFoodDeliveryLocation } from "./location";
import { foodDeliveryActionPolicy } from "./policy";
import { FOOD_DELIVERY_PROVIDERS } from "./registry";

export type FoodDeliveryExternalAccount = {
  providerId: FoodDeliveryProviderId;
  provider: string;
  account: string;
  env: readonly string[];
  contract: string;
};

export const FOOD_DELIVERY_EXTERNAL_ACCOUNTS: readonly FoodDeliveryExternalAccount[] = [
  {
    providerId: "uber-eats",
    provider: "Uber Eats",
    account: "Uber Eats merchant or Uber Direct partner application",
    env: ["UBER_EATS_CLIENT_ID", "UBER_EATS_CLIENT_SECRET"],
    contract:
      "Official partner approval, granted merchant or delivery scopes, and a webhook signing secret",
  },
  {
    providerId: "deliveroo",
    provider: "Deliveroo",
    account: "Deliveroo Partner Platform or Signature account",
    env: ["DELIVEROO_CLIENT_ID", "DELIVEROO_CLIENT_SECRET"],
    contract:
      "Partner contract covering the store, menu, order, or courier scopes you intend to use",
  },
  {
    providerId: "just-eat",
    provider: "Just Eat",
    account: "Just Eat Takeaway partner API account",
    env: ["JUST_EAT_API_KEY"],
    contract:
      "Official partner credentials and approved API scopes; the adapter stays capability-gated until those exist",
  },
];

const ACCOUNTS = new Map(
  FOOD_DELIVERY_EXTERNAL_ACCOUNTS.map((account) => [account.providerId, account]),
);

export type FoodDeliveryCredentialPresence = Partial<Record<FoodDeliveryProviderId, boolean>>;

export function foodDeliveryCredentialPresence(
  env: Record<string, string | undefined>,
): FoodDeliveryCredentialPresence {
  const presence: FoodDeliveryCredentialPresence = {};
  for (const account of FOOD_DELIVERY_EXTERNAL_ACCOUNTS) {
    presence[account.providerId] = account.env.every((name) => Boolean(env[name]?.trim()));
  }
  return presence;
}

function providerReason(input: {
  state: string;
  credentialsConfigured: boolean;
  productionReady: boolean;
  countryCodes: readonly string[];
}) {
  if (input.countryCodes.length === 0) {
    return "Regional coverage is not contracted, so this adapter is listed but not offered for discovery or ordering.";
  }
  if (input.state === "unsupported_region")
    return "This provider is not declared for the selected country.";
  if (!input.credentialsConfigured)
    return "Partner credentials are not configured. No provider was contacted.";
  if (!input.productionReady)
    return "Credentials are present, but the adapter is not certified for production execution.";
  return "Execution remains closed in this runtime. No order, cancellation, or courier job is sent.";
}

export function buildFoodDeliveryHubStatus(input: {
  countryCode: string;
  deliveryAddress?: string;
  credentialPresence?: FoodDeliveryCredentialPresence;
}) {
  const location = resolveFoodDeliveryLocation(
    input.deliveryAddress
      ? { countryCode: input.countryCode, deliveryAddress: input.deliveryAddress }
      : { countryCode: input.countryCode },
  );
  const credentialPresence = input.credentialPresence ?? {};
  const availability = resolveFoodDeliveryProviderAvailability({
    region: { countryCode: location.countryCode },
    providers: FOOD_DELIVERY_PROVIDERS,
    connections: [],
  });

  return {
    location,
    orderableDestination: hasOrderableDeliveryDestination(location),
    placesOrders: false as const,
    contactsProviders: false as const,
    providers: availability.map((item) => {
      const account = ACCOUNTS.get(item.provider.id);
      const credentialsConfigured = credentialPresence[item.provider.id] === true;
      return {
        id: item.provider.id,
        displayName: item.provider.displayName,
        state: item.state,
        productionReady: item.provider.productionReady,
        geographicallyEligible: item.geographicallyEligible,
        credentialsConfigured,
        executable: false as const,
        capabilities: item.provider.capabilities,
        requiredAccount: account ?? null,
        reason: providerReason({
          state: item.state,
          credentialsConfigured,
          productionReady: item.provider.productionReady,
          countryCodes: item.provider.countryCodes,
        }),
      };
    }),
  };
}

export function refuseFoodDeliverySideEffect(capability: FoodDeliveryCapability) {
  const policy = foodDeliveryActionPolicy(capability);
  return {
    accepted: false as const,
    executed: false as const,
    capability,
    requiresApproval: policy.requiresApproval,
    reason: policy.consequential
      ? "Spending, menu, store, and courier changes stay blocked until a certified partner adapter and an approved execution grant exist. Nothing was sent."
      : "Provider reads stay disabled until contracted country coverage and credentials exist. No provider was contacted.",
  };
}
