# Blackstar browser-worker development preview — 13 October 2026

**Scope:** isolated preview branch only. This file triggers the standard Vercel Git preview from the existing Blackstar repository; it introduces no runtime changes and is not intended to merge into production.

- Branch: `integration/browser-worker-live-preview-20261013`.
- Worker: the existing local Windows Playwright worker, already accepted by the operator locally and via HTTPS smoke.
- URL: `https://desktop-ucrdslf.tail7a3608.ts.net:8443` (development tunnel only).
- Vercel preview server environment: `PLAYWRIGHT_BROWSER_ENDPOINT`, `BROWSER_AGENT_PROVIDER=playwright` and `BROWSER_AGENT_ALLOW_SIMULATION=false` are branch-scoped.
- `PLAYWRIGHT_BROWSER_TOKEN` **must be entered by the operator directly in Vercel as a protected, encrypted or sensitive preview variable scoped to this branch**. Do not paste it in chat, commit it, or store it in plain text.
- Redeploy **this preview branch** after setting the secret (environment changes do not update existing deployments). Verify that the matching preview reports the Playwright provider as production-connected only after the authenticated /health check verifies real Chromium readiness, then perform a separate owner-authorised Blackstar agent browser task.
- Do not set browser-provider variables in the Vercel Production environment or grant paid users access to this PC worker. Commercial-grade hosting, tenant isolation, abuse protection and network egress controls are not yet certified.

A passing smoke test against the worker itself is not a passing platform agent end-to-end test.
