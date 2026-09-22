import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { preparePaidMarketplaceDelivery, verifyMarketplacePaidPurchase } from './fulfilment-evidence';

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
