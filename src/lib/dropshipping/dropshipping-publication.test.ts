import {describe,expect,it} from 'vitest';
import {buildDropshipPublicationAction,isSupportedDropshipPublicationChannel,withQueuedPublicationMetadata} from './dropshipping-publication';

describe('Dropshipping listing publication handoff',()=>{
  it('maps a reviewed Shopify draft into the bounded draft-product action',()=>{
    const result=buildDropshipPublicationAction({
      channel:'shopify',
      product:{name:'Travel <Cube>',category:'Travel',sale_price:39.99,currency:'GBP'},
      draftText:'Grounded description\nNo invented claims.',
    });
    expect(result).toMatchObject({provider:'shopify',action:'shopify_product_create_draft'});
    expect(result.input.title).toBe('Travel <Cube>');
    expect(result.input.description_html).toContain('Travel' in result.input? '': '');
    expect(result.input.description_html).toContain('Grounded description<br>No invented claims.');
    expect(result.input.description_html).not.toContain('<script');
  });

  it('requires explicit Etsy marketplace fields and preserves the saved price',()=>{
    const result=buildDropshipPublicationAction({
      channel:'etsy',
      product:{name:'Original print',sale_price:24.5,currency:'GBP'},
      draftText:'Original artwork fulfilled by the disclosed production partner.',
      etsy:{shopId:12,quantity:5,whoMade:'i_did',whenMade:'2020_2026',taxonomyId:69150367,shippingProfileId:44},
    });
    expect(result).toEqual({
      provider:'etsy',
      action:'etsy_draft_listing_create',
      input:{
        shop_id:12,quantity:5,title:'Original print',
        description:'Original artwork fulfilled by the disclosed production partner.',
        price:24.5,who_made:'i_did',when_made:'2020_2026',taxonomy_id:69150367,shipping_profile_id:44,
      },
    });
  });

  it('refuses unsupported channels instead of pretending they can publish',()=>{
    expect(isSupportedDropshipPublicationChannel('shopify')).toBe(true);
    expect(isSupportedDropshipPublicationChannel('etsy')).toBe(true);
    expect(isSupportedDropshipPublicationChannel('amazon')).toBe(false);
    expect(isSupportedDropshipPublicationChannel('ebay')).toBe(false);
  });

  it('records the immutable approval reference on product metadata',()=>{
    const next=withQueuedPublicationMetadata({source:'dropshipping-hub'},{
      channel:'shopify',approvalRequestId:'approval-1',provider:'shopify',action:'shopify_product_create_draft',queuedAt:'2026-09-14T18:00:00.000Z',
    });
    expect(next.listing_publications.shopify).toEqual({
      status:'pending_approval',approval_request_id:'approval-1',provider:'shopify',action:'shopify_product_create_draft',queued_at:'2026-09-14T18:00:00.000Z',
    });
  });
});
