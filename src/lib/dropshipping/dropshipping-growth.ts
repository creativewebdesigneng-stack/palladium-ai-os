const clamp=(n:number)=>Math.max(0,Math.min(100,Number.isFinite(n)?n:0));
const round=(n:number)=>Math.round(n*100)/100;

export const DROPSHIP_SUPPLIER_NETWORK=[
  {id:'aliexpress',label:'AliExpress / DSers',kind:'general sourcing',notes:'Use only where the connected provider and target marketplace permit the fulfilment model.'},
  {id:'cjdropshipping',label:'CJdropshipping',kind:'general sourcing',notes:'Supplier/catalogue/fulfilment capability depends on the connected integration.'},
  {id:'printful',label:'Printful',kind:'print on demand',notes:'Useful for original-design POD workflows; marketplace disclosure rules still apply.'},
  {id:'printify',label:'Printify',kind:'print on demand',notes:'POD network; verify production partner and delivery promises before publishing.'},
  {id:'gelato',label:'Gelato',kind:'print on demand',notes:'POD/local production network; capability discovery determines live actions.'},
  {id:'autods',label:'AutoDS',kind:'automation',notes:'Treat as an integration lane, not an authority to bypass marketplace fulfilment rules.'},
  {id:'zendrop',label:'Zendrop',kind:'general sourcing',notes:'Supplier capability is shown only when a Blackstar integration exposes it.'},
  {id:'spocket',label:'Spocket',kind:'supplier network',notes:'Use connected supplier evidence for delivery, returns and stock claims.'},
  {id:'syncee',label:'Syncee',kind:'supplier network',notes:'Supplier and product sync actions remain approval-gated where they write externally.'},
  {id:'shippo',label:'Shippo',kind:'shipping',notes:'Shipping/tracking integration; not a product supplier.'},
  {id:'shipstation',label:'ShipStation',kind:'shipping',notes:'Order/shipping integration; fulfilment writes should stay approval-gated.'},
] as const;

export function calculateKeywordOpportunity(input:{searchMomentum:number;buyerIntent:number;relevance:number;competition:number;commercialValue:number}){
  const score=clamp(clamp(input.searchMomentum)*.28+clamp(input.buyerIntent)*.24+clamp(input.relevance)*.22+(100-clamp(input.competition))*.16+clamp(input.commercialValue)*.10);
  return {score:round(score),band:score>=75?'priority':score>=55?'test':score>=35?'long-tail':'low-priority'};
}

export function trendEvidenceStatus(input:{hasSearchSource:boolean;hasMarketplaceSource:boolean;hasSupplierSource:boolean}){
  const sources=[input.hasSearchSource,input.hasMarketplaceSource,input.hasSupplierSource].filter(Boolean).length;
  return {sources,ready:sources>=2,confidence:sources===3?'high':sources===2?'medium':sources===1?'low':'none'};
}
