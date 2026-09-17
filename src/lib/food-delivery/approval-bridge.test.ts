import { describe, expect, it } from "vitest";
import {
  buildFoodDeliveryApprovalDetails,
  isFoodDeliveryApprovalDetails,
} from "./approval-bridge";

describe("food delivery approval bridge", () => {
  it("pins provider, action, input and transport for consequential actions", () => {
    const details = buildFoodDeliveryApprovalDetails({
      request: {
        requestId: "req-1",
        providerId: "uber-eats",
        connectionId: "conn-1",
        capability: "consumer.order_create",
        input: { basket_id: "basket-1", total_minor: 2599 },
      },
      transport: "direct_oauth",
    });

    expect(details).toEqual({
      provider: "uber-eats",
      action: "consumer.order_create",
      input: { basket_id: "basket-1", total_minor: 2599 },
      transport: "direct_oauth",
      domain: "food_delivery",
      connection_id: "conn-1",
      request_id: "req-1",
    });
    expect(isFoodDeliveryApprovalDetails(details)).toBe(true);
  });

  it("rejects read-only capabilities from the approval path", () => {
    expect(() => buildFoodDeliveryApprovalDetails({
      request: {
        requestId: "req-2",
        providerId: "deliveroo",
        connectionId: "conn-2",
        capability: "consumer.menu_read",
        input: { restaurant_id: "restaurant-1" },
      },
      transport: "direct_oauth",
    })).toThrow("does not require approval");
  });

  it("requires object input and a pinned transport", () => {
    expect(() => buildFoodDeliveryApprovalDetails({
      request: {
        requestId: "req-3",
        providerId: "deliveroo",
        connectionId: "conn-3",
        capability: "merchant.order_accept",
        input: "order-1",
      },
      transport: "direct_oauth",
    })).toThrow("must be an object");

    expect(() => buildFoodDeliveryApprovalDetails({
      request: {
        requestId: "req-4",
        providerId: "deliveroo",
        connectionId: "conn-4",
        capability: "merchant.order_accept",
        input: { order_id: "order-1" },
      },
      transport: "   ",
    })).toThrow("transport is required");
  });
});
