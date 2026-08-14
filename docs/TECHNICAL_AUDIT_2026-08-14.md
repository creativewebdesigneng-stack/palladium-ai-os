# PalladiumAI Technical Audit — 2026-08-14

This audit was performed against the application source and Supabase migrations in this workspace. It distinguishes a persisted or provider-backed capability from UI-only presentation data. It does not represent a live deployment probe.

## A. Genuinely live

| Area                             | Evidence                                                                                                                                        |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication and authorisation | Supabase bearer-token middleware, profiles, organisations, roles and RLS policies.                                                              |
| Agent runtime                    | Server-side queued/running/terminal task lifecycle, provider gateway, cancellation, timeout/reaping, usage/audit/notifications and tool loop.   |
| Agent management and tasks       | Authenticated server functions and RLS-backed `personal_agents`, `agent_tasks` and activity rows.                                               |
| Workforces and workflows         | Persisted workforce/workflow/step/run records, dependency waves, retries, handoffs and run history.                                             |
| Memory                           | Persisted memories/documents/chunks, embeddings gateway, pgvector search and optional Pinecone/Weaviate adapters.                               |
| Tools and approvals              | Tool catalogue, grants, plan gating, domain grants, execution ledger, spend caps and approval requests.                                         |
| Integrations                     | OAuth catalogue, HMAC state, server-side code exchange and encrypted credential storage. Provider credentials are required per integration.     |
| Notifications                    | Persisted notification preferences and event records, with Supabase Realtime client consumption.                                                |
| Billing and entitlements         | Server-resolved subscriptions/usage, Stripe checkout and signature-verified webhook lifecycle. Sandbox only according to project configuration. |
| Developer API and webhooks       | Hashed API keys, scopes/quotas/logging and signed outbound webhook envelopes.                                                                   |
| Dashboard data                   | The core dashboard functions query persisted agent/task/workforce/usage records; individual feature screens vary.                               |

## B. Simulated or mock

- Browser/shopping automation defaults to a clearly-stamped development simulation when no configured production worker is available. It performs no network access. Production requires either `PLAYWRIGHT_BROWSER_ENDPOINT` (plus optional `PLAYWRIGHT_BROWSER_TOKEN`) or `BROWSERBASE_API_KEY`, `BROWSERBASE_PROJECT_ID` and `BROWSERBASE_RUNNER_ENDPOINT`.
- Many feature pages still import static presentation data, including admin organisations/subscriptions/dashboard, generic agents, knowledge, MCP hub, AI builder, git/version control, files, deployments, models, some analytics, and assorted dashboard widgets. Those screens must be connected to server functions or show honest empty states before being called operational.
- `AIKnowledgeSearch`, Git AI actions, Custom API “test”, and selected builder/preview panels contain timeout-driven presentation-only results.

## C. Partially implemented

- Browser automation has a provider abstraction and remote contract, but PalladiumAI does not ship the external Playwright worker or a Browserbase runner. Provider health is tested, but egress controls are deployment responsibilities.
- OAuth connections are complete; most listed integration tools are not yet concrete provider-specific executors. A connected account alone does not make an agent able to operate Slack, Google, etc.
- Workflow execution runs agent steps. Imported non-agent kinds (`api`, `database`, `notification`, `loop`, etc.) are accepted by the importer but are not implemented as distinct executors in the workforce engine.
- Browser push notifications are preference/data support only; there is no web-push subscription/delivery service.
- Billing supports sandbox lifecycle. Live payments require live Stripe credentials and matching lookup-key prices.

## D. Bugs and security issues

### Fixed in this change

1. **Outbound-webhook SSRF** — creation accepted `http://localhost`, endpoint updates had no URL validation, and delivery used stored URLs directly. A shared validator now requires HTTPS and rejects credentials, localhost/private IPv4/IPv6 ranges, metadata IPs and `.local` hosts. It is applied on create, update, test delivery and ordinary delivery.
2. **Browser provider trust boundary** — remote provider URL actions relied on the remote worker to enforce domain policy. The adapter now verifies direct URLs, provider-returned redirect/history URLs and checkout URLs at the PalladiumAI boundary as well. The simulated provider has matching direct checks.

### Remaining deployment risks

- URL validation cannot prevent DNS rebinding. Production must enforce outbound egress rules that deny private, link-local and metadata addresses after DNS resolution.
- This workspace copy has no accessible `.git` directory, so changes cannot be committed here despite the requested small-commit workflow.
- Dependency installation in this workspace is incomplete/corrupt (package manifests and `.bin` shims were not written), so automated checks have not yet run. This is an environment issue, not a passing verification result.

## E. Missing functionality

1. Ship and operate a production browser worker with authentication, post-DNS egress filtering, per-session isolation and action audit logs.
2. Implement provider-specific integration tool executors with token refresh, scope checks and least-privilege mappings.
3. Either implement every workflow step kind the importer accepts or reject unsupported kinds at import/save time.
4. Replace static mock feature screens incrementally with persisted queries and honest empty states, starting with dashboards/admin/support/knowledge.
5. Add an asynchronous durable execution layer for long workflow runs; request handlers should not be the only worker.
6. Add delivery retry/backoff/dead-letter processing for webhooks and a web-push delivery implementation if browser push remains exposed.
7. Complete go-live Stripe configuration and production operational monitoring/backups.

## F. Prioritised implementation plan

1. **P0 — runtime/security:** finish provider-boundary tests, enforce outbound egress policy, repair local dependency tooling, and run test/type/lint/build gates.
2. **P0 — execution correctness:** reconcile workflow editor/importer with actual executable step types; reject or implement every accepted kind.
3. **P1 — real integrations:** add token-refreshing, scope-aware executors beginning with Google and Slack, plus integration health/sync logs.
4. **P1 — durable orchestration:** move workflow execution/retries/webhook retry queues to a managed worker or Supabase-supported background job pattern.
5. **P1 — product honesty:** remove static operational metrics from the highest-traffic screens and replace them with database-backed data or explicit empty/setup states.
6. **P2 — production operations:** configure live Stripe, browser provider, egress firewall, alerting, backups, retention and deployment health checks.
