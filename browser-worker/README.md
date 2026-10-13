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

## Windows 10 local worker — no new cloud subscription

This runs the EXISTING Playwright worker on the user's Windows PC. It is separate from the 3D/AI model workers. No GTX 1080 Ti GPU is required. Install Node.js LTS 20+ first, then from a clone of the current Blackstar repository run:

~~~powershell
powershell -NoProfile -File .\browser-worker\windows\start-local.ps1
~~~

The script installs Playwright and its matching Chromium binary, starts a browser service only on 127.0.0.1:8787, generates a long random bearer token encrypted using Windows DPAPI, and verifies a real Chromium health check. It does **not** modify Vercel, firewall rules, scheduled tasks, existing Tailscale services or tunnel exposure.

Stop that specific worker, without touching other applications, with:

~~~powershell
powershell -NoProfile -File .\browser-worker\windows\stop-local.ps1
~~~

### Optional public HTTPS access for development evaluation only

The deployed Vercel server cannot reach your computer's 127.0.0.1 directly. If you explicitly choose to make a **development/test worker** accessible from the Internet, consider a HTTPS reverse tunnel. A Tailscale Funnel on external HTTPS port 8443 avoids overwriting the existing model bridge on port 443. Current Tailscale documentation: https://tailscale.com/docs/reference/tailscale-cli/funnel.

**Tailscale Personal is for non-commercial use.** Its free plan is not an appropriate assumption for a commercial Blackstar production SaaS. Check your chosen provider's current business terms and hosting costs before connecting paying users. Public Funnel traffic is reachable by anyone, so strong bearer authentication, tenant isolation, logs, abuse limits and network-layer filtering are still required.

If Tailscale is already installed, online, and port 8443 is not in use by an unrelated app, you can **manually** opt into a separate development Funnel:

~~~powershell
tailscale status
tailscale funnel status
tailscale funnel --bg --yes --https=8443 http://127.0.0.1:8787
~~~

Use the actual device hostname returned by Tailscale and append port 8443 to form your HTTPS origin; never guess the hostname. To stop **only** the browser Funnel without disrupting any existing model bridge:

~~~powershell
tailscale funnel --https=8443 off
~~~

Do not run a global Funnel reset. These commands are not executed by the local worker startup script.

To securely transfer the worker token into Vercel's protected Production environment, run this **only when you have decided to connect the worker**:

~~~powershell
powershell -NoProfile -File .\browser-worker\windows\copy-worker-token.ps1
~~~

The token is copied to the Windows clipboard but not printed. Paste it only into the protected Production secret field for PLAYWRIGHT_BROWSER_TOKEN, and clear the clipboard. Also set BROWSER_AGENT_PROVIDER to playwright, PLAYWRIGHT_BROWSER_ENDPOINT to the **actual** bare HTTPS origin (including :8443 when applicable), and BROWSER_AGENT_ALLOW_SIMULATION to false. Redeploy Vercel after these changes.

To run the existing real browser acceptance test locally (requires HTTPS tunnel), in a terminal:

~~~powershell
$env:PLAYWRIGHT_BROWSER_ENDPOINT = "https://your-actual-tailnet-host.ts.net:8443"
$secure = Import-Clixml "$env:LOCALAPPDATA\Blackstar\browser-worker\worker-token.clixml"
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try { $env:PLAYWRIGHT_BROWSER_TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
node .\browser-worker\smoke.mjs
Remove-Item Env:PLAYWRIGHT_BROWSER_TOKEN -ErrorAction SilentlyContinue
~~~

The smoke test checks a real authenticated Chromium session, private-network refusal, navigation and text extraction. It never makes payments or reports simulated results as real. Production readiness still requires running a real user-authorised agent task inside Blackstar after the worker host is connected.

### Operational limits

This local proof-of-concept is not a durable multi-user browser service: PC uptime, sleep, GPU/CPU contention, residential network stability and tunnel policy affect reliability. For a commercial paid product, migrate the **same worker**, not a new orchestrator, to an approved commercial-compatible host. Its single-process session map needs sticky sessions or a coordinator before scaling replicas, and an outbound network firewall is required to defend against DNS rebinding after hostname validation.

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
