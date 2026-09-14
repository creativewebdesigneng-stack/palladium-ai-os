import {describe,expect,it} from 'vitest';
import {assertDropshippingListingPublishable,buildEtsyDraftListingInput,buildShopifyDraftProductInput,listingActionForChannel,listingDraftSections} from './dropshipping-listing-actions';

const draft={channel:'shopify' as const,status:'draft' as const,generated_at:'2026-09-14T12:00:00Z',requires_approval:true as const,text:'## Title\nTravel Cubes Pro\n\n## Description\nOrganise carry-on luggage.\n\n## SEO/search phrases\npacking cubes'};
const item={name:'Travel Cubes',category:'Travel',sale_price:29.99,currency:'GBP',metadata:{source:'dropshipping-hub',channel:'shopify',fulfilment_model:'wholesale-supplier',lifecycle_stage:'validated',compliance:{allowed:true,checked_at:'2026-09-14T11:00:00Z'}}};

describe('governed dropshipping listing actions',()=>{
  it('parses bounded listing sections and binds Shopify draft creation to saved content',()=>{
    expect(listingDraftSections(draft.text)['title']).toBe('Travel Cubes Pro');
    expect(buildShopifyDraftProductInput(item,draft)).toEqual({title:'Travel Cubes Pro',description_html:'<p>Organise carry-on luggage.</p>',product_type:'Travel'});
    expect(listingActionForChannel(item,'shopify',draft).action).toBe('shopify_product_create_draft');
  });

  it('requires the persisted compliance decision to match the target channel',()=>{
    expect(()=>assertDropshippingListingPublishable(item,'shopify',draft)).not.toThrow();
    expect(()=>assertDropshippingListingPublishable(item,'etsy',{...draft,channel:'etsy'})).toThrow(/compliance-validated for shopify/i);
    expect(()=>assertDropshippingListingPublishable({...item,metadata:{...item.metadata,compliance:{allowed:false}}},'shopify',draft)).toThrow(/compliance block/i);
  });

  it('builds Etsy draft inputs from server-owned copy and price plus bounded operator IDs',()=>{
    const etsyDraft={...draft,channel:'etsy' as const};
    const etsyItem={...item,metadata:{...item.metadata,channel:'etsy',fulfilment_model:'pod'}};
    const input=buildEtsyDraftListingInput(etsyItem,etsyDraft,{shop_id:123,quantity:4,who_made:'someone_else',when_made:'2020_2026',taxonomy_id:456,shipping_profile_id:789});
    expect(input.title).toBe('Travel Cubes Pro');
    expect(input.price).toBe(29.99);
    expect(input.shop_id).toBe(123);
    expect(input.shipping_profile_id).toBe(789);
  });

  it('does not claim unsupported channels have a bounded listing writer',()=>{
    expect(()=>listingActionForChannel(item,'amazon',draft)).toThrow(/does not yet advertise/i);
  });
});
