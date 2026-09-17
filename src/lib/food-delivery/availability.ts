import type {
  FoodDeliveryCapability,
  FoodDeliveryConnection,
  FoodDeliveryProviderManifest,
  FoodDeliveryRegion,
} from "./contracts";

export type FoodDeliveryProviderAvailability = {
  provider: FoodDeliveryProviderManifest;
  connection?: FoodDeliveryConnection;
  geographicallyEligible: boolean;
  connected: boolean;
  productionReady: boolean;
  executableCapabilities: readonly FoodDeliveryCapability[];
  state: "ready" | "sandbox" | "needs_connection" | "needs_access" | "unsupported_region";
};

function supportsRegion(provider: FoodDeliveryProviderManifest, region: FoodDeliveryRegion): boolean {
  const countryCode = region.countryCode.trim().toUpperCase();
  if (!countryCode || provider.countryCodes.length === 0) return false;
  return provider.countryCodes.some((code) => code.toUpperCase() === countryCode);
}

export function resolveFoodDeliveryProviderAvailability(input: {
  region: FoodDeliveryRegion;
  providers: readonly FoodDeliveryProviderManifest[];
  connections: readonly FoodDeliveryConnection[];
}): FoodDeliveryProviderAvailability[] {
  return input.providers.map((provider) => {
    const geographicallyEligible = supportsRegion(provider, input.region);
    const connection = input.connections.find(
      (candidate) => candidate.providerId === provider.id && candidate.environment === provider.environment,
    );
    const connected = connection?.status === "connected";
    const granted = new Set(connection?.grantedCapabilities ?? []);
    const executableCapabilities = connected && geographicallyEligible
      ? provider.capabilities.filter((capability) => granted.has(capability))
      : [];

    let state: FoodDeliveryProviderAvailability["state"];
    if (!geographicallyEligible) state = "unsupported_region";
    else if (connection?.status === "needs_access") state = "needs_access";
    else if (!connected) state = "needs_connection";
    else if (!provider.productionReady || provider.environment !== "production") state = "sandbox";
    else state = "ready";

    return {
      provider,
      ...(connection ? { connection } : {}),
      geographicallyEligible,
      connected,
      productionReady: provider.productionReady && provider.environment === "production",
      executableCapabilities,
      state,
    };
  });
}

export function assertFoodDeliveryExecutionAvailable(
  availability: FoodDeliveryProviderAvailability,
  capability: FoodDeliveryCapability,
): void {
  if (!availability.geographicallyEligible) throw new Error("Food delivery provider is not supported in this delivery region.");
  if (!availability.connected) throw new Error("Food delivery provider is not connected.");
  if (!availability.executableCapabilities.includes(capability)) {
    throw new Error(`Food delivery capability is not granted: ${capability}`);
  }
}
