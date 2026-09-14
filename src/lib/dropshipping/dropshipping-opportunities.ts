export type OpportunityEvidence={url:string;label?:string};
export type OpportunityScores={demand?:number|null|undefined;searchMomentum?:number|null|undefined;competition?:number|null|undefined;margin?:number|null|undefined;supplier?:number|null|undefined;complianceRisk?:number|null|undefined};

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
      const normalized=url.toString().slice(0,2000);
      if(out.some(row=>row.url===normalized))continue;
      const label=typeof record?.['label']==='string'?record['label'].trim().slice(0,200):undefined;
      out.push(label?{url:normalized,label}:{url:normalized});
    }catch{}
  }
  return out;
}

export function watchlistBand(score:number){
  const value=clamp(score)??0;
  return value>=75?'priority':value>=55?'test':value>=35?'watch':'weak';
}
