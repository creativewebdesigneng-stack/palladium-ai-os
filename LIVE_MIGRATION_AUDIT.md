# PalladiumAI — Mock Data & Simulation Audit

Last reconciled against `main`: 2026-08-20.

This document tracks product surfaces that could mislead users by showing hardcoded domain data or simulated behaviour as though it were live. Pure marketing copy, documentation examples, icon maps, colour maps and empty-state examples are not mock-product data.

## Current result

The previously identified Category C/D production-data backlog is now cleared for the audited application surfaces. The remaining items are external launch configuration or deliberately unsupported capabilities that are labelled honestly.

### Live and backend-backed

- **Security Centre** — authenticated, RLS-scoped security posture derived from API keys, webhooks, integrations, audit events and verified session claims.
- **Admin Subscriptions** — live subscription/admin server functions. The old `src/components/admin-subs/subsData.jsx` fixture has been removed.
- **Agents, tasks and model configuration** — live agent/task/runtime functions; the old Palladium mock-data module no longer exists.
- **Tools & Integrations** — live tool registry and permissions. Integration cards come from the canonical `listIntegrations().catalogue` backend provider registry rather than a frontend provider mirror.
- **CRM** — persisted contacts, pipeline stages and CRM activity through `src/lib/business/crm.functions`.
- **Finance** — persisted transaction ledger and calculated totals through `src/lib/business/finance.functions`.
- **Marketing** — persisted campaigns and recorded performance counters through `src/lib/business/marketing.functions`.
- **Business Intelligence** — cross-module analytics derived from persisted Finance, CRM, Marketing and agent/workflow records.
- **Templates** — live marketplace/template listings.
- **Prompt Workspace** — persisted owner-scoped saved prompts, immutable versions and model run history; executions use the production model gateway with usage/audit controls.
- **Skills** — live tool registry and server-enforced permissions.
- **Browser Preview / Computer Control** — real browser-provider state, persisted sessions and tool executions. The obsolete fabricated `browserData.jsx` telemetry fixture has been removed.
- **PalladiumAI Web** — authenticated server-side public web search using real provider results with safe-public-URL checks, timeouts, bounded results, usage recording and audit logging. The old canned `webData.jsx` fixture has been removed.
- **Research** — live public web evidence plus cited AI synthesis.
- **Terminal** — authenticated diagnostic commands execute in fresh `secure: true` E2B sandboxes. Commands are allowlisted, shell composition/network clients/arbitrary inline code are rejected, runtime/output are bounded, no filesystem state persists, sandboxes are always killed, and executions are entitlement-limited, usage-recorded and audited. The Terminal never provides PalladiumAI host access.

## Explicit capability limit — honest, not simulated product data

### Image discovery

PalladiumAI Web does not expose an image-results tab until a dedicated image-search provider returns real source-backed image metadata. Video/YouTube-oriented discovery is currently supported as ordinary verified public web links.

## External launch configuration still required

These are deployment/operator prerequisites rather than frontend mock-data migrations:

- **Stripe live mode** — supply the live Stripe secret/webhook configuration and complete a real subscription lifecycle test. Test/sandbox billing is not production settlement.
- **Google Routes traffic data** — supply `GOOGLE_MAPS_API_KEY` and complete a live route request if traffic-aware routing is part of the launch scope.
- **Supabase hosted email confirmation** — verify hosted production auth requires confirmed email before session access.
- **Production provider/secrets health** — verify required model, search, browser, E2B and OAuth provider credentials are present in the deployed environment and run smoke tests against each enabled provider.

See `PRODUCTION_READINESS.md` for the wider deployment checklist.

## Intentionally illustrative content

No migration required for:

- Landing, Pricing, Features, Business, Developers, Resources, Legal and Help copy.
- Developer Portal request/response documentation examples.
- Icon, gradient, label, badge and status lookup maps that contain no customer/domain records.
- Empty-state examples that are clearly presented as examples rather than live results.
