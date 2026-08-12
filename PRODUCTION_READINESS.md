# PalladiumAI — Production Readiness

Last audited: 2026-08-10

This document records the outcome of the full security and production audit.
The threat model assumed throughout: **the attacker fully controls the browser
and can replay, forge or modify any request the frontend makes.**

---

## 1. Verified attack scenarios

Each row was traced end to end (database policy → server function → route).

| Attack | Result | Enforcement point |
| --- | --- | --- |
| Give themselves a paid subscription | Blocked | `subscriptions` has no INSERT/UPDATE/DELETE policy — writes only via service role in the verified Stripe webhook |
| Bypass Stripe / activate a plan client-side | Blocked | Client plan activation removed; plan state derives from `subscriptions` only |
| Change their own plan | Blocked | Same as above; checkout only creates a Stripe session |
| Bypass usage limits | Blocked | `assertWithinLimit` runs server-side against counted rows; `usage_records` is insert-only via service role; forged `orgId` now rejected (membership verified) |
| Read another user's data | Blocked | RLS on every user table scoped to `auth.uid()` |
| Access another organisation | Blocked | `is_org_member` / `org_admin` security-definer predicates on all org tables |
| Read another user's memory | Blocked | `agent_memories`, `memory_chunks`, `memory_documents`, `personal_memories` are owner/org scoped; vector search functions run as invoker under RLS |
| Execute tools without permission | Blocked | Tool resolution checks agent `allowed_tools`, `tools.is_active`, `tools.min_plan` against the server-resolved plan, and `tool_permissions` |
| Purchase without approval | Blocked | Commerce tools only write `purchase_requests` + a linked `approval_requests` row; no payment path exists without an approved decision |
| Access payment credentials | Blocked | Stripe secret read only inside handlers via `process.env`; never returned to the client |
| Forge Stripe webhooks | Blocked | Signature verified against the webhook secret before any write |
| Use another user's API key | Blocked | Keys stored as SHA-256 hashes; lookup by prefix + hash compare; revoked/expired keys rejected |
| Escalate privileges | Blocked | Roles live in `user_roles` (never on `profiles`); `prevent_profile_privilege_change` trigger blocks self-service `role`/`org_id` edits |
| Execute arbitrary server code | Blocked | No `eval`, no dynamic module loading from input; all server inputs validated at the boundary |

## 2. Fixes applied during the audit

**Database**

- `prevent_profile_privilege_change` trigger: users can no longer change their
  own `role` or `org_id` through the Data API.
- `EXECUTE` revoked from `anon`/`authenticated` on privileged routines:
  `record_usage`, `reap_stale_agent_tasks`, and trigger helpers
  (`set_updated_at`, `handle_new_user`, `handle_new_organisation`).
- `workflow_run_is_visible` no longer callable by signed-out visitors.
- `effective_plan` and `has_active_subscription` reserved for trusted server
  code, so a signed-in user cannot probe another account's plan.

**Application**

- `getEntitlements` verifies organisation membership before using a
  client-supplied `orgId` as the usage-counting scope (previously a forged id
  produced an empty usage window).
- `localStorage` removed as a source of truth for authentication,
  subscriptions, permissions and usage. `AuthContext` loads authoritative
  entitlements from the server; `access.js`, `permissions.js` and `usage.js`
  read server state only.
- Dev/admin bypasses removed from `Login.jsx`, `access.js` and `permissions.js`.
- `Payment.jsx` no longer activates plans locally; free tier is the server default.
- `UsageDashboard` shows real consumption; the "reset demo usage" control is gone.

## 3. Second hardening pass (2026-08-12)

**Database**

- `marketplace_reviews` no longer readable by anonymous visitors: the
  `USING (true)` public policy was replaced with an `authenticated`-only policy
  and `SELECT` was revoked from `anon`, so reviewer identities (`user_id`) are
  never exposed to the public internet. All review reads and writes already run
  through `requireSupabaseAuth` server functions.
- Full policy sweep re-run across all 53 public tables: RLS is enabled
  everywhere; SELECT/INSERT/UPDATE/DELETE coverage was checked table by table.
  Ledger tables (`subscriptions`, `usage_records`, `api_request_logs`,
  `webhook_deliveries`, `tool_executions`, `billing_webhook_events`,
  `mission_audit_logs`, `workflow_runs`, `workflow_step_runs`, `agent_messages`,
  `marketplace_purchases`, `plans`, `tools`, `user_roles`) intentionally expose
  **no** user write policies — they are written only by trusted server code.
- Storage: the `knowledge` bucket is private, with INSERT/SELECT/UPDATE/DELETE
  policies scoped to `storage.foldername(name)[1] = auth.uid()`. No public
  object URLs exist.

**Tests** — Vitest suites now cover the highest-risk backend logic (58 tests):

