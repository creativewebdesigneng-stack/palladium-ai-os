/**
 * Payment acceptance only authorises fulfilment. It does not prove that a
 * digital file, licence, website, repository or service has been delivered.
 *
 * Keep the existing customer-visible delivery ledger pending until a separate
 * verified delivery action records the exact artifact and its outcome.
 */
export function preparePaidMarketplaceDelivery(
  order: { id: string; seller_id: string; buyer_id: string },
  listing: { delivery_type: string },
) {
  if (!order.id || !order.seller_id || !order.buyer_id || !listing.delivery_type) {
    throw new Error('Missing verified order or listing delivery details.');
  }
  return {
    order_id: order.id,
    seller_id: order.seller_id,
    buyer_id: order.buyer_id,
    delivery_type: listing.delivery_type,
    // Listing preparation notes/references are not automatically customer
    // delivery evidence and must not be published by a payment webhook.
    delivery_reference: null,
    instructions: null,
    status: 'pending' as const,
    delivered_at: null,
  };
}

/** Only paid sessions for the exact ledger amount and payment environment qualify. */
export function verifyMarketplacePaidPurchase(
  session: { payment_status?: string; amount_total?: number | null; currency?: string | null; livemode?: boolean },
  order: { sale_price_pence: number; currency: string },
  environment: 'sandbox' | 'live',
) {
  if (session.payment_status !== 'paid' ||
    !Number.isSafeInteger(order.sale_price_pence) || order.sale_price_pence <= 0 ||
    session.amount_total !== order.sale_price_pence ||
    session.currency?.toLowerCase() !== order.currency.toLowerCase() ||
    order.currency !== 'GBP' ||
    session.livemode !== (environment === 'live')) {
    throw new Error('Payment session does not match the authorised marketplace order.');
  }
}
