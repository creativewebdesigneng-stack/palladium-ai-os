import {describe,expect,it} from 'vitest';
import {calculateKeywordOpportunity,trendEvidenceStatus} from './dropshipping-growth';

describe('Dropshipping growth intelligence',()=>{
  it('rewards momentum, buyer intent and relevance while penalising competition',()=>{
    const strong=calculateKeywordOpportunity({searchMomentum:90,buyerIntent:85,relevance:95,competition:25,commercialValue:75});
    const crowded=calculateKeywordOpportunity({searchMomentum:90,buyerIntent:85,relevance:95,competition:95,commercialValue:75});
    expect(strong.score).toBeGreaterThan(crowded.score);
    expect(strong.band).toBe('priority');
  });

  it('requires multiple independent evidence sources before trend signals are ready',()=>{
    expect(trendEvidenceStatus({hasSearchSource:false,hasMarketplaceSource:false,hasSupplierSource:false})).toEqual({sources:0,ready:false,confidence:'none'});
    expect(trendEvidenceStatus({hasSearchSource:true,hasMarketplaceSource:true,hasSupplierSource:false})).toEqual({sources:2,ready:true,confidence:'medium'});
    expect(trendEvidenceStatus({hasSearchSource:true,hasMarketplaceSource:true,hasSupplierSource:true}).confidence).toBe('high');
  });
});
