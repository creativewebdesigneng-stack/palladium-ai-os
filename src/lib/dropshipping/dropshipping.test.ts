import {describe,expect,it} from 'vitest';
import {assessChannelCompliance,buildDropshipStoreBrief,calculateOpportunityScore,calculateSupplierScore,calculateUnitEconomics,dropshipProjectSlug} from './dropshipping';

describe('Dropshipping Hub intelligence',()=>{
  it('scores product opportunities without treating risk as demand',()=>{
    const result=calculateOpportunityScore({demand:90,searchMomentum:86,competition:25,margin:82,shipping:75,supplierReliability:90,seasonality:70,returnRisk:15,complianceRisk:5});
    expect(result.score).toBeGreaterThan(70);
    expect(result.band).toBe('promising');
    const risky=calculateOpportunityScore({demand:90,searchMomentum:86,competition:25,margin:82,shipping:75,supplierReliability:90,seasonality:70,returnRisk:90,complianceRisk:100});
    expect(risky.score).toBeLessThan(result.score);
  });

  it('models full unit economics and margin',()=>{
    const result=calculateUnitEconomics({sellPrice:50,productCost:12,shippingCost:4,marketplaceFeePct:10,paymentFeePct:3,adCost:8,returnsReservePct:5,taxReservePct:2});
    expect(result.fees).toBe(6.5);
    expect(result.profit).toBe(16);
    expect(result.marginPct).toBe(32);
  });

  it('ranks supplier operational quality',()=>{
    expect(calculateSupplierScore({reliability:95,stockStability:90,shippingSpeed:80,quality:95,returns:80,landedCost:75}).band).toBe('preferred');
  });

  it('blocks eBay retailer arbitrage',()=>{
    const result=assessChannelCompliance({channel:'ebay',fulfilmentModel:'retailer-arbitrage'});
    expect(result.allowed).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/wholesale supplier/i);
  });

  it('blocks generic Etsy dropshipping and resale but allows original-design creator/POD flows',()=>{
    expect(assessChannelCompliance({channel:'etsy',fulfilmentModel:'wholesale-supplier'}).allowed).toBe(false);
    expect(assessChannelCompliance({channel:'etsy',fulfilmentModel:'owned-stock'}).allowed).toBe(false);
    expect(assessChannelCompliance({channel:'etsy',fulfilmentModel:'owned-stock',originalDesign:true}).allowed).toBe(true);
    expect(assessChannelCompliance({channel:'etsy',fulfilmentModel:'pod',originalDesign:true,productionPartnerDisclosed:true}).allowed).toBe(true);
  });

  it('blocks high-risk products across channels',()=>{
    expect(assessChannelCompliance({channel:'shopify',fulfilmentModel:'wholesale-supplier',restrictedProduct:true}).allowed).toBe(false);
    expect(assessChannelCompliance({channel:'amazon',fulfilmentModel:'wholesale-supplier',ipRisk:true}).allowed).toBe(false);
  });

  it('creates a bounded Website Studio handoff brief',()=>{
    const brief=buildDropshipStoreBrief({brandName:'North Star Goods',niche:'travel organisers',audience:'frequent flyers',products:['Packing Cubes','Cable Case'],channels:['blackstar-site','shopify']});
    expect(brief.source).toBe('dropshipping-hub');
    expect(brief.pages).toContain('Shipping & Delivery');
    expect(brief.products).toEqual(['Packing Cubes','Cable Case']);
    expect(dropshipProjectSlug('North Star Goods!')).toBe('north-star-goods');
  });
});
