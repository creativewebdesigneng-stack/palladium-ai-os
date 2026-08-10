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

## 3. Known remaining warnings (accepted)

- **`SECURITY DEFINER` functions callable by signed-in users** — these are the
  RLS predicate helpers (`has_role`, `is_org_member`, `has_org_role`,
  `org_admin`, `can_access`, `team_org`, `agent_is_visible`,
  `workflow_is_visible`, `workflow_run_is_visible`, `workforce_is_visible`).
  They must be callable by `authenticated` because policies invoke them, and
  each one resolves against `auth.uid()` internally. Intentional.
- **React Fast Refresh warnings (11)** — shadcn/ui primitives export variants
  alongside components. Cosmetic, dev-only.

## 4. Simulated vs real subsystems

| Subsystem | State |
| --- | --- |
| Auth, organisations, roles | Real |
| Subscriptions, checkout, webhooks | Real (Stripe) |
| Agent runtime, streaming, tasks | Real (OpenAI / Anthropic gateway) |
| Memory, embeddings, semantic search | Real (pgvector) |
| Tools, permissions, approvals | Real |
| Developer API, keys, webhooks, rate limits | Real |
| Workforce orchestration | Real |
| **Browser agent** | Falls back to a clearly labelled `simulated` provider when no external browser provider is configured. It performs no network access. Register a real provider to enable live browsing. |

## 5. Required environment configuration

Server-side only (never exposed to the browser):

- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SANDBOX_API_KEY` (live key for production), `PAYMENTS_SANDBOX_WEBHOOK_SECRET`
- `LOVABLE_API_KEY` (AI gateway)
- Model provider keys for any non-gateway provider you enable
- Browser-agent provider credentials, if you enable live browsing

Browser-visible: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
`VITE_SUPABASE_PROJECT_ID`.

## 6. Verification commands

```
bunx tsgo --noEmit    # clean
bun run lint          # 0 errors, 11 accepted warnings
bun run build:dev     # succeeds
```

There is no test runner configured in this project yet; adding one for
`entitlements.server.ts`, `api-auth.server.ts` and the webhook signature check
is the highest-value next step.

## 7. Before going live

1. Swap Stripe sandbox credentials for live keys and re-point the webhook.
2. Confirm email confirmation is enabled and anonymous sign-ups stay disabled.
3. Create the storage bucket(s) for document memory with owner-scoped policies
   (none exist yet — uploads currently go through database-backed memory only).
4. Set a spend cap per organisation in `tool_permissions` for commerce tools.
5. Re-run the security scan after any new table or policy.
