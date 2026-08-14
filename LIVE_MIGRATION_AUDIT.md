# PalladiumAI — Mock Data & Simulation Audit

Scope: every module under `src/screens`, `src/components`, `src/lib`. Each item is
classified so it is clear what is legitimately illustrative and what must become
real. Category C and D items are the migration backlog.

## Categories

| Code | Meaning | Action |
| --- | --- | --- |
| A | Purely visual/illustrative content (marketing copy, docs examples, policy statements) | Keep |
| B | Presentation maps (icon, gradient, label lookups keyed by server values) | Keep |
| C | Real domain data hardcoded in the frontend even though a backend exists | Replace with server functions |
| D | Functionality that is simulated in the browser but has (or needs) a backend | Make real |
| E | Simulated by design pending external credentials (documented limitation) | Keep + document |

---

## Completed in this pass — Security Centre (was C + D)

`src/screens/Security.jsx` and the whole `src/components/security/*` tree used to
render a fabricated security posture: 8 invented metric cards, 7 fake device
sessions with fake IPs and cities, 12 fake API keys/tokens/service accounts, 5
invented alerts, 8 invented audit rows, a hardcoded score of 86 and fake backup
snapshots.

Now:

- New server function `getSecurityCentre` (`src/lib/security/security.functions.ts`),
  authenticated, user-scoped, reads `api_keys`, `webhooks`, `webhook_deliveries`,
  `integrations` and `mission_audit_logs` under RLS.
- Metrics, security score, score breakdown, alerts and recommendations are all
  **derived on the server** from those rows (expiring keys, failing webhook
  deliveries, integrations that lost access, denied/failed audit events, session
  assurance level and email verification). Nothing is stored client-side.
- Sessions: Supabase does not expose other browsers' sessions to an account
  holder, so the panel now shows the verified current session (from the JWT
  claims and request headers) plus the real sign-in/access trail from the audit
  log — instead of seven invented devices.
- API Security shows the caller's real keys (prefix only — secrets are never
  returned), real webhook endpoints with delivery/failure counts, and real OAuth
  connections, each linking to the Developer Portal / Integrations for management.
- Privacy and Backup panels were converted from fake toggles and invented
  snapshot sizes into accurate statements of server-enforced behaviour, with
  links to Memory and the Developer Portal for real actions (Category A).
- `securityData.jsx` now contains **only** icon/gradient lookup maps (Category B).

---

## Remaining backlog

### Category C — real domain data still hardcoded in the frontend

| File | Content | Replace with |
| --- | --- | --- |
| `src/components/admin-subs/subsData.jsx` | Subscriber list, MRR, churn, plan revenue | `src/lib/admin/admin.functions.ts` (platform metrics) + `subscriptions` table |
| `src/components/palladium/mockData.jsx` | `agents`, `tasks`, model catalogue | `listAgents` / `listTasks` (`src/lib/agents`, `src/lib/tasks`), model list from `model-gateway.server.ts` |
| `src/components/tools-framework/toolsData.jsx` (`INTEGRATIONS`) | Connector catalogue and plan gates | `listIntegrations` catalogue (`src/lib/integrations/providers.ts`) |
| CRM / Finance / Marketing / Business Intelligence screens | Pipelines, invoices, campaigns, KPIs | No backend tables exist yet — needs schema before wiring |
| `src/screens/Templates.jsx`, `Prompts.jsx`, `Skills.jsx` | Catalogue entries | `marketplace.functions.ts` listings |

### Category D — simulated behaviour with a backend available

| File | Simulation | Real path |
| --- | --- | --- |
| `src/components/terminal/TerminalView.jsx` | Local `runCommand` stub | Needs a sandboxed execution service; keep stubbed until one exists (currently honest: it states "sandboxed, no host access") |
| `src/components/browser/browserData.jsx` | Console/network/error feeds for the preview | Real browser-agent run logs from `src/lib/mission/browser-agent.ts` once a provider is configured |
| `src/components/computer/computerData.jsx` | Remote computers, action flow | Same browser-agent/runtime seam |
| `src/components/web/webData.jsx` (`AI_ANSWER`) | Canned AI answer | `runtime.functions.ts` model call |

### Category E — simulated by design (documented)

- **Browser agents / computer control** — no external browser-automation provider
  credentials are configured, so runs are simulated. See `PRODUCTION_READINESS.md`.
- **Stripe live payments** — sandbox/test mode until live keys are supplied. See
  `docs/BILLING.md`.

### Category A/B — intentionally illustrative (no action)

- Landing, Pricing, Features, Business, Developers, Resources, Legal, Help copy.
- Developer Portal request/response examples in documentation blocks.
- All `*_STYLE`, `*_META`, `*_BADGE`, icon/gradient lookup maps.
