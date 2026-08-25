import { describe, expect, it } from "vitest";
import {
  isShopifyNangoAction,
  listShopifyNangoCapabilities,
} from "./shopify-nango-actions.server";

describe("bounded Shopify Nango capabilities", () => {
  it("exposes only the fixed store operations", () => {
    const capabilities = listShopifyNangoCapabilities();
    expect(capabilities.map((item) => item.action).sort()).toEqual([
      "shopify_orders_list",
      "shopify_product_create_draft",
      "shopify_product_get",
      "shopify_product_update",
      "shopify_products_list",
      "shopify_shop_get",
    ]);
    expect(capabilities.every((item) => item.provider === "shopify" && item.deployed)).toBe(true);
    expect(isShopifyNangoAction("shopify_product_update")).toBe(true);
    expect(isShopifyNangoAction("shopify_refund_order")).toBe(false);
    expect(isShopifyNangoAction("shopify_arbitrary_graphql")).toBe(false);
  });

  it("keeps reads autonomous and requires approval for catalogue mutations", () => {
    const byAction = new Map(listShopifyNangoCapabilities().map((item) => [item.action, item]));
    for (const action of [
      "shopify_shop_get",
      "shopify_products_list",
      "shopify_product_get",
      "shopify_orders_list",
    ]) {
      expect(byAction.get(action)?.risk).toBe("low");
      expect(byAction.get(action)?.requiresApproval).toBe(false);
    }
    for (const action of ["shopify_product_create_draft", "shopify_product_update"]) {
      expect(byAction.get(action)?.risk).toBe("medium");
      expect(byAction.get(action)?.requiresApproval).toBe(true);
    }
  });

  it("does not expose arbitrary URL, GraphQL, or credential fields", () => {
    for (const capability of listShopifyNangoCapabilities()) {
      const properties = (capability.inputSchema["properties"] ?? {}) as Record<string, unknown>;
      expect(properties).not.toHaveProperty("url");
      expect(properties).not.toHaveProperty("graphql");
      expect(properties).not.toHaveProperty("query_text");
      expect(properties).not.toHaveProperty("token");
      expect(properties).not.toHaveProperty("authorization");
      expect(capability.inputSchema["additionalProperties"]).toBe(false);
    }
  });

  it("only permits DRAFT or ACTIVE as product update status", () => {
    const capability = listShopifyNangoCapabilities().find(
      (item) => item.action === "shopify_product_update",
    );
    const properties = (capability?.inputSchema["properties"] ?? {}) as Record<string, any>;
    expect(properties.status.enum).toEqual(["DRAFT", "ACTIVE"]);
  });

  it("forces product creation through a draft-specific action", () => {
    const action = listShopifyNangoCapabilities().find(
      (item) => item.action === "shopify_product_create_draft",
    );
    expect(action?.requiresApproval).toBe(true);
    expect(action?.description.toLowerCase()).toContain("draft");
  });
});
