import {describe,expect,it} from 'vitest';
import {buildDropshippingReadiness,buildDropshippingTargetReadiness,DROPSHIP_CHANNEL_TARGETS} from './dropshipping-readiness';

const cap=(provider:string,action:string,overrides={})=>({provider,action,description:action,risk:'low' as const,requiresApproval:false,deployed:true,transport:'nango',lane:'connector_transport',...overrides});

describe('Dropshipping connection readiness',()=>{
  it('keeps Website Studio native without pretending external stores are connected',()=>{
    const result=buildDropshippingReadiness([]);
    expect(result.channels.find(row=>row.id==='blackstar-site')?.status).toBe('native');
    expect(result.channels.find(row=>row.id==='shopify')?.status).toBe('needs_connection');
    expect(result.channels.find(row=>row.id==='amazon')?.status).toBe('needs_connection');
  });

  it('maps provider aliases to the correct marketplace',()=>{
    const result=buildDropshippingReadiness([cap('amazon_seller','orders_list'),cap('nango_etsy','etsy_shop_listings_list')]);
    expect(result.channels.find(row=>row.id==='amazon')?.executable).toBe(true);
    expect(result.channels.find(row=>row.id==='etsy')?.providerIds).toEqual(['etsy']);
  });

  it('distinguishes undeployed configuration from executable actions',()=>{
    const shopify=DROPSHIP_CHANNEL_TARGETS.find(row=>row.id==='shopify')!;
    const configured=buildDropshippingTargetReadiness(shopify,[cap('shopify','future_action',{deployed:false})]);
    expect(configured.status).toBe('configured');
    expect(configured.executable).toBe(false);
  });

  it('counts read and approval-gated actions separately',()=>{
    const result=buildDropshippingReadiness([
      cap('shopify','shopify_products_list'),
      cap('shopify','shopify_product_create',{risk:'medium',requiresApproval:true}),
      cap('etsy','etsy_listing_update',{risk:'medium',requiresApproval:true}),
    ]);
    const shopify=result.channels.find(row=>row.id==='shopify');
    expect(shopify?.readActions).toBe(1);
    expect(shopify?.governedActions).toBe(1);
    expect(result.summary.governedActions).toBe(2);
  });

  it('does not confuse TikTok social capabilities with TikTok Shop',()=>{
    const result=buildDropshippingReadiness([cap('tiktok','publish_photo')]);
    expect(result.channels.find(row=>row.id==='tiktok-shop')?.status).toBe('needs_connection');
  });
});
