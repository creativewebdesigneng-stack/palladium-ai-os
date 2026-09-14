import {describe,expect,it} from 'vitest';
import {buildFulfilmentCapabilityRows,orderHasDropshipProduct,orderLineItemIds,providerCanFulfilDropship} from './dropshipping-fulfilment';

describe('Dropshipping fulfilment execution helpers',()=>{
  it('recognises supplier and shipping providers only',()=>{
    expect(providerCanFulfilDropship('printful')).toBe(true);
    expect(providerCanFulfilDropship('nango_shippo')).toBe(true);
    expect(providerCanFulfilDropship('shopify')).toBe(false);
  });

  it('extracts authoritative catalog IDs from order line items',()=>{
    expect(orderLineItemIds({line_items:[{item_id:'a'},{catalog_item_id:'b'},{product_id:'a'},{}]})).toEqual(['a','b']);
  });

  it('links orders only when a line item belongs to a dropshipping catalog product',()=>{
    const catalog=[{id:'a',metadata:{source:'dropshipping-hub'}},{id:'b',metadata:{source:'retail'}}];
    expect(orderHasDropshipProduct({line_items:[{item_id:'a'}]},catalog)).toBe(true);
    expect(orderHasDropshipProduct({line_items:[{item_id:'b'}]},catalog)).toBe(false);
    expect(orderHasDropshipProduct({line_items:[]},catalog)).toBe(false);
  });

  it('filters capability rows to deployed supplier/shipping execution lanes',()=>{
    const rows=buildFulfilmentCapabilityRows([
      {provider:'printful',action:'create_order',description:'Create order',risk:'high',requiresApproval:true,deployed:true,transport:'nango',lane:'connector_transport'},
      {provider:'shopify',action:'create_fulfilment',description:'Shopify',risk:'high',requiresApproval:true,deployed:true,transport:'native_shopify',lane:'direct_api'},
      {provider:'shippo',action:'create_label',description:'Label',risk:'high',requiresApproval:true,deployed:false,transport:'nango',lane:'connector_transport'},
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.provider).toBe('printful');
  });
});
