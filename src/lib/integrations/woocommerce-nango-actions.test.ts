import {describe,expect,it} from "vitest";
import {isWooCommerceNangoAction,listWooCommerceNangoCapabilities} from "./woocommerce-nango-actions.server";

describe("bounded WooCommerce Nango capabilities",()=>{
  it("exposes fixed REST API v3 product and order operations",()=>{
    const capabilities=listWooCommerceNangoCapabilities();
    expect(capabilities.map(item=>item.action).sort()).toEqual([
      "woocommerce_order_update",
      "woocommerce_orders_list",
      "woocommerce_product_create",
      "woocommerce_product_get",
      "woocommerce_product_update",
      "woocommerce_products_list",
    ]);
    expect(capabilities.every(item=>item.provider==="woocommerce"&&item.deployed)).toBe(true);
    expect(isWooCommerceNangoAction("woocommerce_product_update")).toBe(true);
    expect(isWooCommerceNangoAction("woocommerce_arbitrary_request")).toBe(false);
  });

  it("keeps reads autonomous and approval-gates mutations",()=>{
    const byAction=new Map(listWooCommerceNangoCapabilities().map(item=>[item.action,item]));
    for(const action of ["woocommerce_products_list","woocommerce_product_get","woocommerce_orders_list"]){
      expect(byAction.get(action)?.risk).toBe("low");
      expect(byAction.get(action)?.requiresApproval).toBe(false);
    }
    for(const action of ["woocommerce_product_create","woocommerce_product_update"]){
      expect(byAction.get(action)?.risk).toBe("medium");
      expect(byAction.get(action)?.requiresApproval).toBe(true);
    }
    expect(byAction.get("woocommerce_order_update")?.risk).toBe("high");
    expect(byAction.get("woocommerce_order_update")?.requiresApproval).toBe(true);
  });

  it("does not expose arbitrary URL or credential fields",()=>{
    for(const capability of listWooCommerceNangoCapabilities()){
      const properties=(capability.inputSchema["properties"]??{}) as Record<string,unknown>;
      expect(properties).not.toHaveProperty("url");
      expect(properties).not.toHaveProperty("token");
      expect(properties).not.toHaveProperty("authorization");
      expect(properties).not.toHaveProperty("consumer_key");
      expect(properties).not.toHaveProperty("consumer_secret");
      expect(capability.inputSchema["additionalProperties"]).toBe(false);
    }
  });
});
