# PalladiumAI Playwright Browser Worker

This service implements the production browser contract used by `src/lib/mission/browser-agent.ts`.

## Endpoints

All endpoints require `Authorization: Bearer <BROWSER_WORKER_TOKEN>`.

- `POST /health` — starts and verifies actual Chromium (`browserReady:true`), not just a Node heartbeat
- `POST /session` with `{ "allowedDomains": ["example.com"] }`
- `POST /action` with `{ "sessionId": "...", "action": "navigate", "params": { ... } }`

Sessions are short-lived, capped, isolated Playwright browser contexts. Concurrent session requests reserve capacity before launching Chromium, and each session permits one active action at a time (409 when busy). Capacity failures return HTTP 429. The worker does not close a session in the middle of an active action; expired idle sessions are reclaimed automatically. This is single-process admission; use sticky sessions or a separate coordinator before running multiple replicas. Top-level navigation must stay inside the session allow-list. Local/private network targets are blocked, including DNS results that resolve to private IP space.

## Run locally

```bash
cd browser-worker
npm install
npx playwright install chromium
BROWSER_WORKER_TOKEN=your-long-private-random-value npm start
```

The worker listens on port `8787` by default.

## Docker

```bash
docker build -t palladium-browser-worker browser-worker
docker run --rm -p 127.0.0.1:8787:8787 -e BROWSER_WORKER_TOKEN=your-long-private-random-value palladium-browser-worker
```

## Hosting choice and cost

The committed Render Blueprint uses the **starter** plan, which can be a paid service. Do not create a new Render/Railway service if you need zero hosting charges or have not approved hosting cost. You can run this Docker worker on a computer you already own and publish a narrowly restricted **HTTPS** endpoint through an authenticated tunnel/reverse proxy; this still consumes your computer's electricity and requires reliable connectivity. Keep the private worker bearer token in the host's and Vercel's protected environment variables.

**The built Docker image now includes every runtime import** (`dom-snapshot.mjs`, `qa-inspection.mjs` and `storage-state.mjs`). CI checks the dependency closure so a future import cannot silently break startup.

## Deploy on Render

The repository root contains `render.yaml`, which defines a Docker web service named `palladium-browser-worker` in Render's Frankfurt region.

1. In Render, create a new Blueprint from this GitHub repository.
2. Render reads `render.yaml` and prompts for `BROWSER_WORKER_TOKEN`. Enter a strong secret there; do not commit it to GitHub.
3. Allow the initial Docker deploy to complete. The worker will receive a public `https://...onrender.com` service URL.
4. Configure the main PalladiumAI deployment with the same secret and the Render service URL as shown below.
5. Leave browser simulation disabled in production.

The Blueprint uses `autoDeployTrigger: checksPass`, so subsequent worker deploys wait for the repository's GitHub checks to pass before deployment.

## PalladiumAI configuration

Configure the main PalladiumAI deployment with:

```text
BROWSER_AGENT_PROVIDER=playwright
PLAYWRIGHT_BROWSER_ENDPOINT=https://your-worker.example.com
PLAYWRIGHT_BROWSER_TOKEN=<same long private token as BROWSER_WORKER_TOKEN>
BROWSER_AGENT_ALLOW_SIMULATION=false
```

Do not expose `BROWSER_WORKER_TOKEN` or `PLAYWRIGHT_BROWSER_TOKEN` to browser/client code. The provider is not considered configured without *both* an HTTPS endpoint and a token, and is not considered live until the authenticated health check proves Chromium is ready.

## Genuine acceptance test

After hosting the worker, set `PLAYWRIGHT_BROWSER_ENDPOINT` and `PLAYWRIGHT_BROWSER_TOKEN` locally (as private process environment variables; never in version control) and run from the repository root:

```bash
node browser-worker/smoke.mjs
```

The smoke script checks bearer-authenticated Chromium readiness, creates a real isolated session, verifies local/private addresses are blocked, navigates to `https://example.com/`, extracts its real page text, closes the session and reports `BROWSER_WORKER_ACCEPTANCE=PASS` only if every assertion holds. It performs no purchases and does not use simulated responses.

The health endpoint alone does not establish that arbitrary authenticated customer sites or long-running workflows operate correctly. Conduct separate owner-authorised browser tasks through Blackstar before claiming broader certification.

## Safety boundaries

The worker never receives payment credentials. `prepare_checkout` only returns a checkout draft and always leaves `paymentAuthorised` false. Requests are bounded, sessions expire automatically, model-controlled selectors/text are length-limited, top-level navigation is domain-scoped, and private/local networks are blocked.

The generic `search` action currently returns no synthetic offers. PalladiumAI therefore never invents shopping results when a production worker is connected; provider-specific live product discovery can be added separately.
