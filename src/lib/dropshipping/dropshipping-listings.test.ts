import {describe,expect,it} from 'vitest';
import {buildListingDraftPrompt,isDropshipProductBlocked,withListingDraftMetadata} from './dropshipping-listings';

const item={
  name:'Compression Packing Cubes',sku:'TRAVEL-01',category:'Travel accessories',description:'Validated candidate from supplier research.',sale_price:39.99,currency:'GBP',
  metadata:{source:'dropshipping-hub',channel:'shopify',fulfilment_model:'wholesale-supplier',opportunity_score:82,supplier_score:91,evidence:{url:'https://example.com/source',notes:'Observed supplier page.'},compliance:{allowed:true,status:'eligible'},unit_economics:{marginPct:32}},
};

describe('dropshipping listing drafts',()=>{
  it('builds a grounded internal-only listing prompt from persisted evidence',()=>{
    const prompt=buildListingDraftPrompt(item,'shopify','en-GB','Tone: concise.');
    expect(prompt).toMatch(/INTERNAL DRAFT/);
    expect(prompt).toContain('Compression Packing Cubes');
    expect(prompt).toContain('https://example.com/source');
    expect(prompt).toMatch(/Do not invent sales volume/);
    expect(prompt).toMatch(/human approval/i);
  });

  it('blocks listing generation when persisted compliance says the product is blocked',()=>{
    const blocked={...item,metadata:{...item.metadata,lifecycle_stage:'blocked',compliance:{allowed:false,status:'blocked'}}};
    expect(isDropshipProductBlocked(blocked)).toBe(true);
    expect(()=>buildListingDraftPrompt(blocked,'ebay')).toThrow(/Blocked products/i);
  });

  it('preserves existing metadata and channel drafts when saving a new draft',()=>{
    const first=withListingDraftMetadata(item.metadata,{channel:'shopify',text:'Shopify draft',provider:'groq',model:'model-a',generatedAt:'2026-09-14T16:00:00.000Z'});
    const second=withListingDraftMetadata(first,{channel:'ebay',text:'eBay draft',provider:'groq',model:'model-a',generatedAt:'2026-09-14T16:01:00.000Z'});
    expect(second.source).toBe('dropshipping-hub');
    expect(second.listing_drafts.shopify.text).toBe('Shopify draft');
    expect(second.listing_drafts.ebay.text).toBe('eBay draft');
    expect(second.listing_drafts.ebay.requires_approval).toBe(true);
  });

  it('caps stored generated text',()=>{
    const metadata=withListingDraftMetadata({}, {channel:'shopify',text:'x'.repeat(20000)});
    expect(metadata.listing_drafts.shopify.text).toHaveLength(16000);
  });
});
