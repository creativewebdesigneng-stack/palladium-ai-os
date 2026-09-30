import {describe,expect,it} from 'vitest';
import {calculateWatchlistScore,normalizeOpportunityEvidence,scoreTrend,supplierEvidenceSummary,supplierLandedCost,watchlistBand} from './dropshipping-opportunities';

describe('dropshipping opportunity watchlist',()=>{
  it('rewards demand, search, margin and supplier quality while penalising competition and compliance risk',()=>{
    const strong=calculateWatchlistScore({demand:90,searchMomentum:88,competition:25,margin:82,supplier:90,complianceRisk:5});
    const risky=calculateWatchlistScore({demand:90,searchMomentum:88,competition:80,margin:40,supplier:45,complianceRisk:95});
    expect(strong).toBeGreaterThan(risky);
    expect(watchlistBand(strong)).toMatch(/priority|test/);
  });

  it('keeps only bounded unique http(s) evidence links',()=>{
    const rows=normalizeOpportunityEvidence([
      'https://example.com/a',
      {url:'https://example.com/a',label:'duplicate'},
      {url:'javascript:alert(1)',label:'bad'},
      {url:'https://example.com/b',label:'Marketplace evidence'},
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toEqual({url:'https://example.com/b',label:'Marketplace evidence'});
  });

  it('removes credentials and URL fragments from persisted evidence links',()=>{
    const [row]=normalizeOpportunityEvidence([
      {url:'https://supplier.example/item?sku=42&access_token=do-not-store#token=also-secret',label:'Supplier evidence'},
    ]);
    expect(row?.url).toContain('sku=42');
    expect(row?.url).not.toContain('access_token');
    expect(row?.url).not.toContain('do-not-store');
    expect(row?.url).not.toContain('#');
  });

  it('summarises active supplier offers without counting rejected sourcing',()=>{
    const offers=[
      {role:'primary',unit_cost:10,shipping_cost:3,supplier_score:82},
      {role:'backup',unit_cost:11,shipping_cost:1,supplier_score:90},
      {role:'rejected',unit_cost:1,shipping_cost:0,supplier_score:99},
    ];
    expect(supplierLandedCost(offers[0]!)).toBe(13);
    expect(supplierEvidenceSummary(offers)).toMatchObject({count:2,backups:1,bestScore:90,lowestLandedCost:12});
  });

  it('classifies score movement without overreacting to tiny changes',()=>{
    expect(scoreTrend(72,60)).toEqual({delta:12,direction:'rising'});
    expect(scoreTrend(60,72)).toEqual({delta:-12,direction:'falling'});
    expect(scoreTrend(71,70)).toEqual({delta:1,direction:'stable'});
    expect(scoreTrend(null,70)).toEqual({delta:null,direction:'unknown'});
  });
});
