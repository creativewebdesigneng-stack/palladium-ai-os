import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { preparePaidMarketplaceDelivery, verifyMarketplacePaidListingFee, verifyMarketplacePaidPurchase } from './fulfilment-evidence';

const order = { id: 'order-1', seller_id: 'seller-1', buyer_id: 'buyer-1', sale_price_pence: 9_999_99, currency: 'GBP' };
const listing = { delivery_type: 'repository_access', delivery_reference: 'private seller link', delivery_instructions: 'seller-only instructions' };
const session = { payment_status: 'paid', amount_total: 9_999_99, currency: 'gbp', livemode: false };

describe('Marketplace provider payment and fulfilment truth', () => {
  it('records a paid order as awaiting actual seller delivery without exposing preparatory secrets', () => {
    const pending = preparePaidMarketplaceDelivery(order, listing);
    expect(pending).toEqual({
      order_id: order.id, seller_id: order.seller_id, buyer_id: order.buyer_id,
      delivery_type: 'repository_access', delivery_reference: null, instructions: null,
      status: 'pending', delivered_at: null,
    });
    expect(JSON.stringify(pending)).not.toContain('private seller link');
    expect(JSON.stringify(pending)).not.toContain('seller-only instructions');
  });

  it('rejects incomplete order identities rather than inventing a delivery record', () => {
    expect(() => preparePaidMarketplaceDelivery({ ...order, buyer_id: '' }, listing)).toThrow('Missing verified');
    expect(() => preparePaidMarketplaceDelivery(order, { delivery_type: '' })).toThrow('Missing verified');
  });

  it('requires actual paid status, matching price, GBP currency and exact sandbox or live environment', () => {
    expect(() => verifyMarketplacePaidPurchase(session, order, 'sandbox')).not.toThrow();
    expect(() => verifyMarketplacePaidPurchase({ ...session, livemode: true }, order, 'live')).not.toThrow();
    for (const changed of [
      { payment_status: 'unpaid' }, { amount_total: 10_000_00 },
      { amount_total: null }, { currency: 'usd' }, { livemode: true },
    ]) {
      expect(() => verifyMarketplacePaidPurchase({ ...session, ...changed }, order, 'sandbox')).toThrow('does not match');
    }
    expect(() => verifyMarketplacePaidPurchase(session, { ...order, sale_price_pence: 0 }, 'sandbox')).toThrow('does not match');
  });

  it('matches a signed £3 listing fee to its exact recorded seller, listing, session and environment', () => {
    const fee = {
      listing_id: 'listing-1', seller_id: 'seller-1', stripe_checkout_session_id: 'cs_test_one',
      amount_pence: 300, currency: 'GBP', status: 'pending', payment_provider: 'stripe',
    };
    const paid = {
      id: 'cs_test_one', payment_status: 'paid', amount_total: 300, currency: 'gbp', livemode: false,
    };
    expect(() => verifyMarketplacePaidListingFee(paid, fee, 'listing-1', 'seller-1', 'sandbox')).not.toThrow();
    expect(() => verifyMarketplacePaidListingFee({ ...paid, livemode: true }, fee, 'listing-1', 'seller-1', 'live')).not.toThrow();
    for (const [changedSession, changedFee, listingId, sellerId, env] of [
      [{ payment_status: 'unpaid' }, {}, 'listing-1', 'seller-1', 'sandbox'],
      [{ amount_total: 299 }, {}, 'listing-1', 'seller-1', 'sandbox'],
      [{ currency: 'usd' }, {}, 'listing-1', 'seller-1', 'sandbox'],
      [{ livemode: true }, {}, 'listing-1', 'seller-1', 'sandbox'],
      [{ id: 'cs_test_other' }, {}, 'listing-1', 'seller-1', 'sandbox'],
      [{}, { amount_pence: 299 }, 'listing-1', 'seller-1', 'sandbox'],
      [{}, { status: 'refunded' }, 'listing-1', 'seller-1', 'sandbox'],
      [{}, { payment_provider: 'other' }, 'listing-1', 'seller-1', 'sandbox'],
      [{}, { currency: 'USD' }, 'listing-1', 'seller-1', 'sandbox'],
      [{}, {}, 'listing-2', 'seller-1', 'sandbox'],
      [{}, {}, 'listing-1', 'seller-2', 'sandbox'],
    ] as const) {
      expect(() => verifyMarketplacePaidListingFee(
        { ...paid, ...changedSession }, { ...fee, ...changedFee },
        listingId, sellerId, env,
      )).toThrow('does not match');
    }
  });

  it('validates a persisted listing fee before any paid ledger, listing or moderation write', () => {
    const webhook = readFileSync(new URL('../../routes/api/public/payments/webhook.ts', import.meta.url), 'utf8');
    const fee = webhook.slice(
      webhook.indexOf('if (session.metadata?.kind === "marketplace_listing_fee")'),
      webhook.indexOf('if (session.metadata?.kind === "marketplace_purchase")'),
    );
    expect(fee).toContain('if (paymentReadError || !payment)');
    expect(fee).toContain('verifyMarketplacePaidListingFee(session, payment, listingId, sellerId, env)');
    expect(fee.indexOf('verifyMarketplacePaidListingFee(')).toBeLessThan(fee.indexOf('.update({ status: "paid"'));
    expect(fee).toContain('if (paymentWriteError || !markedPayment) throw');
    expect(fee).toContain('if (listingWriteError || !marked) throw');
    expect(fee).toContain('if (moderationError) throw');
    expect(fee).toContain('if (payment.status === "paid" && listing.listing_fee_paid_at &&');
    expect(fee).toContain('if (!priorCase)');
    expect(fee.indexOf('if (!priorCase)')).toBeLessThan(fee.indexOf('.update({ status: "paid"'));
  });

  it('keeps the signed webhook on the paid-ledger/pending-delivery path, never auto-delivering on payment', () => {
    const webhook = readFileSync(new URL('../../routes/api/public/payments/webhook.ts', import.meta.url), 'utf8');
    const purchase = webhook.slice(webhook.indexOf('if (session.metadata?.kind === "marketplace_purchase")'));
    expect(purchase).toContain('verifyMarketplacePaidPurchase(session, order, env)');
    expect(purchase).toContain('preparePaidMarketplaceDelivery(order, listing)');
    expect(purchase).toContain('if (!existingDelivery)');
    expect(purchase).not.toContain('status: "delivered"');
    expect(purchase).not.toContain('delivered_at: new Date()');
  });
});
