import { describe, expect, it } from "vitest";
import {
  isEtsyNangoAction,
  listEtsyNangoCapabilities,
} from "./etsy-nango-actions.server";
import { classifyNangoActionRisk } from "./nango-capabilities.server";

describe("bounded Etsy Nango capabilities", () => {
  it("exposes only the fixed seller operations", () => {
    const capabilities = listEtsyNangoCapabilities();
    expect(capabilities.map((item) => item.action).sort()).toEqual([
      "etsy_draft_listing_create",
      "etsy_listing_get",
      "etsy_listing_inventory_update",
      "etsy_listing_update",
      "etsy_shop_listings_list",
      "etsy_shop_receipts_list",
    ]);
    expect(capabilities.every((item) => item.provider === "etsy" && item.deployed)).toBe(true);
    expect(isEtsyNangoAction("etsy_listing_update")).toBe(true);
    expect(isEtsyNangoAction("etsy_arbitrary_proxy_request")).toBe(false);
  });

  it("allows reads autonomously but requires approval for every mutation", () => {
    const byAction = new Map(listEtsyNangoCapabilities().map((item) => [item.action, item]));

    for (const action of [
      "etsy_shop_listings_list",
      "etsy_listing_get",
      "etsy_shop_receipts_list",
    ]) {
      expect(byAction.get(action)?.risk).toBe("low");
      expect(byAction.get(action)?.requiresApproval).toBe(false);
    }

    for (const action of [
      "etsy_draft_listing_create",
      "etsy_listing_update",
      "etsy_listing_inventory_update",
    ]) {
      expect(byAction.get(action)?.risk).toBe("medium");
      expect(byAction.get(action)?.requiresApproval).toBe(true);
    }
  });

  it("does not allow arbitrary URL or credential fields in Etsy schemas", () => {
    for (const capability of listEtsyNangoCapabilities()) {
      const properties = (capability.inputSchema["properties"] ?? {}) as Record<string, unknown>;
      expect(properties).not.toHaveProperty("url");
      expect(properties).not.toHaveProperty("token");
      expect(properties).not.toHaveProperty("authorization");
      expect(capability.inputSchema["additionalProperties"]).toBe(false);
    }
  });
});

describe("Shopify Nango action safety classification", () => {
  it("requires approval for writes and high-risk destructive commerce actions", () => {
    expect(classifyNangoActionRisk("create-product")).toBe("medium");
    expect(classifyNangoActionRisk("update-product")).toBe("medium");
    expect(classifyNangoActionRisk("cancel-order")).toBe("high");
    expect(classifyNangoActionRisk("create-refund")).toBe("high");
  });

  it("keeps read-only Shopify actions autonomous", () => {
    expect(classifyNangoActionRisk("list-products")).toBe("low");
    expect(classifyNangoActionRisk("get-order")).toBe("low");
  });
});
