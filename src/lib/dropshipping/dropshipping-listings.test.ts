import {describe,expect,it} from 'vitest';
import {assessDropshippingPublicationReadiness,buildDropshippingActionInputTemplate,buildListingDraftPrompt,isDropshipProductBlocked,isDropshippingListingWriteAction,withListingDraftMetadata} from './dropshipping-listings';

const item={
  name:'Compression Packing Cubes',sku:'TRAVEL-01',category:'Travel accessories',description:'Validated candidate from supplier research.',sale_price:39.99,currency:'GBP',
  metadata:{source:'dropshipping-hub',channel:'shopify',fulfilment_model:'wholesale-supplier',opportunity_score:82,supplier_score:91,evidence:{url:'https://example.com/source',notes:'Observed supplier page.'},compliance:{allowed:true,status:'eligible'},unit_economics:{marginPct:32}},
};

describe('dropshipping listing drafts',()=>{
  it('builds a grounded internal-only listing prompt within the assistant input budget',()=>{
    const prompt=buildListingDraftPrompt({...item,description:'x'.repeat(12000)},'shopify','en-GB','Tone: concise.');
    expect(prompt).toMatch(/INTERNAL DRAFT/);
    expect(prompt).toContain('Compression Packing Cubes');
    expect(prompt).toContain('https://example.com/source');
    expect(prompt).toMatch(/Do not invent sales volume/);
    expect(prompt).toMatch(/human approval/i);
    expect(prompt.length).toBeLessThanOrEqual(3900);
  });

  it('blocks listing generation when a product is compliance-blocked or rejected',()=>{
    const blocked={...item,metadata:{...item.metadata,lifecycle_stage:'blocked',compliance:{allowed:false,status:'blocked'}}};
    const rejected={...item,metadata:{...item.metadata,lifecycle_stage:'rejected'}};
    expect(isDropshipProductBlocked(blocked)).toBe(true);
    expect(isDropshipProductBlocked(rejected)).toBe(true);
    expect(()=>buildListingDraftPrompt(blocked,'ebay')).toThrow(/Blocked or rejected products/i);
  });

  it('preserves existing metadata and channel drafts when saving a new draft',()=>{
    const first=withListingDraftMetadata(item.metadata,{channel:'shopify',text:'Shopify draft',provider:'groq',model:'model-a',generatedAt:'2026-09-14T16:00:00.000Z'});
    const second=withListingDraftMetadata(first,{channel:'ebay',text:'eBay draft',provider:'groq',model:'model-a',generatedAt:'2026-09-14T16:01:00.000Z'});
    const shopifyDraft=second.listing_drafts['shopify'];
    const ebayDraft=second.listing_drafts['ebay'];
    expect(second['source']).toBe('dropshipping-hub');
    expect(shopifyDraft?.text).toBe('Shopify draft');
    expect(ebayDraft?.text).toBe('eBay draft');
    expect(ebayDraft?.requires_approval).toBe(true);
  });

  it('seeds only known marketplace action fields from persisted product evidence',()=>{
    const template=buildDropshippingActionInputTemplate({properties:{title:{type:'string'},description:{type:'string'},sku:{type:'string'},price:{type:'number'},currency:{type:'string'},unknown:{type:'string'}}},item,'Approved draft copy');
    expect(template).toEqual({title:'Compression Packing Cubes',description:'Approved draft copy',sku:'TRAVEL-01',price:39.99,currency:'GBP'});
    expect(template).not.toHaveProperty('unknown');
  });

  it('caps stored generated text',()=>{
    const metadata=withListingDraftMetadata({}, {channel:'shopify',text:'x'.repeat(20000)});
    expect(metadata.listing_drafts['shopify']?.text).toHaveLength(16000);
  });

  it('requires validated testing state, explicit compliance and matching channel before publication approval',()=>{
    const validated={...item,metadata:{...item.metadata,lifecycle_stage:'validated'}};
    expect(assessDropshippingPublicationReadiness(validated,'shopify')).toMatchObject({ready:true,status:'ready'});

    expect(assessDropshippingPublicationReadiness({...validated,metadata:{...validated.metadata,lifecycle_stage:'researching'}},'shopify')).toMatchObject({ready:false,status:'needs-validation'});
    expect(assessDropshippingPublicationReadiness({...validated,metadata:{...validated.metadata,compliance:{status:'unknown'}}},'shopify')).toMatchObject({ready:false,status:'needs-compliance'});
    expect(assessDropshippingPublicationReadiness(validated,'etsy')).toMatchObject({ready:false,status:'channel-mismatch'});
  });

  it('admits listing/product/offer writes but rejects unrelated commerce mutations',()=>{
    for(const action of ['shopify_product_create_draft','etsy_listing_update','ebay_offer_publish','woocommerce_product_update']){
      expect(isDropshippingListingWriteAction(action)).toBe(true);
    }
    for(const action of ['woocommerce_order_update','shopify_fulfillment_create','etsy_shop_receipts_update','ebay_orders_list']){
      expect(isDropshippingListingWriteAction(action)).toBe(false);
    }
  });
});
