# PalladiumAI Billing Configuration

Stripe billing runs through the existing Lovable payments connection — there is
no second Stripe integration, and no Stripe secret key lives in this codebase.
All Stripe calls go through `createStripeClient(env)` in `src/lib/stripe.server.ts`,
which proxies to the connector gateway.

The server chooses sandbox or live from `PAYMENTS_ENVIRONMENT`. A browser
payload cannot switch the secret. This repository does not send customer email
and does not create live charges from tests.

## Plans and approved prices

Blackstar's public catalogue is paid-only. Prices and lookup keys live in
`src/lib/billing/catalog.ts` and are mirrored by `public.plans`.

| Plan code    | Name       | Monthly      | Yearly        | Monthly lookup key            | Yearly lookup key              |
| ------------ | ---------- | ------------ | ------------- | ----------------------------- | ------------------------------ |
| `builder`    | Builder (Pro) | £150      | £1,530        | `builder_monthly_150_gbp`     | `builder_yearly_1530_gbp`      |
| `business`   | Business   | £1,500       | £15,300       | `business_monthly_1500_gbp`   | `business_yearly_15300_gbp`    |
| `enterprise` | Enterprise | £3,500       | £35,700       | `enterprise_monthly_3500_gbp` | `enterprise_yearly_35700_gbp`  |

Amounts are 15,000 / 153,000 / 150,000 / 1,530,000 / 350,000 / 3,570,000 pence.
Checkout and plan changes reject a Stripe Price whose lookup key, currency or
`unit_amount` does not match this table.

### Legacy Explorer

`explorer` stays in `public.plans` and in the webhook map so historical rows
still resolve. It is inactive, £0, and not purchasable. `priceKeyForPlan`
returns null for `explorer` and `free`.

These leftover free Explorer webhook keys are retained in
`LEGACY_FREE_EXPLORER_PRICE_KEYS`. Do not delete them. A signed event that
still carries one resolves to Explorer and is never promoted to a paid plan:

| Lookup key          | Resolves to |
| ------------------- | ----------- |
| `explorer`          | `explorer`  |
| `explorer_monthly`  | `explorer`  |
| `explorer_yearly`   | `explorer`  |
| `free`              | `explorer`  |
| `free_monthly`      | `explorer`  |
| `free_yearly`       | `explorer`  |

A subscription event with no price key is accepted as Explorer only when its
metadata plan is `explorer` or `free` and the unit amount is missing or zero.
Any other missing or unknown price is rejected. It is not stored as Builder.

Historic paid keys still map to the current plan family (`pro_monthly` /
`pro_yearly` → Builder, and the older `business_*` / `enterprise_*` keys).
Amount matching is enforced for the current lookup keys above. Historic keys
are recognised so an old subscription is not dropped.

**The frontend never sends a Stripe price id.** `createCheckoutSession` accepts
`{ planCode, interval }`, rejects unknown or Explorer plans, and resolves the
price server-side via `stripe.prices.list({ lookup_keys })`.

## Environments

- Sandbox/test: `.env.development` holds `VITE_PAYMENTS_CLIENT_TOKEN` (`pk_test_…`);
  server calls use `STRIPE_SANDBOX_API_KEY` + `PAYMENTS_SANDBOX_WEBHOOK_SECRET`.
- Live: `.env.production` holds the `pk_live_…` token; server calls use
  `STRIPE_LIVE_API_KEY` + `PAYMENTS_LIVE_WEBHOOK_SECRET` (provisioned at go-live).

The environment is derived from the client token prefix — never defaulted to live.
Every `subscriptions` read and write is filtered by the `environment` column, so
sandbox and live rows can coexist safely. `PAYMENTS_ENVIRONMENT` on the server
must agree with the requested environment or the Stripe client refuses the call.

## Webhook endpoints

Registered automatically by the payments integration:

- Preview/sandbox: `https://project--<project-id>-dev.lovable.app/api/public/payments/webhook?env=sandbox`
- Production/live: `https://project--<project-id>.lovable.app/api/public/payments/webhook?env=live`

Handler: `src/routes/api/public/payments/webhook.ts`.

Signatures are verified with HMAC-SHA256 (`verifyWebhook`) with a 5-minute
timestamp tolerance before any payload is read. Requests without a valid
signature never touch the database.

### Events handled

