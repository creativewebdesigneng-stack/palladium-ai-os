# PalladiumAI — Production Readiness

Last audited: 2026-08-18

This document tracks the current launch state of PalladiumAI. The threat model
assumes the browser is untrusted and that a user can replay, forge or alter any
frontend request. Secret values must never be returned to the client.

## 1. Security controls verified in code

| Risk | Current enforcement |
| --- | --- |
| Subscription or plan forgery | Subscription state is server/database authoritative; Stripe webhooks are signature verified. |
| Cross-user / cross-org access | RLS plus server-side organisation membership checks. |
| Tool escalation | Tool grants are resolved server-side against agent grants, active tools, plan entitlements and approval policy. |
| Purchase without approval | Shopping can discover and compare freely, but monetary commitment remains approval gated. |
| Unlimited spend by omission | **Fail closed.** Purchase preparation now requires at least one explicit per-transaction, user-monthly or agent-monthly ceiling. Read-only shopping remains available without a spend limit. |
| Payment credential exposure | Payment/provider secrets are server-only and never returned to the browser. |
| Browser URL escape | Browser actions are constrained by PalladiumAI domain allow-lists and the remote worker policy. |
| Admin data exposure | Platform-wide admin functions re-check platform-admin role server-side. |
| API-key theft | Developer API keys use hash-based lookup; revoked/expired keys are rejected. |

## 2. Live subsystem status

| Subsystem | State |
| --- | --- |
| Auth, organisations, roles and RLS | **Live** |
| Supabase database, storage and realtime | **Live** |
| Agent runtime, tasks, approvals and workflows | **Live** |
| AI gateway | **Live** — Lovable, Groq and OpenAI configured; Anthropic is optional and currently not configured. |
| Chat and research | **Live** |
| Memory / document ingestion / pgvector search | **Live** |
| Notifications | **Live** |
| Shopping discovery | **Live** — Google Shopping via SerpApi is primary; read-only smoke test returned 16 normalized offers for `office chair under £250`. |
| Browser worker | **Live** — Playwright production worker is integrated; Google Shopping remains the preferred product-discovery source. |
| Shopping approvals / checkout preparation | **Live, approval gated** — payment completion remains outside the agent. |
| Commute route UI / Google Maps handoff | **Live** |
| Traffic-aware Google Routes enrichment | **Code complete; external activation pending** — `GOOGLE_MAPS_API_KEY` is not configured. |
| Stripe sandbox | **Configured** |
| Stripe live | **External activation pending** — live webhook secret exists but `STRIPE_LIVE_API_KEY` is not configured. |
| Developer API / webhooks / rate limits | **Live** |
| Admin telemetry | **Live** — database-backed overview/analytics plus server-side launch capability status. |

## 3. Shopping / Browser production contract

Product discovery and monetary actions are deliberately separate:

- `find`, `search`, `show`, `compare`, and `recommend` run read-only discovery.
- Google Shopping is attempted first when `SERPAPI_API_KEY` is configured.
- Playwright is retained as the live browser/fallback layer.
- Explorer only renders rows with a trusted live-source marker, a valid HTTP(S)
  image URL and a valid HTTP(S) product URL.
- Historical/demo results are not substituted when a new search returns zero.
- `buy`, `order`, `checkout`, `book`, `reserve`, or equivalent commitment paths
  remain approval gated.
- Purchase preparation fails closed until the owner has configured at least one
  explicit spend ceiling.
- Agents never receive payment credentials and cannot authorise payment.

## 4. Runtime configuration snapshot

The application now exposes an **admin-only Launch Capabilities** status view that
returns configuration booleans and health states only; it never returns secret
values or provider endpoints.

Known runtime state from the 2026-08-18 audit:

- `SERPAPI_API_KEY`: configured and live-smoke-tested.
- `PLAYWRIGHT_BROWSER_ENDPOINT`: production browser worker integrated.
- `GOOGLE_MAPS_API_KEY`: **missing**.
- Stripe sandbox API key + sandbox webhook secret: configured.
- `STRIPE_LIVE_API_KEY`: **missing**.
- Live Stripe webhook secret: configured.
- Lovable, Groq and OpenAI provider credentials: configured.
- Anthropic credential: optional, currently missing.
- Supabase server runtime: configured and healthy.

No credential values belong in this document, Git history, client bundles or
admin responses.

## 5. External production settings still requiring operator verification

These cannot be truthfully completed by a code change alone:

1. **Google Maps Platform** — create/configure a server-side key with the Routes
   API enabled and add it as `GOOGLE_MAPS_API_KEY` to the production runtime.
2. **Stripe live** — complete Stripe go-live onboarding and add the production
   connection key as `STRIPE_LIVE_API_KEY`; then run a real-mode checkout and
   webhook lifecycle verification before accepting live billing.
3. **Supabase Auth** — verify in the production Auth dashboard that email
   confirmation is enabled. The current checked-in `supabase/config.toml` does
   not manage hosted Auth settings, so this must not be inferred from source.

## 6. Accepted / intentional conditions

- Some UI `*Data.jsx` modules contain templates, icon metadata, empty-state copy
  or design catalogues. Their existence alone is not evidence of mocked runtime
  data. Launch-critical pages should use server functions/database state as their
  source of truth.
- `SECURITY DEFINER` RLS predicate helpers remain callable where PostgreSQL RLS
  policies require them and resolve against `auth.uid()` internally.
- Billing remains in sandbox until `PAYMENTS_ENVIRONMENT=live` is explicitly set
  with complete live credentials. A missing live key must never cause an
  automatic fallback into an unintended account.

## 7. Release gate

Every production hardening pull request must pass the repository Backend Check:

```text
Install dependencies
High severity dependency audit
Production build and route generation
Typecheck
Tests
Browser worker syntax and policy tests
```

A branch is not merged into `main` until the full gate is green.

## 8. Definition of 100% production-live

PalladiumAI can be called **100% production-live** only when all of the following
are true:

- Final hardening branch is merged with the full CI gate green.
- Google Shopping and Playwright health are green in Admin → Launch Capabilities.
- Explicit spend controls are configured before monetary preparation.
- `GOOGLE_MAPS_API_KEY` is configured and a live traffic-aware route succeeds.
- `STRIPE_LIVE_API_KEY` is configured and the Stripe live lifecycle is verified.
- Hosted Supabase email-confirmation behaviour is verified in production.

Until those external items are complete, the codebase may be 100% code-ready
while the deployment is not yet 100% production-live.
