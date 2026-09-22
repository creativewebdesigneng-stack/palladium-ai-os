import { MARKETPLACE_LISTING_FEE_PENCE, marketplaceSaleFee } from './fees';

type ListingFeeCandidate = {
  status: string;
  listing_fee_paid_at: string | null;
  listing_fee_pence: number;
};

type PurchaseCandidate = {
  status: string;
  seller_id: string;
  price_pence: number;
  listing_fee_paid_at: string | null;
  currency: string;
};

/** Shared fee and state gates for authenticated, server-owned marketplace checkout. */
export function requireUnpaidListingFee(listing: ListingFeeCandidate): number {
  if (listing.listing_fee_paid_at) throw new Error('The listing fee has already been paid.');
  if (!['draft', 'listing_fee_due', 'rejected'].includes(listing.status)) {
    throw new Error('This listing is not awaiting a listing fee.');
  }
  if (listing.listing_fee_pence !== MARKETPLACE_LISTING_FEE_PENCE) {
    throw new Error('Listing fee does not match the approved marketplace price.');
  }
  return MARKETPLACE_LISTING_FEE_PENCE;
}

/** Charge only a current published GBP listing; never trust caller-supplied price or fee. */
export function quoteRecordedPurchase(listing: PurchaseCandidate, buyerId: string) {
  if (!buyerId || listing.seller_id === buyerId) {
    throw new Error('You cannot purchase your own listing.');
  }
  if (listing.status !== 'published' || !listing.listing_fee_paid_at || listing.currency !== 'GBP') {
    throw new Error('This listing is not eligible for paid checkout.');
  }
  if (!Number.isSafeInteger(listing.price_pence) || listing.price_pence <= 0) {
    throw new Error('This listing has no valid paid-checkout price. Free items require a separate delivery flow.');
  }
  return marketplaceSaleFee(listing.price_pence);
}

type CheckoutSession = { id: string; url: string | null };

/**
 * Never hand a payable checkout URL to the caller until the authoritative
 * server-only payment/order ledger has recorded its exact Stripe session.
 *
 * Stripe sessions are expirable only while open. A reconciliation failure is
 * raised even when the expiration attempt also fails; it is never described
 * as a completed, paid or fulfilled transaction.
 */
export async function requireRecordedStripeSession<T extends CheckoutSession>(actions: {
  create: () => Promise<T>;
  record: (session: T) => Promise<void>;
  expire: (sessionId: string) => Promise<unknown>;
}): Promise<T> {
  const session = await actions.create();
  try {
    const url = session?.url;
    if (!session?.id?.startsWith('cs_') || !url || !/^https:\/\//i.test(url)) {
      throw new Error('Stripe did not supply an active hosted checkout session.');
    }
    await actions.record(session);
    return session;
  } catch (error) {
    if (session?.id?.startsWith('cs_')) {
      try {
        await actions.expire(session.id);
      } catch (expireError) {
        console.error('[marketplace] Could not expire unrecorded checkout session:', expireError);
      }
    }
    throw new Error('Could not safely record the checkout session. No payment link was issued.');
  }
}
