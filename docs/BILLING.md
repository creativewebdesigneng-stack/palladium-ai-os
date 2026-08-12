# PalladiumAI Billing Configuration

Stripe billing runs through the existing Lovable payments connection — there is
no second Stripe integration, and no Stripe secret key lives in this codebase.
All Stripe calls go through `createStripeClient(env)` in `src/lib/stripe.server.ts`,
which proxies to the connector gateway.

## Plans and approved prices

| Plan code    | Name       | Price       | Monthly lookup key    | Yearly lookup key    |
| ------------ | ---------- | ----------- | --------------------- | -------------------- |
| `explorer`   | Explorer   | £0          | — (free, no checkout) | —                    |
| `builder`    | Builder    | £20/month   | `pro_monthly`         | `pro_yearly`         |
| `business`   | Business   | £1,500/month| `business_monthly`    | `business_yearly`    |
| `enterprise` | Enterprise | £3,000/month| `enterprise_monthly`  | `enterprise_yearly`  |

The mapping is defined once in `src/lib/billing/catalog.ts` and mirrored in
`public.plans` (`stripe_price_id`, `stripe_price_id_yearly`). Lookup keys are
identical in sandbox and live, so no code changes are needed at go-live.

**The frontend never sends a Stripe price id.** `createCheckoutSession` accepts
`{ planCode, interval }`, rejects unknown or free plans, and resolves the price
server-side via `stripe.prices.list({ lookup_keys })`.

## Environments

- Sandbox/test: `.env.development` holds `VITE_PAYMENTS_CLIENT_TOKEN` (`pk_test_…`);
  server calls use `STRIPE_SANDBOX_API_KEY` + `PAYMENTS_SANDBOX_WEBHOOK_SECRET`.
- Live: `.env.production` holds the `pk_live_…` token; server calls use
  `STRIPE_LIVE_API_KEY` + `PAYMENTS_LIVE_WEBHOOK_SECRET` (provisioned at go-live).

The environment is derived from the client token prefix — never defaulted to live.
Every `subscriptions` read and write is filtered by the `environment` column, so
sandbox and live rows can coexist safely.

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
| `customer.subscription.created`           | Upserts plan, status, period, seats, price/product              |
| `customer.subscription.updated`           | Same upsert, including `cancel_at_period_end`                   |
| `customer.subscription.deleted`           | Marks the row `canceled`                                        |
| `invoice.paid`                            | Records a `billing.invoice_paid` usage record                   |
| `invoice.payment_failed`                  | Marks the subscription `past_due` (Stripe retries; access kept)  |

### Idempotency

Each delivery is claimed by inserting `event.id` into
`public.billing_webhook_events` (primary key). A unique-violation means the
event was already processed, so the handler acknowledges with `200` and does no
further work. Retries and duplicate deliveries are therefore safe.

## Stored subscription state

`public.subscriptions` holds `stripe_customer_id`, `stripe_subscription_id`,
`stripe_price_id` (lookup key), `stripe_product_id`, `plan_code`, `status`,
`current_period_start`, `current_period_end`, `cancel_at_period_end`,
`trial_ends_at`, `seats`, `org_id`, `environment`.

Only the webhook (service role) writes these rows. Client mutations, query
parameters, and `localStorage` are never trusted; entitlements are resolved
server-side from this table (`effective_plan`, `has_active_subscription`,
`src/lib/platform/entitlements.server.ts`).

## Billing actions

| Action                | Path                                                        |
| --------------------- | ----------------------------------------------------------- |
| Upgrade (new sub)     | `createCheckoutSession` → embedded checkout                  |
| Upgrade/downgrade     | `changeSubscriptionPlan` (prorated Stripe item swap)         |
| Cancel                | `cancelSubscription` (`cancel_at_period_end = true`)         |
| Resume                | `resumeSubscription`                                         |
| Update payment method | `createPortalSession` (Stripe Billing Portal, new tab)       |
| Invoices / history    | `getBillingData` (live Stripe invoices) + `listBillingEvents` |

Organisation-scoped checkout requires `owner`/`admin` membership, verified
server-side against `organisation_members`.

## Test-mode checklist before going live

1. Preview shows the test-mode banner (`pk_test_` token present).
2. Complete a Builder checkout with `4242 4242 4242 4242`.
3. Confirm a `subscriptions` row appears with `environment = 'sandbox'`,
   `plan_code = 'builder'`, `status = 'active'`.
4. Replay the same webhook delivery from Stripe and confirm the log line
   `Duplicate payments event ignored` (idempotency proof).
5. Cancel, then resume, and confirm `cancel_at_period_end` flips both ways.
6. Trigger `invoice.payment_failed` (card `4000 0000 0000 0341`) and confirm the
   row moves to `past_due`.
7. Open the Billing Portal and confirm invoices load.

Billing is production-ready only once every step above passes in sandbox.
