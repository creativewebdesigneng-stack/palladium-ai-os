import {describe,expect,it} from 'vitest';
import {calculateWatchlistScore,normalizeOpportunityEvidence,watchlistBand} from './dropshipping-opportunities';

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
});
