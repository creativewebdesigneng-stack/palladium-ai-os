# Canonical marketplace reconciliation

The final three absent names were legacy interfaces. Runtime callers now use the existing canonical `marketplace_listings`, `marketplace_seller_profiles` and buyer-owned `marketplace_orders`; no duplicate catalogue, profile, purchase table or payment system is created. The original missing-reference inventory has no remaining unreviewed names. Dynamic table names, columns and full authenticated journeys remain outside that narrow inventory claim.

## Restored behavior

Legacy agent catalogue, creator profiles, draft editing, moderation, AI Hub catalogue resources, public developer catalogue and billing history use canonical records. Seller verification is read from authoritative profile state. Reviews use the exact canonical buyer/order/listing/seller identity. Legacy seller-selected revenue share no longer controls money: existing fees remain £3 per listing, 2% below £10,000 and 8% at or above £10,000. Draft editing cannot silently rewrite published content.

Paid agent references require an owned paid or fulfilled order. Agent creation reuses the existing agent normalizer and provider/model defaults, then creates a paused agent with no tool permissions, required approval and approval-required autonomy. Publisher tool/model configuration is not adopted as authority. Existing runtime and skill/script security gates remain in place. No agent is executed by installation.

Creator earnings come from paid/fulfilled seller-net order amounts, including unpublished listing history, rather than estimated price-times-download totals. Other creators' earnings remain private. Unrecorded download/run/success metrics are unavailable, not fabricated. Cards show one-time prices; the Creator Hub links to existing fee checkout and purchase delivery. Verified review averages are calculated from canonical reviews for catalogue reads.

## Authority repairs

The live audit found owner-writable seller verification/Stripe readiness fields and listing payment/publication evidence, plus an ambiguous review-policy correlation that resolved the listing comparison to the order column on both sides. Private **invoker** triggers now protect those fields and bind reviews to exact paid orders. The insert policy separately qualifies every correlated identity. Missing `auth.uid()` never grants authority. Existing trusted service/database roles retain the authority required by signed webhooks and governed database RPCs.

Publication and moderation use narrow service-only invoker RPCs through authenticated server helpers. Caller RLS establishes listing ownership; the existing marketplace-admin allowlist governs moderation. Required audit precedes mutations. Publication atomically queues paid listings for review; unpaid drafts return the existing £3 fee requirement. Moderation locks and updates the matching paid pending listing and review case together. Ordinary sellers cannot publish themselves or invent payment evidence. Moderators can read others' pending listings through a specific RLS policy.

Stripe onboarding/status writes use the existing server client with explicit owner filters and write receipts. Onboarding requires persisted audit before account creation and a deterministic hashed idempotency key. Existing Express account, Checkout and signed webhook architecture is retained; no SDK/API migration, account, payment, checkout session or live provider request is performed. Guidance checked: [existing Express integration](https://docs.stripe.com/connect/express-accounts), [idempotency](https://docs.stripe.com/api/idempotent_requests), [key management](https://docs.stripe.com/keys).

## Verification and limits

Applied migrations: `20261016112409_reconcile_marketplace_legacy_contracts.sql` , `20261016113010_qualify_marketplace_review_purchase_policy.sql` and `20261016113613_consolidate_marketplace_listing_policies.sql`. Live preflight and post-apply checks show zero listings, orders, seller profiles and reviews; no financial or publication state is backfilled. All new governance functions are invokers and public governance RPCs deny authenticated/anonymous execution. The isolated Postgres suite passes 47 checks, including preservation of trusted verification during public profile upserts. The focused application suite passes 22 tests and covers canonical reads, paid/refunded ownership checks, paused agent creation, real earnings, required audit and mocked Stripe ownership writes.

The release build and TypeScript check passed. The preceding full application run passed 2,802 tests; the subsequent focused run includes one additional unlisted-edit regression. Final exact-commit CI is recorded in the pull request. All 308 public tables have RLS enabled. After consolidating listing policies, the performance advisor reports only 658 existing unused-index informational findings, with no performance warnings.

Authenticated checkout, provider onboarding, moderator decisions, delivery and agent activation remain uncertified while deployed server credentials and authenticated end-to-end access remain unresolved. Existing public seller-profile visibility is unchanged; this is not a blanket audit of every commerce surface. No percentage or full-site certification is claimed.
