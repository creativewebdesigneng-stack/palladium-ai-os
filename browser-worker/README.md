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

## PalladiumAI configuration

Configure the main PalladiumAI deployment with:

```text
BROWSER_AGENT_PROVIDER=playwright
PLAYWRIGHT_BROWSER_ENDPOINT=https://your-worker.example.com
PLAYWRIGHT_BROWSER_TOKEN=<same value as BROWSER_WORKER_TOKEN>
```

Do not enable `BROWSER_AGENT_ALLOW_SIMULATION` in production.

## Safety boundaries

The worker never receives payment credentials. `prepare_checkout` only returns a checkout draft and always leaves `paymentAuthorised` false. Requests are bounded, sessions expire automatically, model-controlled selectors/text are length-limited, top-level navigation is domain-scoped, and private/local networks are blocked.

The generic `search` action currently returns no synthetic offers. PalladiumAI therefore never invents shopping results when a production worker is connected; provider-specific live product discovery can be added separately.
