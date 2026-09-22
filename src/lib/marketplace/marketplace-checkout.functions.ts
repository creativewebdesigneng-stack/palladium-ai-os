import {createServerFn} from '@tanstack/react-start';import {z} from 'zod';import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';import {MARKETPLACE_LISTING_FEE_PENCE} from './fees';
import {requireUnpaidListingFee,quoteRecordedPurchase,requireRecordedStripeSession} from './checkout-safety';import {marketplaceBaseUrl,marketplaceStripe} from './stripe.server';type Sb={from:(t:string)=>any};
export const createMarketplaceListingFeeCheckout=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((v:unknown)=>z.object({listing_id:z.string().uuid()}).parse(v))
  .handler(async({data,context})=>{
    // The user's own session establishes listing ownership before any
    // elevated, server-only ledger write or external Stripe request.
    const sb=context.supabase as unknown as Sb;
    const {data:l,error}=await sb.from('marketplace_listings')
      .select('id,title,status,listing_fee_pence,listing_fee_paid_at')
      .eq('id',data.listing_id).eq('seller_id',context.userId).single();
    if(error||!l)throw new Error('Listing not found or unavailable to this seller.');
    const amount= requireUnpaidListingFee(l);
    const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
    // Generated Supabase table types lag behind the already-applied Marketplace
    // migration; this narrow server-only adapter preserves runtime grants.
    const admin=supabaseAdmin as unknown as Sb;
    const stripe=marketplaceStripe(),base=marketplaceBaseUrl();
    const session=await requireRecordedStripeSession({
      create:()=>stripe.checkout.sessions.create({
        mode:'payment',
        line_items:[{price_data:{currency:'gbp',unit_amount:amount,product_data:{name:`Blackstar Marketplace listing — ${l.title}`}},quantity:1}],
        success_url:`${base}/creator-marketplace?listing_fee=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:`${base}/creator-marketplace?listing_fee=cancelled`,
        metadata:{kind:'marketplace_listing_fee',listing_id:l.id,seller_id:context.userId},
      }),
      record:async(created)=>{
        const {error:ledgerError}=await admin.from('marketplace_listing_fee_payments').insert({
          listing_id:l.id,seller_id:context.userId,amount_pence:MARKETPLACE_LISTING_FEE_PENCE,
          currency:'GBP',status:'pending',payment_provider:'stripe',
          provider_payment_id:created.id,stripe_checkout_session_id:created.id,
        });
        if(ledgerError)throw new Error('Listing fee payment ledger could not be recorded.');
      },
      expire:(id)=>stripe.checkout.sessions.expire(id),
    });
    return{url:session.url};
  });
export const createMarketplacePurchaseCheckout=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((v:unknown)=>z.object({listing_id:z.string().uuid()}).parse(v))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb;
    // Read the current, public listing and published seller profile as the
    // authenticated user. Browser input supplies only its listing ID.
    const {data:l,error}=await sb.from('marketplace_listings')
      .select('id,title,price_pence,seller_id,status,currency,listing_fee_paid_at')
      .eq('id',data.listing_id).eq('status','published').single();
    if(error||!l)throw new Error('Published listing not found.');
    const quote=quoteRecordedPurchase(l,context.userId);
    const {data:seller,error:se}=await sb.from('marketplace_seller_profiles')
      .select('stripe_connected_account_id,stripe_charges_enabled,stripe_payouts_enabled')
      .eq('user_id',l.seller_id).single();
    if(se||!seller?.stripe_connected_account_id||!seller.stripe_charges_enabled||!seller.stripe_payouts_enabled)
      throw new Error('Seller payouts are not ready.');
    const stripe=marketplaceStripe(),base=marketplaceBaseUrl();
    // Do not rely on a stale local provider-readiness flag.
    const connected=await stripe.accounts.retrieve(seller.stripe_connected_account_id);
    if(!connected.charges_enabled||!connected.payouts_enabled)throw new Error('Seller payout provider is not ready.');
    const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
    // Generated Supabase table types lag behind the already-applied Marketplace
    // migration; this narrow server-only adapter preserves runtime grants.
    const admin=supabaseAdmin as unknown as Sb;
    // The payment ledger is created before a payable session exists. The
    // user-scoped Supabase role intentionally has no INSERT/UPDATE grant here.
    const {data:order,error:oe}=await admin.from('marketplace_orders').insert({
      listing_id:l.id,buyer_id:context.userId,seller_id:l.seller_id,
      sale_price_pence:l.price_pence,platform_fee_bps:quote.rateBps,
      platform_fee_pence:quote.feePence,seller_net_pence:quote.sellerNetPence,
      currency:'GBP',status:'pending',payment_provider:'stripe',
    }).select('id').single();
    if(oe||!order)throw new Error('Could not create the authorised purchase ledger. No checkout was opened.');
    try{
      const session=await requireRecordedStripeSession({
        create:()=>stripe.checkout.sessions.create({
          mode:'payment',
          line_items:[{price_data:{currency:'gbp',unit_amount:l.price_pence,product_data:{name:l.title}},quantity:1}],
          payment_intent_data:{
            application_fee_amount:quote.feePence,
            transfer_data:{destination:seller.stripe_connected_account_id},
          },
          success_url:`${base}/creator-marketplace?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url:`${base}/creator-marketplace?purchase=cancelled`,
          metadata:{kind:'marketplace_purchase',order_id:order.id,listing_id:l.id,buyer_id:context.userId,seller_id:l.seller_id},
        }),
        record:async(created)=>{
          const {data:linked,error:linkError}=await admin.from('marketplace_orders')
            .update({stripe_checkout_session_id:created.id,provider_payment_id:created.id})
            .eq('id',order.id).eq('buyer_id',context.userId).eq('seller_id',l.seller_id).eq('status','pending')
            .select('id').maybeSingle();
          if(linkError||!linked)throw new Error('Could not bind the authorised purchase to Stripe.');
        },
        expire:(id)=>stripe.checkout.sessions.expire(id),
      });
      return{url:session.url,order_id:order.id};
    }catch(checkoutError){
      // Never call this a paid or fulfilled order. A failed/unknown provider
      // outcome is surfaced to the operator and still needs reconciliation.
      const {error:cancelError}=await admin.from('marketplace_orders')
        .update({status:'cancelled'}).eq('id',order.id).eq('buyer_id',context.userId).eq('status','pending');
      if(cancelError)console.error('[marketplace] Could not mark incomplete checkout as cancelled:',cancelError.message);
      throw checkoutError;
    }
  });