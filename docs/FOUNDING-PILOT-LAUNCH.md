# Blackstar Founding Pilot launch controls

## Current implementation boundary

The launch feature registry and pure access-policy helpers are introduced in
`src/lib/launch/`. They are deliberately not a substitute for wiring the
policy into every route, navigation source, API handler, and agent tool executor.
Do not expose this branch to paying customers until that integration and its
end-to-end tests are complete.

## Feature status overrides

Set one of these server-side Vercel environment variables per feature:

- `BLACKSTAR_FEATURE_DASHBOARD=live`
- `BLACKSTAR_FEATURE_BILLING=beta`
- `BLACKSTAR_FEATURE_MISSION_CONTROL=hidden`

Accepted values are `live`, `beta`, and `hidden`. Invalid values fall back
to the registry default. Redeploy after changing environment variables.

Set `BLACKSTAR_ADMIN_EMAIL` to the owner's exact account email. Never put the
email in source code. Admin access is evaluated case-insensitively.

The access policy expects a trusted server-side actor containing the verified
email, a server-verified active pilot subscription flag, and beta feature IDs
explicitly enabled for that account. Never accept these fields from a browser
request.

## Initial recommended statuses

Live: landing, authentication, dashboard.

Beta: onboarding, billing, founding_pilot, agent_runtime, ai_chat,
notifications, settings.

Hidden: all other registry entries. Any unregistered feature must be treated
as hidden until it is added to the registry and explicitly reviewed.

## Stripe configuration plan

The existing application already has Stripe sandbox/live handling and a
payments webhook under `src/routes/api/public/payments/webhook.ts`. Its server
client currently uses the Lovable Stripe connection gateway and
`STRIPE_SANDBOX_API_KEY` / `PAYMENTS_SANDBOX_WEBHOOK_SECRET`, not the direct
`STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` requested for the Founding
Pilot. Reconcile the existing billing flow and subscription schema before
adding a second checkout or changing webhook routing. No keys belong in Git.

## Required release gates

1. Wire registry access to navigation and dashboard tile generation.
2. Add a route guard for every feature page, including dynamic nested routes.
3. Add server-side checks to every API route, server action, MCP tool and
   agent executor before side effects.
4. Verify pilot status and enabled beta feature IDs from trusted database
   records; never trust client-supplied role claims.
5. Implement direct Stripe Checkout with a one-off setup line item and monthly
   recurring line item, plus signed webhook reconciliation and Customer Portal.
6. Add webhook idempotency, subscription ownership checks, cancellation
   revocation and test/live environment separation.
7. Run typecheck, tests, production build and browser/API acceptance tests.

## Environment variables still required for the complete payment integration

- `BLACKSTAR_ADMIN_EMAIL`
- `STRIPE_SECRET_KEY` (test key initially)
- `STRIPE_WEBHOOK_SECRET` (test endpoint signing secret)
- `STRIPE_FOUNDING_PILOT_SETUP_PRICE_ID`
- `STRIPE_FOUNDING_PILOT_MONTHLY_PRICE_ID`
- `STRIPE_CUSTOMER_PORTAL_CONFIGURATION_ID` (if a non-default portal configuration is used)
- `APP_BASE_URL`

The payment variables above are documented only; checkout has not yet been
implemented by this change.
