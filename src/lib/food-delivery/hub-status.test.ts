import { describe, expect, it } from "vitest";
import { FOOD_DELIVERY_PROVIDERS, providersForRegion } from "./registry";
import {
  buildFoodDeliveryHubStatus,
  foodDeliveryCredentialPresence,
  refuseFoodDeliverySideEffect,
} from "./hub-status";

describe("food delivery hub status", () => {
  it("does not treat undeclared country coverage as worldwide", () => {
    expect(FOOD_DELIVERY_PROVIDERS.every((provider) => provider.countryCodes.length === 0)).toBe(
      true,
    );
    expect(providersForRegion({ countryCode: "gb" })).toEqual([]);
  });

  it("lists registered adapters as non-executing and does not contact them", () => {
    const status = buildFoodDeliveryHubStatus({
      countryCode: "gb",
      deliveryAddress: "10 High Street",
      credentialPresence: { "uber-eats": true },
    });
    expect(status.placesOrders).toBe(false);
    expect(status.contactsProviders).toBe(false);
    expect(status.orderableDestination).toBe(true);
    expect(status.providers.map((provider) => provider.id)).toEqual([
      "uber-eats",
      "deliveroo",
      "just-eat",
    ]);
    expect(status.providers.every((provider) => provider.executable === false)).toBe(true);
    expect(status.providers.every((provider) => provider.geographicallyEligible === false)).toBe(
      true,
    );
    expect(status.providers[0]?.credentialsConfigured).toBe(true);
    expect(status.providers[1]?.credentialsConfigured).toBe(false);
  });

  it("reports credential presence without returning secret values", () => {
    const presence = foodDeliveryCredentialPresence({
      UBER_EATS_CLIENT_ID: "synthetic-id",
      UBER_EATS_CLIENT_SECRET: "synthetic-secret",
      DELIVEROO_CLIENT_ID: "only-one",
    });
    expect(presence["uber-eats"]).toBe(true);
    expect(presence.deliveroo).toBe(false);
    expect(JSON.stringify(presence)).not.toContain("synthetic");
  });

  it("refuses orders and reads without provider contact", () => {
    expect(refuseFoodDeliverySideEffect("consumer.order_create")).toMatchObject({
      accepted: false,
      executed: false,
    });
    expect(refuseFoodDeliverySideEffect("consumer.menu_read").reason).toContain(
      "No provider was contacted",
    );
  });
});
