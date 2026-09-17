import { describe, expect, it } from "vitest";
import { hasOrderableDeliveryDestination, resolveFoodDeliveryLocation } from "../location";

describe("food delivery location", () => {
  it("uses a manually supplied delivery address without device location", () => {
    const location = resolveFoodDeliveryLocation({ countryCode: "gb", deliveryAddress: "10 High Street" });
    expect(location).toEqual({ countryCode: "GB", deliveryAddress: "10 High Street", source: "manual_address" });
    expect(hasOrderableDeliveryDestination(location)).toBe(true);
  });

  it("requires explicit consent before using device coordinates", () => {
    expect(() => resolveFoodDeliveryLocation({ countryCode: "GB", latitude: 50.37, longitude: -4.14 }))
      .toThrow("explicit user consent");
  });

  it("accepts consented coordinates and validates their range", () => {
    const location = resolveFoodDeliveryLocation({
      countryCode: "GB",
      latitude: 50.37,
      longitude: -4.14,
      deviceLocationConsent: true,
    });
    expect(location.source).toBe("device");
    expect(location.coordinates).toEqual({ latitude: 50.37, longitude: -4.14 });
    expect(() => resolveFoodDeliveryLocation({
      countryCode: "GB",
      latitude: 100,
      longitude: 0,
      deviceLocationConsent: true,
    })).toThrow("Invalid delivery coordinates");
  });

  it("allows country-only discovery but does not treat it as an order destination", () => {
    const location = resolveFoodDeliveryLocation({ countryCode: "US" });
    expect(location.source).toBe("country_only");
    expect(hasOrderableDeliveryDestination(location)).toBe(false);
  });
});
