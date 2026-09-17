import {describe,expect,it} from "vitest";
import {isEbayNangoAction,listEbayNangoCapabilities} from "./ebay-nango-actions.server";

describe("bounded eBay Nango capabilities",()=>{
  it("exposes only fixed seller operations",()=>{
    const capabilities=listEbayNangoCapabilities();
    expect(capabilities.map(item=>item.action).sort()).toEqual([
      "ebay_inventory_item_get",
      "ebay_inventory_item_put",
      "ebay_inventory_items_list",
      "ebay_offer_create",
      "ebay_offer_publish",
      "ebay_orders_list",
    ]);
    expect(capabilities.every(item=>item.provider==="ebay"&&item.deployed)).toBe(true);
    expect(isEbayNangoAction("ebay_offer_publish")).toBe(true);
    expect(isEbayNangoAction("ebay_arbitrary_proxy_request")).toBe(false);
  });

  it("keeps reads autonomous and gates seller writes",()=>{
    const byAction=new Map(listEbayNangoCapabilities().map(item=>[item.action,item]));
    for(const action of ["ebay_inventory_items_list","ebay_inventory_item_get","ebay_orders_list"]){
      expect(byAction.get(action)?.risk).toBe("low");
      expect(byAction.get(action)?.requiresApproval).toBe(false);
    }
    for(const action of ["ebay_inventory_item_put","ebay_offer_create"]){
      expect(byAction.get(action)?.risk).toBe("medium");
      expect(byAction.get(action)?.requiresApproval).toBe(true);
    }
    expect(byAction.get("ebay_offer_publish")?.risk).toBe("high");
    expect(byAction.get("ebay_offer_publish")?.requiresApproval).toBe(true);
  });

  it("never exposes arbitrary URL or credentials in the action schemas",()=>{
    for(const capability of listEbayNangoCapabilities()){
      const properties=(capability.inputSchema["properties"]??{}) as Record<string,unknown>;
      expect(properties).not.toHaveProperty("url");
      expect(properties).not.toHaveProperty("token");
      expect(properties).not.toHaveProperty("authorization");
      expect(properties).not.toHaveProperty("api_key");
      expect(capability.inputSchema["additionalProperties"]).toBe(false);
    }
  });
});
