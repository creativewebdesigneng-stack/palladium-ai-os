import {describe,expect,it} from 'vitest';
import {calculateWatchlistScore,normalizeOpportunityEvidence,scoreTrend,watchlistBand} from './dropshipping-opportunities';

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

  it('classifies score movement without overreacting to tiny changes',()=>{
    expect(scoreTrend(72,60)).toEqual({delta:12,direction:'rising'});
    expect(scoreTrend(60,72)).toEqual({delta:-12,direction:'falling'});
    expect(scoreTrend(71,70)).toEqual({delta:1,direction:'stable'});
    expect(scoreTrend(null,70)).toEqual({delta:null,direction:'unknown'});
  });
});
