import {describe,expect,it} from 'vitest';
import {buildDropshippingControlTower,extractDropshipOrderItemIds,isDropshipCatalogItem} from './dropshipping-control-tower';

const now=Date.parse('2026-09-14T12:00:00Z');

describe('Dropshipping operations control tower',()=>{
  it('recognises persisted dropshipping products and order item ids',()=>{
    expect(isDropshipCatalogItem({metadata:{source:'dropshipping-hub'}})).toBe(true);
    expect(isDropshipCatalogItem({metadata:{source:'retail-hub'}})).toBe(false);
    expect(extractDropshipOrderItemIds({line_items:[{item_id:'a'},{catalog_item_id:'b'},{product_id:'c'}]})).toEqual(['a','b','c']);
  });

  it('keeps non-dropship marketplace orders separate from linked operations',()=>{
    const result=buildDropshippingControlTower({now,catalog:[{id:'p1',name:'Packing Cubes',supplier_id:'s1',metadata:{source:'dropshipping-hub'}},{id:'p2',name:'Retail Item',metadata:{source:'retail-hub'}}],orders:[
      {id:'o1',order_number:'DS-1',channel:'marketplace',status:'open',payment_status:'paid',fulfilment_status:'unfulfilled',placed_at:'2026-09-10T12:00:00Z',total:50,line_items:[{item_id:'p1'}]},
      {id:'o2',order_number:'R-1',channel:'marketplace',status:'open',fulfilment_status:'unfulfilled',placed_at:'2026-09-14T10:00:00Z',line_items:[{item_id:'p2'}]},
    ]});
    expect(result.metrics.linkedOrders).toBe(1);
    expect(result.metrics.unlinkedMarketplaceOrders).toBe(1);
    expect(result.metrics.grossRevenue).toBe(50);
    expect(result.alerts.some(a=>a.kind==='fulfilment-delay')).toBe(true);
  });

  it('flags tracking, delivery, stock and return exceptions without claiming provider outcomes',()=>{
    const result=buildDropshippingControlTower({now,catalog:[{id:'p1',name:'Packing Cubes',metadata:{source:'dropshipping-hub'}}],orders:[
      {id:'o1',order_number:'DS-1',status:'open',fulfilment_status:'shipped',placed_at:'2026-09-01T12:00:00Z',fulfilled_at:'2026-09-06T12:00:00Z',tracking_number:'',line_items:[{item_id:'p1'}]},
    ],returns:[{id:'r1',order_id:'o1',return_number:'RET-1',status:'received'}],demandSignals:[{item_id:'p1',risk:'critical',reason:'Supplier stock is depleted.'}],reorderProposals:[{item_id:'p1',status:'suggested'}]});
    expect(result.metrics.fulfilmentExceptions).toBe(2);
    expect(result.metrics.openReturns).toBe(1);
    expect(result.metrics.criticalStockRisks).toBe(1);
    expect(result.metrics.openReorders).toBe(1);
    expect(result.alerts[0].severity).toBe('critical');
    expect(result.alerts.map(a=>a.kind)).toEqual(expect.arrayContaining(['tracking-missing','delivery-delay','supplier-stock-risk','return-open']));
  });

  it('does not mix closed orders into the active fulfilment queue',()=>{
    const result=buildDropshippingControlTower({now,catalog:[{id:'p1',metadata:{source:'dropshipping-hub'}}],orders:[{id:'o1',status:'completed',fulfilment_status:'delivered',line_items:[{item_id:'p1'}]}]});
    expect(result.metrics.linkedOrders).toBe(1);
    expect(result.metrics.openOrders).toBe(0);
    expect(result.fulfilmentQueue).toHaveLength(0);
    expect(result.alerts).toHaveLength(0);
  });
});