| Suite | Covers |
| --- | --- |
| `src/lib/billing/__tests__/billing.test.ts` | Stripe webhook signature verification (valid, forged, wrong secret, tampered body, stale replay, missing header) and the plan ↔ price mapping, including rejection of client-supplied Stripe price ids |
| `src/lib/platform/__tests__/entitlements.test.ts` | Plan resolved from `subscriptions` only, another user's subscription ignored, forged `orgId` rejected, allowance exhaustion, unlimited metrics |
| `src/lib/devapi/__tests__/api-auth.test.ts` | Valid / unknown / revoked / expired keys, missing key, scope enforcement, hash-only storage, plan execution gate, per-minute quota from real logs, no cross-user quota bleed, org-scoped plan resolution |
| `src/lib/shopping/__tests__/limits.test.ts` | Per-transaction, per-agent and account monthly ceilings; only committed purchases counted; tightest ceiling wins |
| `src/lib/runtime/__tests__/runtime.test.ts` | Task lifecycle, cancellation, timeouts, provider failure messages never leaking provider internals, usage recording |
| `src/lib/runtime/__tests__/tools.test.ts` | Tool grants, unknown slugs, plan minimums, disabled permissions, domain allowlists |

## 4. Known remaining warnings (accepted)

- **`SECURITY DEFINER` functions callable by signed-in users** — these are the
  RLS predicate helpers (`has_role`, `is_org_member`, `has_org_role`,
  `org_admin`, `can_access`, `team_org`, `agent_is_visible`,
  `workflow_is_visible`, `workflow_run_is_visible`, `workforce_is_visible`).
  They must be callable by `authenticated` because policies invoke them, and
  each one resolves against `auth.uid()` internally. Intentional.
- **`creator_profiles` public read** — publisher display name, handle, bio,
  website and avatar for marketplace listing pages. No email or contact data.
- **`billing_webhook_events` has RLS with no policy** — deliberate: the
  idempotency ledger is service-role only.
- **React Fast Refresh warnings (11)** — shadcn/ui primitives export variants
  alongside components. Cosmetic, dev-only.

## 5. Real vs simulated subsystems

| Subsystem | State |
| --- | --- |
| Auth, organisations, roles | Real |
| Subscriptions, checkout, webhooks, lifecycle (upgrade / downgrade / cancel / resume) | Real (Stripe, sandbox credentials configured) |
| Agent runtime, streaming, tasks, cancellation, usage | Real (OpenAI / Anthropic via the AI gateway) |
| Memory, embeddings, semantic search, document ingestion | Real (pgvector + private storage bucket) |
| Tools, permissions, approvals, spend limits | Real |
| Developer API, keys, webhooks, rate limits | Real |
| Workforce orchestration (sequential, parallel, conditional, retries) | Real |
| Notifications | Real (Supabase Realtime) |
| **Browser agent** | **Simulated** unless an external browser provider is configured. The built-in provider performs no network access and returns clearly labelled placeholder results. Live shopping research is therefore **not** production-ready until a provider is registered. |
| **Live Stripe payments** | **Not enabled.** Only sandbox credentials exist (`STRIPE_SANDBOX_API_KEY`, `PAYMENTS_SANDBOX_WEBHOOK_SECRET`). Live checkout requires go-live onboarding. |

Everything in the "Real" rows was exercised against the live database or unit
tests. The two rows above must not be described as production-ready.

## 6. Required configuration

**Supabase / Cloud backend** — provisioned. Server-side only:
`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
Browser-visible: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
`VITE_SUPABASE_PROJECT_ID`. The `knowledge` storage bucket and all RLS policies
are already in place.

**Stripe** — sandbox works today. For live payments: complete go-live
onboarding, then `STRIPE_LIVE_API_KEY` and `PAYMENTS_LIVE_WEBHOOK_SECRET` are
required. Prices must exist under the lookup keys in
`src/lib/billing/catalog.ts` (`pro_monthly`, `pro_yearly`, `business_monthly`,
`business_yearly`, `enterprise_monthly`, `enterprise_yearly`); the frontend can
never supply a price id.

**AI providers** — `LOVABLE_API_KEY` (gateway) is configured. Direct
`OPENAI_API_KEY` / `ANTHROPIC_API_KEY` are optional and only needed to bypass
the gateway.

**Browser provider** — required for live browsing/shopping research. Without it
the shopping agent stays in simulated mode.

## 7. Verification commands

```
bun run lint          # 0 errors, 11 accepted warnings
bun run build:dev     # succeeds
bun run backend:check # tsgo --noEmit + vitest: 58 tests, 6 files, all passing
```

## 8. Before public launch

1. Complete Stripe go-live, swap in live credentials, and re-verify checkout,
   renewal, failed payment, upgrade, downgrade, cancellation and webhook replay
   against live mode.
2. Register a real browser-agent provider, or hide the shopping research
   surfaces until one exists.
3. Confirm email confirmation is enabled and anonymous sign-ups stay disabled.
4. Set per-organisation spend ceilings (`spend_limits`) as onboarding defaults.
5. Re-run the security scan after any new table, policy or storage bucket.

