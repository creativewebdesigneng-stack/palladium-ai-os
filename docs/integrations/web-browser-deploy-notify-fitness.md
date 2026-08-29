# Web, browser, deployment, notification and fitness integration batch

This batch audits Firecrawl, Crawlee, browser-use, OpenHands, Coolify, ntfy and openGym and integrates their useful capabilities into existing PalladiumAI systems without importing parallel account, runtime or dashboard stacks.

## Decisions

- **Firecrawl (AGPL-3.0)**: concepts/API integration only. PalladiumAI does not copy Firecrawl source. Search, scrape and crawl are exposed through the native Web Intelligence workspace.
- **Crawlee (Apache-2.0)**: used as an optional self-hosted crawling worker behind Web Intelligence. PalladiumAI persists job state and applies its own auth/audit boundary.
- **browser-use (MIT)**: treated as an optional browser-agent provider. Browser session/domain/tool policy stays in PalladiumAI's existing Browser Runtime; no second browser session database is added.
- **OpenHands (MIT)**: treated as an optional external coding-agent server. Agent Runtime, Git control, approvals, audit, terminal boundaries and deployment remain PalladiumAI-owned.
- **Coolify (Apache-2.0)**: integrated into the existing Deployments page as a self-hosted deployment provider.
- **ntfy (Apache-2.0/GPL components upstream)**: HTTP push delivery is added to the existing Notifications Centre. No second notification inbox is created.
- **openGym (AGPL-3.0)**: concepts only. PalladiumAI reimplements workout planning and body-weight tracking in the native Fitness Studio using PalladiumAI auth/RLS/audit.

## Server-side configuration

- `FIRECRAWL_API_KEY`
- optional `FIRECRAWL_API_URL`
- `CRAWLEE_WORKER_URL`
- optional `CRAWLEE_WORKER_TOKEN`
- `BROWSER_USE_API_KEY`
- optional `BROWSER_USE_API_URL`
- `OPENHANDS_SERVER_URL`
- `COOLIFY_API_URL`
- `COOLIFY_API_TOKEN`
- optional `NTFY_BASE_URL` (defaults to `https://ntfy.sh`)
- optional `NTFY_TOKEN`

Provider secrets are not stored in user-owned integration tables.

## Security boundaries

Web Intelligence rejects local/private HTTP targets before provider submission to reduce SSRF risk. Browser automation continues to enforce the existing PalladiumAI domain allowlist and tool permissions. Deployment and push actions require authenticated server functions and create audit events. Fitness data is owner-scoped by RLS.
