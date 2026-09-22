import {describe,expect,it,vi} from 'vitest';
import {requireUnpaidListingFee,quoteRecordedPurchase,requireRecordedStripeSession} from './checkout-safety';
import {MARKETPLACE_LISTING_FEE_PENCE} from './fees';

describe('marketplace paid-checkout safety',()=>{
  const feeListing={status:'listing_fee_due',listing_fee_pence:300,listing_fee_paid_at:null};
  const published={status:'published',seller_id:'seller-1',listing_fee_paid_at:'2026-09-20T00:00:00Z',currency:'GBP',price_pence:999999};

  it('checks the approved £3 listing fee and rejects any already paid or ineligible listing',()=>{
    expect(requireUnpaidListingFee(feeListing)).toBe(MARKETPLACE_LISTING_FEE_PENCE);
    for(const status of ['draft','rejected'])expect(requireUnpaidListingFee({...feeListing,status})).toBe(300);
    expect(()=>requireUnpaidListingFee({...feeListing,status:'published'})).toThrow('not awaiting');
    expect(()=>requireUnpaidListingFee({...feeListing,listing_fee_paid_at:'2026-09-20T00:00:00Z'})).toThrow('already been paid');
    expect(()=>requireUnpaidListingFee({...feeListing,listing_fee_pence:301})).toThrow('approved');
  });

  it('calculates only a currently published seller-owned paid GBP listing, never caller-supplied amounts',()=>{
    expect(quoteRecordedPurchase(published,'buyer-1')).toMatchObject({rateBps:200,feePence:20000});
    expect(quoteRecordedPurchase({...published,price_pence:1000000},'buyer-1')).toMatchObject({rateBps:800,feePence:80000});
    expect(()=>quoteRecordedPurchase(published,'seller-1')).toThrow('own listing');
    expect(()=>quoteRecordedPurchase({...published,status:'unlisted'},'buyer-1')).toThrow('not eligible');
    expect(()=>quoteRecordedPurchase({...published,listing_fee_paid_at:null},'buyer-1')).toThrow('not eligible');
    expect(()=>quoteRecordedPurchase({...published,currency:'USD'},'buyer-1')).toThrow('not eligible');
    for(const price_pence of [0,-1,NaN,1.5,Number.MAX_SAFE_INTEGER+1])
      expect(()=>quoteRecordedPurchase({...published,price_pence},'buyer-1')).toThrow();
  });

  it('does not return a payable URL before the server ledger records its exact session',async()=>{
    const order:string[]=[];
    const create=vi.fn(async()=>{order.push('create');return{id:'cs_test_owned',url:'https://checkout.stripe.com/pay/cs_test_owned'};});
    const record=vi.fn(async(session:{id:string;url:string|null})=>{expect(session.id).toBe('cs_test_owned');order.push('record');});
    const expire=vi.fn(async()=>{order.push('expire');});
    const session=await requireRecordedStripeSession({create,record,expire});
    expect(session.url).toContain('checkout.stripe.com');
    expect(order).toEqual(['create','record']);
    expect(expire).not.toHaveBeenCalled();
  });

  it('withholds checkout URL and tries to expire an unrecorded provider session',async()=>{
    const create=vi.fn(async()=>({id:'cs_test_unrecorded',url:'https://checkout.stripe.com/pay/cs_test_unrecorded'}));
    const record=vi.fn(async()=>{throw new Error('permission denied');});
    const expire=vi.fn(async(id:string)=>({id,status:'expired'}));
    await expect(requireRecordedStripeSession({create,record,expire})).rejects.toThrow('No payment link was issued');
    expect(record).toHaveBeenCalledOnce();
    expect(expire).toHaveBeenCalledWith('cs_test_unrecorded');
  });

  it('fails closed even when an unrecorded checkout session cannot be expired',async()=>{
    const errorLog=vi.spyOn(console,'error').mockImplementation(()=>undefined);
    try{
      await expect(requireRecordedStripeSession({
        create:async()=>({id:'cs_test_unknown',url:'https://checkout.stripe.com/pay/cs_test_unknown'}),
        record:async()=>{throw new Error('database unavailable');},
        expire:async()=>{throw new Error('provider unavailable');},
      })).rejects.toThrow('No payment link was issued');
      expect(errorLog).toHaveBeenCalled();
    }finally{errorLog.mockRestore();}
  });

  it('withholds checkout when Stripe returns an invalid or missing hosted URL',async()=>{
    const record=vi.fn(async()=>undefined);
    const expire=vi.fn(async()=>undefined);
    await expect(requireRecordedStripeSession({
      create:async()=>({id:'cs_test_missing',url:null}),record,expire,
    })).rejects.toThrow('No payment link was issued');
    expect(record).not.toHaveBeenCalled();
    expect(expire).toHaveBeenCalledWith('cs_test_missing');
  });
});
