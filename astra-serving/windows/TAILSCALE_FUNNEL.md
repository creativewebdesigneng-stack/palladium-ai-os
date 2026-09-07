# Domainless Blackstar cloud bridge with Tailscale Funnel

Use this path when the Blackstar GPU host does not have its own domain. Tailscale Funnel gives the Windows device a stable HTTPS hostname under the tailnet's `ts.net` domain, so no separately purchased domain or DNS record is required.

Blackstar still keeps Ollama on `127.0.0.1:11434`. Funnel publishes only the existing localhost bearer-auth proxy, whose public API is restricted to `GET /v1/models` and `POST /v1/chat/completions`.

## Prerequisites

- Windows 10 or later.
- The existing Blackstar Ollama bootstrap has already succeeded.
- A Tailscale account. The first sign-in is interactive and cannot be safely automated by Blackstar.
- Tailscale Funnel enabled for the tailnet. MagicDNS and HTTPS are required by Funnel.

## Start

From the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\astra-serving\windows\setup-blackstar-tailscale-funnel.ps1
```

The script will install `Tailscale.Tailscale` through `winget` when Tailscale is missing. If Tailscale has not yet been signed in, it stops with a clear instruction to open the Tailscale app and authenticate once, then rerun the command.

On success it verifies authenticated model discovery through the public Funnel URL before printing the Blackstar server-only deployment values:

```dotenv
OPENAI_COMPATIBLE_BASE_URL=https://<device>.<tailnet>.ts.net/v1
OPENAI_COMPATIBLE_API_KEY=<generated-random-bearer-token>
BLACKSTAR_NATIVE_MODEL=qwen3:8b-q4_K_M
BLACKSTAR_NATIVE_PRIMARY=true
```

Never expose `OPENAI_COMPATIBLE_API_KEY` in browser variables or screenshots. Funnel is internet-accessible, so the bearer boundary remains mandatory even though Ollama itself stays localhost-only.

## Stop

```powershell
powershell -ExecutionPolicy Bypass -File .\astra-serving\windows\stop-blackstar-cloud-bridge.ps1
```

The stop helper resets the Tailscale Funnel configuration when this transport is active and stops the Blackstar localhost proxy.

## Certification boundary

A successful Funnel connection proves network reachability and inference transport only. It does not create Model Arena runs, attestations, certification, or verified evidence.
