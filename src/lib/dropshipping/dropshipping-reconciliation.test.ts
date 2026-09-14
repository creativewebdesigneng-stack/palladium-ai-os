import {describe,expect,it} from 'vitest';
import {boundedEvidenceResult,evidenceSummary,isSafeDropshipFulfilmentTransition} from './dropshipping-reconciliation';

describe('Dropshipping fulfilment reconciliation',()=>{
  it('allows forward-only fulfilment transitions',()=>{
    expect(isSafeDropshipFulfilmentTransition('unfulfilled','shipped')).toBe(true);
    expect(isSafeDropshipFulfilmentTransition('shipped','delivered')).toBe(true);
    expect(isSafeDropshipFulfilmentTransition('delivered','shipped')).toBe(false);
    expect(isSafeDropshipFulfilmentTransition('shipped','returned')).toBe(true);
    expect(isSafeDropshipFulfilmentTransition('unfulfilled','returned')).toBe(false);
  });

  it('bounds oversized provider evidence',()=>{
    const result=boundedEvidenceResult({blob:'x'.repeat(30_000)});
    expect(result).toMatchObject({truncated:true});
  });

  it('extracts a compact reconciliation summary when common fields exist',()=>{
    expect(evidenceSummary({tracking_number:'ABC',carrier:'Royal Mail',other:'ignored'})).toContain('ABC');
  });
});
