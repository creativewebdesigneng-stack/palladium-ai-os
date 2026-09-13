import { describe, expect, it } from 'vitest';

export function maturitySummary(scores: Record<string, number>) {
 const values=Object.values(scores).filter(Number.isFinite);
 if(!values.length)return {average:0,level:'Unscored'};
 const average=values.reduce((a,b)=>a+b,0)/values.length;
 const level=average<2?'Foundational':average<3?'Developing':average<4?'Established':average<4.6?'Advanced':'Leading';
 return {average,level};
}
export function supplierRiskScore(v:{criticality:number;concentration:number;financial:number;delivery:number;quality:number;geo:number}) {
 return Math.round((v.criticality*.25+v.concentration*.2+v.financial*.15+v.delivery*.15+v.quality*.1+v.geo*.15)*20);
}
export function growthMetrics(revenue:number,cost:number,market:number,investment:number,benefit:number){
 return {margin:revenue-cost,marginPct:revenue>0?((revenue-cost)/revenue)*100:0,marketShare:market>0?(revenue/market)*100:0,roi:investment>0?((benefit-investment)/investment)*100:0,paybackMonths:benefit>0?(investment/benefit)*12:0};
}
describe('industry deterministic calculations',()=>{
 it('classifies maturity',()=>{expect(maturitySummary({a:4,b:4}).level).toBe('Advanced');expect(maturitySummary({}).level).toBe('Unscored')});
 it('weights supplier risk deterministically',()=>{expect(supplierRiskScore({criticality:5,concentration:4,financial:3,delivery:3,quality:2,geo:4})).toBe(75)});
 it('calculates commercial scenario metrics',()=>{expect(growthMetrics(1000,700,10000,100,160)).toEqual({margin:300,marginPct:30,marketShare:10,roi:60,paybackMonths:7.5})});
});
