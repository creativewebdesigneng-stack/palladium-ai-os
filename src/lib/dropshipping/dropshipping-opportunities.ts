export type OpportunityEvidence={url:string;label?:string};
export type OpportunityScores={demand?:number|null|undefined;searchMomentum?:number|null|undefined;competition?:number|null|undefined;margin?:number|null|undefined;supplier?:number|null|undefined;complianceRisk?:number|null|undefined};
export type SupplierOfferLike={unit_cost?:number|null;shipping_cost?:number|null;role?:string|null;supplier_score?:number|null};

const secretQueryKey=/^(?:api[_-]?key|apikey|access[_-]?token|refresh[_-]?token|token|secret|password|credential|authorization|auth|signature|sig)$/i;

const clamp=(value:number|null|undefined)=>value==null?null:Math.max(0,Math.min(100,Number.isFinite(value)?value:0));
const round=(value:number)=>Math.round(value*100)/100;

export function calculateWatchlistScore(input:OpportunityScores){
  const demand=clamp(input.demand)??50;
  const search=clamp(input.searchMomentum)??50;
  const competition=clamp(input.competition)??50;
  const margin=clamp(input.margin)??50;
  const supplier=clamp(input.supplier)??50;
  const risk=clamp(input.complianceRisk)??0;
  const score=demand*.25+search*.22+(100-competition)*.16+margin*.17+supplier*.12-risk*.12;
  return round(Math.max(0,Math.min(100,score)));
}

export function normalizeOpportunityEvidence(values:unknown):OpportunityEvidence[]{
  if(!Array.isArray(values))return [];
  const out:OpportunityEvidence[]=[];
  for(const value of values.slice(0,12)){
    const record=value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
    const raw=typeof value==='string'?value:typeof record?.['url']==='string'?record['url']:'';
    if(!raw)continue;
    try{
      const url=new URL(raw.trim());
      if(!['http:','https:'].includes(url.protocol))continue;
      url.username='';
      url.password='';
      url.hash='';
      for(const key of [...url.searchParams.keys()])if(secretQueryKey.test(key))url.searchParams.delete(key);
      const normalized=url.toString().slice(0,2000);
      if(out.some(row=>row.url===normalized))continue;
      const label=typeof record?.['label']==='string'?record['label'].trim().slice(0,200):undefined;
      out.push(label?{url:normalized,label}:{url:normalized});
    }catch{}
  }
  return out;
}

export function supplierLandedCost(offer:SupplierOfferLike){
  const unit=offer.unit_cost==null?null:Number(offer.unit_cost);
  const shipping=offer.shipping_cost==null?null:Number(offer.shipping_cost);
  if((unit==null||!Number.isFinite(unit))&&(shipping==null||!Number.isFinite(shipping)))return null;
  return round(Math.max(0,Number.isFinite(unit as number)?unit as number:0)+Math.max(0,Number.isFinite(shipping as number)?shipping as number:0));
}

export function supplierEvidenceSummary(offers:SupplierOfferLike[]){
  const active=offers.filter(row=>row.role!=='rejected');
  const primary=active.find(row=>row.role==='primary')??null;
  const backups=active.filter(row=>row.role==='backup').length;
  const scored=active.map(row=>Number(row.supplier_score)).filter(Number.isFinite);
  const bestScore=scored.length?Math.max(...scored):null;
  const costs=active.map(supplierLandedCost).filter((value):value is number=>value!=null);
  const lowestLandedCost=costs.length?Math.min(...costs):null;
  return {count:active.length,primary,backups,bestScore,lowestLandedCost};
}

export function watchlistBand(score:number){
  const value=clamp(score)??0;
  return value>=75?'priority':value>=55?'test':value>=35?'watch':'weak';
}


export function scoreTrend(current:number|null|undefined,previous:number|null|undefined){
  if(current==null||previous==null||!Number.isFinite(current)||!Number.isFinite(previous))return {delta:null,direction:'unknown' as const};
  const delta=round(current-previous);
  if(Math.abs(delta)<2)return {delta,direction:'stable' as const};
  return {delta,direction:delta>0?'rising' as const:'falling' as const};
}
