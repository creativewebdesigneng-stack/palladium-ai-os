import {describe,expect,it} from 'vitest';
import {buildDropshipFulfilmentTemplate,dropshipOrderCatalogIds,isDropshipSupplierProvider} from './dropshipping-fulfilment';

describe('dropshipping fulfilment',()=>{
  it('only recognises allowlisted supplier and shipping providers',()=>{
    expect(isDropshipSupplierProvider('printful')).toBe(true);
    expect(isDropshipSupplierProvider('nango_cjdropshipping')).toBe(true);
    expect(isDropshipSupplierProvider('shopify')).toBe(false);
  });

  it('builds a bounded order handoff template without inventing provider fields',()=>{
    const template=buildDropshipFulfilmentTemplate({id:'order-1',order_number:'DS-1',currency:'GBP',total:49.99,line_items:[{item_id:'item-1',quantity:2}],shipping_address:{city:'London'}});
    expect(template.order_number).toBe('DS-1');
    expect(template.line_items).toHaveLength(1);
    expect(template.shipping_address).toEqual({city:'London'});
  });

  it('extracts unique catalog ids from supported retail line-item shapes',()=>{
    expect(dropshipOrderCatalogIds({line_items:[{item_id:'a'},{catalog_item_id:'b'},{item_id:'a'}]})).toEqual(['a','b']);
  });
});
