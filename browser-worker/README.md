# PalladiumAI Playwright Browser Worker

This service implements the production browser contract used by `src/lib/mission/browser-agent.ts`.

## Endpoints

All endpoints require `Authorization: Bearer <BROWSER_WORKER_TOKEN>`.

- `POST /health`
- `POST /session` with `{ "allowedDomains": ["example.com"] }`
- `POST /action` with `{ "sessionId": "...", "action": "navigate", "params": { ... } }`

Sessions are short-lived, capped, isolated Playwright browser contexts. Top-level navigation must stay inside the session allow-list. Local/private network targets are blocked, including DNS results that resolve to private IP space.

## Run locally

```bash
cd browser-worker
npm install
npx playwright install chromium
BROWSER_WORKER_TOKEN=replace-me npm start
```

The worker listens on port `8787` by default.

## Docker

```bash
docker build -t palladium-browser-worker browser-worker
docker run --rm -p 8787:8787 -e BROWSER_WORKER_TOKEN=replace-me palladium-browser-worker
```

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
PLAYWRIGHT_BROWSER_TOKEN=<same value as BROWSER_WORKER_TOKEN>
BROWSER_AGENT_ALLOW_SIMULATION=false
```

Do not expose `BROWSER_WORKER_TOKEN` or `PLAYWRIGHT_BROWSER_TOKEN` to browser/client code.

## Safety boundaries

The worker never receives payment credentials. `prepare_checkout` only returns a checkout draft and always leaves `paymentAuthorised` false. Requests are bounded, sessions expire automatically, model-controlled selectors/text are length-limited, top-level navigation is domain-scoped, and private/local networks are blocked.

The generic `search` action currently returns no synthetic offers. PalladiumAI therefore never invents shopping results when a production worker is connected; provider-specific live product discovery can be added separately.
