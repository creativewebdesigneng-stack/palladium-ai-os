# Blackstar Founding Pilot launch controls

## Implementation in this branch

- Central feature registry: `src/lib/launch/feature-registry.ts`
- Per-user feature policy: `src/lib/launch/feature-access.ts`
- App route ownership map: `src/lib/launch/route-features.ts`
- Browser access provider and Coming Soon screen: `src/lib/launch/LaunchAccessProvider.jsx`
- Access snapshot API: `GET /api/launch/access`
- Admin beta grants API: `POST /api/launch/grants`
- Stripe Checkout: `POST /api/launch/checkout`
- Stripe Customer Portal: `POST /api/launch/portal`
- Founding Pilot webhook: `POST /api/launch/webhook`
- Supabase entitlement table: `supabase/migrations/20261117170000_blackstar_pilot_access.sql`

The new Founding Pilot payment flow is separate from the existing Lovable-gateway billing system. It uses direct Stripe credentials and a dedicated entitlement table so existing billing flows and historical subscriptions are not rewritten.

## Feature status overrides

Set server-side Vercel environment variables per feature:

- `BLACKSTAR_FEATURE_DASHBOARD=live`
- `BLACKSTAR_FEATURE_BILLING=beta`
- `BLACKSTAR_FEATURE_MISSION_CONTROL=hidden`

Accepted values are `live`, `beta`, and `hidden`. Invalid values fall back to the registry default. Redeploy after changing an environment variable.

Set `BLACKSTAR_ADMIN_EMAIL` to the owner's exact account email. Never put the email in source code. Admin access is evaluated case-insensitively against the verified Supabase JWT email claim.

## Default statuses

Live: landing, authentication, dashboard.

Beta: onboarding, billing, founding_pilot, agent_runtime, ai_chat, notifications, settings.

Hidden: workforce, mission_control, agent_builder, agent_marketplace, agent_workspaces, ai_hub, ai_models, ai_tools, automation, memory, knowledge, files, research, web_intelligence, integrations, business_hub, crm, marketing, finance, analytics, commerce, shopify, creative_studio, cinema_studio, developer_tools, communications, security, projects.

Any route not mapped in `route-features.ts` is denied in the application shell unless the user is the configured admin. This is intentional fail-closed behaviour, but it is not a substitute for adding server-side feature checks to every related server action and API endpoint.

## Pilot beta grants

A paid pilot receives the `billing` beta grant by default so the customer can manage their subscription. Other beta features require an explicit per-account grant.

Admin endpoint:

`POST /api/launch/grants`

Send a verified admin bearer token and JSON:

```json
{
  "userId": "SUPABASE_AUTH_USER_UUID",
  "betaFeatures": ["agent_runtime", "ai_chat"]
}
```

Only feature IDs currently configured as `beta` can be granted. To grant a feature, first set its `BLACKSTAR_FEATURE_<FEATURE_ID>=beta` environment variable and redeploy, then call the endpoint. An empty array revokes all beta grants for that pilot. The endpoint only changes an active pilot entitlement in the deployment's configured Stripe mode.

## Stripe Founding Pilot flow

The public page is `/founding-pilot`. Checkout requires a signed-in user whose email is in `BLACKSTAR_PILOT_INVITE_EMAILS` (comma-separated). Checkout runs in subscription mode with both a one-off setup Price and a recurring monthly Price. Stripe's signed webhook writes the authoritative entitlement; the browser's success redirect never grants access.

Webhook endpoint: `/api/launch/webhook`

Subscribe the Stripe test webhook endpoint to:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

The webhook verifies the Stripe signature, enforces test/live mode matching, and upserts the user's Founding Pilot entitlement. Only `active` and `trialing` rows grant access. Cancellation or any other non-active status removes access on the next signed subscription event.

The billing screen has a Founding Pilot Customer Portal action for active pilot accounts. The existing platform billing portal remains unchanged.

## Vercel environment variables

Required for Founding Pilot checkout and access:

- `BLACKSTAR_ADMIN_EMAIL` — your admin login email.
- `BLACKSTAR_PILOT_INVITE_EMAILS` — comma-separated invited customer email addresses.
- `STRIPE_MODE=test` — keep this set to test for the pilot staging rollout.
- `STRIPE_SECRET_KEY` — Stripe test secret key (`sk_test_...`).
- `STRIPE_WEBHOOK_SECRET` — signing secret for the new webhook endpoint (`whsec_...`).
- `STRIPE_FOUNDING_PILOT_SETUP_PRICE_ID` — Stripe one-time GBP setup Price ID.
- `STRIPE_FOUNDING_PILOT_MONTHLY_PRICE_ID` — Stripe recurring monthly GBP Price ID.
- `APP_BASE_URL` — canonical app origin, e.g. `https://palladium-ai-os.vercel.app`.

The app also needs its existing Supabase server/browser configuration. The migration requires the Supabase server-side admin key already used by the project. Do not put any secret in a `VITE_*` variable or commit it.

Optional feature flags:
- `BLACKSTAR_FEATURE_<FEATURE_ID>=live|beta|hidden` for any registry ID (uppercase, underscores retained).

## Stripe test procedure

1. Create a one-time setup Price and a monthly recurring Price in Stripe test mode.
2. Put both Price IDs and the test secret key in Vercel Preview environment variables.
3. Apply the Supabase migration before deploying this branch.
4. Add your own test customer email to `BLACKSTAR_PILOT_INVITE_EMAILS`.
5. Configure the Stripe test webhook URL `https://YOUR-PREVIEW-URL/api/launch/webhook` with the three event types above and copy its signing secret to `STRIPE_WEBHOOK_SECRET`.
6. Sign in using the invited test account and open `/founding-pilot`.
7. Complete Checkout using Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC, and a valid test billing postcode.
8. Confirm the webhook creates an active `blackstar_pilot_access` row. The customer should see the live features and billing only.
9. As admin, grant beta features through `POST /api/launch/grants` and verify they appear.
10. Cancel the test subscription in Stripe, ensure the signed `customer.subscription.deleted` or updated event arrives, and verify pilot-only features disappear.

## Release gates still outstanding

- The agent streaming and steering endpoints return 403 when agent runtime is disabled.
- Public developer API endpoints for agents, tasks, workflows, workforces, marketplace and usage now use the feature-aware API auth middleware and return 403 before handler execution when their feature is unavailable.
- The app shell, sidebar, command menu, topbar, dashboard quick actions/tiles, and Coming Soon handling are wired to the access snapshot.
- Other feature-specific server actions, MCP tool invocation, OAuth/integration execution, internal worker queues and communication/retail webhook paths still need their own entitlement checks. Do not expose those features to customers until this route-by-route pass is complete.
- No production build, typecheck, browser acceptance test or end-to-end Stripe test has been run from this GitHub-only editing session. Do not merge/deploy until CI passes and the remaining server-side protections are completed.
