# Marketplace and payments — engineering evidence (E10)

Reconciled: 2026-09-22. This is a **bounded checkout and fulfilment-control milestone**, not evidence of a settled real-money transaction or 100% marketplace completion.

## Direct production database observation (read-only)

- `public.marketplace_orders` and `public.marketplace_listing_fee_payments` have authenticated **SELECT-only** grants and explicit party/owner RLS read policies. They deliberately do not grant direct client INSERT or UPDATE. Only server-side privileged settlement logic may change those ledgers, following authenticated user/record validation. The earlier checkout functions attempted writes through the user's restricted client.
- At the audit checkpoint the orders and listing-fee payment tables contained **no payment records**. No real or synthetic owner transaction was created by this engineering batch.
- The existing `public.marketplace_payment_events` table is present. The generic payment webhook's separate `billing_webhook_events` claim table **is not present** in the currently active public schema. Its existing event-claim logic logs a non-unique insertion error and continues; this is **not** certified webhook deduplication or reliable retry processing. Correct the canonical event-processing flow before live settlement certification; do not add an unreviewed duplicate event store.

## Verified code and deployment milestones

| Capability | Verified change | Exact feature head / merge / production evidence |
| --- | --- | --- |
| Authenticated Marketplace checkout/ledger bridge | [PR #663](https://github.com/creativewebdesigneng-stack/palladium-ai-os/pull/663) checks listing/seller/buyer identity and the existing £3 listing charge, 2% sale fee below £10,000, and 8% at/above £10,000. Server-only order/payment ledger writes replace forbidden authenticated writes. Purchase ledger exists before Stripe Checkout; a payable URL is withheld until its exact Stripe session is saved. Failed preparations remain unfulfilled. The installed payment environment and actual seller account are checked instead of taking a caller-supplied price or provider connection as fact. | Head `5005d0f6` Backend Check successful and Vercel preview READY; merged `905647d4`, matching production `dpl_B52rrre4sNFRcMiEsPk2wmSQ2m9B` READY, merge Backend Check successful. |
| Payment is not proof of delivery | [PR #664](https://github.com/creativewebdesigneng-stack/palladium-ai-os/pull/664) verifies the signed paid Checkout session against the stored order amount, GBP currency and sandbox/live environment. A paid session records a **pending** delivery with no premature customer-facing seller instructions/reference, no delivered timestamp, and no resetting already delivered/refunded/revoked states on replay. The webhook no longer claims a digital or service item was delivered merely because payment was accepted. | Head `a7cceb0f` Backend Check successful and Vercel preview READY; merged `b8db42bb`, matching production `dpl_4GUg9zanVyfDPoJpwwjnfC63YmJt` READY, merge Backend Check successful. |

No owner-account checkout, provider charge, payout, refund, dispute, customer delivery or signed-in merchant purchase was executed to obtain these CI and deployment results. The tests are deterministic; production READY establishes deployment, not settlement success.

## Still open before E10 can be 100% operational

1. Correct the generic webhook's absent event-claim table / partial-processing acknowledgements and implement reliable, idempotent provider-event reconciliation using the existing payment-event infrastructure. An error must not be acknowledged as final success, and retry must not double-charge, duplicate moderation, undo refunds or overwrite deliveries.
2. Implement and verify seller-controlled fulfilment and buyer-visible delivery evidence, including real digital/source-code/repository handoff and appropriate service follow-up. The new paid-order ledger deliberately remains `pending` until a separately verified delivery action exists.
3. Reconcile duplicate or abandoned listing-fee and purchase sessions. Check seller onboarding, Stripe Connect status, fees net of provider charges, refunds, disputes, chargebacks, moderation and idempotency.
4. Verify the exact sandbox/live configuration and provider webhook signature path, then perform a consented **sandbox** end-to-end purchase/fee/payout simulation with real provider responses. Only pursue real-money settlement with the owner's explicit approval and official account onboarding.
5. Keep the documented 2%/8% threshold and £3 listing fee visible across quote, Stripe session, persisted order, webhooks and seller reporting. The final signed-in, provider-confirmed acceptance criteria—not code or preview alone—close E10.

Do not weaken RLS or grant authenticated users direct settlement writes as a workaround. Do not claim that a seller was paid, a buyer received an item or a merchant account is live without the corresponding provider and delivery evidence.
