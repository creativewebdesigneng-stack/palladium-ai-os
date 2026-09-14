import {describe,expect,it} from 'vitest';
import {assertNoCatalogCredentials,buildCatalogReadInputTemplate,extractDropshippingCatalogCandidates,isDropshippingCatalogReadCapability} from './dropshipping-catalog';

describe('Dropshipping connected catalog',()=>{
  it('allows only deployed low-risk approval-free catalog reads',()=>{
    expect(isDropshippingCatalogReadCapability({provider:'shopify',action:'shopify_products_list',risk:'low',requiresApproval:false,deployed:true})).toBe(true);
    expect(isDropshippingCatalogReadCapability({provider:'shopify',action:'shopify_orders_list',risk:'low',requiresApproval:false,deployed:true})).toBe(false);
    expect(isDropshippingCatalogReadCapability({provider:'etsy',action:'etsy_listing_update',risk:'medium',requiresApproval:true,deployed:true})).toBe(false);
  });
  it('builds bounded required input templates',()=>{
    expect(buildCatalogReadInputTemplate({type:'object',required:['shop_id'],properties:{shop_id:{type:'integer'},limit:{type:'integer',maximum:100},flag:{type:'boolean'}}})).toEqual({shop_id:1,limit:25,flag:false});
  });
  it('normalises nested Shopify-style product nodes',()=>{
    const items=extractDropshippingCatalogCandidates({data:{products:{nodes:[{id:'gid://shopify/Product/1',title:'Packing Cubes',vendor:'North',productType:'Travel',totalInventory:8}]}}});
    expect(items[0]).toMatchObject({name:'Packing Cubes',vendor:'North',category:'Travel',inventory:8});
  });
  it('normalises Etsy-like listings',()=>{
    const items=extractDropshippingCatalogCandidates({results:[{listing_id:42,title:'Original Poster',price:{amount:24,currency_code:'GBP'},quantity:5}]});
    expect(items[0]?.name).toBe('Original Poster'); expect(items[0]?.inventory).toBe(5);
  });
  it('rejects credential-shaped catalog input',()=>{
    expect(()=>assertNoCatalogCredentials({query:'travel',api_key:'nope'})).toThrow(/Credentials belong/i);
  });
});
