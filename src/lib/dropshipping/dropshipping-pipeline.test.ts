import {describe,expect,it} from 'vitest';
import {buildDropshipCatalogPayload} from './dropshipping-pipeline';

const base={
  workspaceId:'11111111-1111-4111-8111-111111111111',
  name:'Compression Packing Cubes',
  currency:'GBP',
  channel:'shopify' as const,
  fulfilmentModel:'wholesale-supplier' as const,
  stage:'validated' as const,
  sellPrice:39.99,
  productCost:9,
  shippingCost:4,
  marketplaceFeePct:10,
  paymentFeePct:3,
  adCost:7,
  returnsReservePct:5,
  taxReservePct:0,
};

describe('dropshipping durable product pipeline',()=>{
  it('stores supplier-managed catalog items with economics and evidence snapshots',()=>{
    const payload=buildDropshipCatalogPayload({...base,evidenceUrl:'https://example.com/research',evidenceNotes:'Verified against current supplier page.',opportunityScore:82,supplierScore:91});
    expect(payload.track_inventory).toBe(false);
    expect(payload.active).toBe(true);
    expect(payload.metadata.source).toBe('dropshipping-hub');
    expect(payload.metadata.inventory_model).toBe('supplier-managed');
    expect(payload.metadata.lifecycle_stage).toBe('validated');
    expect(payload.metadata.opportunity_score).toBe(82);
    expect(payload.metadata.supplier_score).toBe(91);
    expect(payload.metadata.evidence.url).toBe('https://example.com/research');
    expect(payload.metadata.unit_economics.marginPct).toBeGreaterThan(0);
  });

  it('preserves connected provider provenance without credentials',()=>{
    const payload=buildDropshipCatalogPayload({...base,sourceProvider:'shopify',sourceAction:'shopify_products_list',sourceItemId:'gid://shopify/Product/42'});
    expect(payload.metadata.connected_source).toEqual({provider:'shopify',action:'shopify_products_list',item_id:'gid://shopify/Product/42'});
  });

  it('forces policy-blocked products inactive even when the requested stage is validated',()=>{
    const payload=buildDropshipCatalogPayload({...base,channel:'ebay',fulfilmentModel:'retailer-arbitrage'});
    expect(payload.metadata.lifecycle_stage).toBe('blocked');
    expect(payload.metadata.compliance.allowed).toBe(false);
    expect(payload.active).toBe(false);
  });

  it('allows eligible original-design Etsy POD candidates',()=>{
    const payload=buildDropshipCatalogPayload({...base,channel:'etsy',fulfilmentModel:'pod',originalDesign:true,productionPartnerDisclosed:true});
    expect(payload.metadata.compliance.allowed).toBe(true);
    expect(payload.metadata.lifecycle_stage).toBe('validated');
  });

  it('rejects non-http evidence URLs',()=>{
    expect(()=>buildDropshipCatalogPayload({...base,evidenceUrl:'javascript:alert(1)'})).toThrow(/http or https/i);
  });

  it('clamps manually captured scores without changing economics',()=>{
    const payload=buildDropshipCatalogPayload({...base,opportunityScore:140,supplierScore:-20});
    expect(payload.metadata.opportunity_score).toBe(100);
    expect(payload.metadata.supplier_score).toBe(0);
    expect(payload.cost_price).toBe(9);
    expect(payload.sale_price).toBe(39.99);
  });
});
