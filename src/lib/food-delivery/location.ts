export type FoodDeliveryLocationInput = {
  countryCode?: string;
  deliveryAddress?: string;
  latitude?: number;
  longitude?: number;
  deviceLocationConsent?: boolean;
};

export type FoodDeliveryLocation = {
  countryCode: string;
  deliveryAddress?: string;
  coordinates?: { latitude: number; longitude: number };
  source: "device" | "manual_address" | "country_only";
};

const COUNTRY_CODE = /^[A-Z]{2}$/;

/**
 * Resolve only location the user explicitly supplied or consented to share.
 * Profile/coarse inferred location is intentionally not accepted here because it
 * is not a delivery address and must never silently drive an order.
 */
export function resolveFoodDeliveryLocation(input: FoodDeliveryLocationInput): FoodDeliveryLocation {
  const countryCode = String(input.countryCode ?? "").trim().toUpperCase();
  if (!COUNTRY_CODE.test(countryCode)) {
    throw new Error("A two-letter delivery country code is required");
  }

  const deliveryAddress = input.deliveryAddress?.trim();
  const hasLat = Number.isFinite(input.latitude);
  const hasLng = Number.isFinite(input.longitude);
  if (hasLat !== hasLng) throw new Error("Latitude and longitude must be supplied together");

  if (hasLat && hasLng) {
    if (!input.deviceLocationConsent) {
      throw new Error("Device location requires explicit user consent");
    }
    const latitude = Number(input.latitude);
    const longitude = Number(input.longitude);
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new Error("Invalid delivery coordinates");
    }
    return { countryCode, deliveryAddress, coordinates: { latitude, longitude }, source: "device" };
  }

  if (deliveryAddress) return { countryCode, deliveryAddress, source: "manual_address" };
  return { countryCode, source: "country_only" };
}

export function hasOrderableDeliveryDestination(location: FoodDeliveryLocation): boolean {
  return Boolean(location.deliveryAddress || location.coordinates);
}
