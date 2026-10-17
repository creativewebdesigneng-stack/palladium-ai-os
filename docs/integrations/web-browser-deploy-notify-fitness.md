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
- `CRAWLEE_WORKER_TOKEN` (required authenticated worker connection)
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

### 17 October 2026 network-policy correction

Web Intelligence reuses the shared public-network and authenticated provider HTTP
boundaries. Both provider connections require HTTPS without embedded URL
credentials, query strings or fragments and a nonempty server-side token. The
Crawlee token is now required; anonymous workers must be secured before use.
Configuration flags reflect these requirements, not live execution certification.

The shared target URL check rejects private/reserved IPv4 and IPv6 literals,
mapped IPv4/NAT64 literals, local hostnames (including trailing dots) and embedded
credentials. Before scrape/crawl dispatch, every current target DNS answer is
checked; provider DNS is checked separately before credentials are sent. Requests
reuse the existing nonredirecting 20-second/256-KiB JSON boundary. Upstream error
bodies are not exposed in saved errors. Public HTTP target pages remain supported;
provider connections require HTTPS.

These application checks do not pin a DNS answer through connection establishment.
Worker-side egress filtering and validation of every crawl/navigation redirect
remain necessary to prevent rebinding or remote-provider access to private networks.
This change does not deploy a Crawlee/Browser Use worker or certify a live crawl.