| Event                                    | Effect                                                          |
| ---------------------------------------- | --------------------------------------------------------------- |
| `checkout.session.completed`             | Retrieves the subscription from Stripe and upserts it (safety net) |
| `checkout.session.async_payment_succeeded` | Same as above for delayed payment methods                     |
| `customer.subscription.created`           | Upserts the resolved plan, status, period, seats, price/product |
| `customer.subscription.updated`           | Same upsert, including `cancel_at_period_end`                   |
| `customer.subscription.deleted`           | Marks the row `canceled`                                        |
| `invoice.paid`                            | Records one `billing.invoice_paid` usage row per invoice        |
| `invoice.payment_failed`                  | Marks the subscription `past_due` (Stripe retries; access kept) |
| `charge.refunded`                         | Marketplace orders reconcile refunds; other subscription charges are audited as `billing.subscription_refunded` and do not themselves change the plan |
| `radar.early_fraud_warning.created`       | Audits `billing.early_fraud_warning` against the Stripe customer. It does not email the customer or cancel the plan by itself |
| Marketplace charge, transfer, fee, dispute events | Existing Marketplace settlement, refund and dispute reconciliation |

### Idempotency

Each delivery is claimed through `blackstar_claim_payment_event` before work
starts. A completed event returns `200` with no further writes. A lease held
by another worker returns `503` so Stripe retries. Failed handling releases
the lease. Paid invoices also have a unique usage-record index on
`(invoice_id, environment)`.

## Stored subscription state

`public.subscriptions` holds `stripe_customer_id`, `stripe_subscription_id`,
`stripe_price_id` (lookup key), `stripe_product_id`, `plan_code`, `status`,
`current_period_start`, `current_period_end`, `cancel_at_period_end`,
`trial_ends_at`, `seats`, `org_id`, `environment`.

Only the webhook (service role) writes these rows. Client mutations, query
parameters, and `localStorage` are never trusted; entitlements are resolved
server-side from this table (`effective_plan`, `has_active_subscription`,
`src/lib/platform/entitlements.server.ts`). Accounts with no subscription still
resolve to the legacy Explorer limits. That is not a checkout path.

## Billing actions

| Action                | Path                                                        |
| --------------------- | ----------------------------------------------------------- |
| Upgrade (new sub)     | `createCheckoutSession` → embedded checkout                  |
| Upgrade/downgrade     | `changeSubscriptionPlan` (prorated Stripe item swap)         |
| Cancel                | `cancelSubscription` (`cancel_at_period_end = true`)         |
| Resume                | `resumeSubscription`                                         |
| Update payment method | `createPortalSession` (Stripe Billing Portal, new tab)       |
| Invoices / history    | `getBillingData` (live Stripe invoices) + `listBillingEvents` |
| Commercial report     | `getCommercialReport` (admin, catalogue MRR + ledger totals) |

Organisation-scoped checkout requires `owner`/`admin` membership, verified
server-side against `organisation_members`. Enterprise is the £3,500 / £35,700
plan in the same checkout. It is not a separate "contact sales" price.

Usage shown on the billing page comes from `usage_records` and entitlement
counts. The page does not invent consumption.

Marketplace listing fees, purchases, Connect onboarding, refunds and transfer
settlement stay in `src/lib/marketplace`. Seller Connect status is refreshed
from Stripe; a transfer ledger row is not treated as a bank payout.

## Test-mode checklist before going live

Automated tests cover signature verification, the price catalogue, Explorer
rejection, commercial totals and Marketplace fee maths with fixtures. They do
not move money. The steps below need the owner's Stripe **test** keys and
Dashboard prices; do not use live keys or real cards.

1. Preview shows the test-mode banner (`pk_test_` token present).
2. Stripe test Prices exist for the six current lookup keys, in GBP, at the
   pence amounts in the table above.
3. Complete a Builder checkout with `4242 4242 4242 4242`.
4. Confirm a `subscriptions` row appears with `environment = 'sandbox'`,
   `plan_code = 'builder'`, `status = 'active'`.
5. Replay the same webhook delivery from Stripe and confirm the duplicate is
   ignored (idempotency).
6. Cancel, then resume, and confirm `cancel_at_period_end` flips both ways.
7. Trigger `invoice.payment_failed` (card `4000 0000 0000 0341`) and confirm the
   row moves to `past_due`.
8. Open the Billing Portal and confirm invoices load.
9. For Marketplace: a Connect test account with charges and payouts enabled,
   then a test-mode listing fee and purchase. Confirm the webhook, not the
   success page, marks the order paid.

Billing is production-ready only once every step above passes in sandbox.
