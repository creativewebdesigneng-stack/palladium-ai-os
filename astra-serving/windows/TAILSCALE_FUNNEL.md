# Domainless Blackstar cloud bridge with Tailscale Funnel

Use this path when the Blackstar GPU host does not have its own domain. Tailscale Funnel gives the Windows device a stable HTTPS hostname under the tailnet's `ts.net` domain, so no separately purchased domain or DNS record is required.

Blackstar still keeps Ollama on `127.0.0.1:11434`. Funnel publishes only the existing localhost bearer-auth proxy, whose public API is restricted to `GET /v1/models` and `POST /v1/chat/completions`.


### GPT-OSS Astra activation

The bridge now defaults to the exact model identity `gpt-oss-20b`. Blackstar will refuse to publish the bridge unless the configured local OpenAI-compatible server advertises that exact ID from `GET /v1/models` and successfully completes a warm-up request.

For a localhost GPT-OSS server listening on port 8080, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\astra-serving\windows\setup-blackstar-tailscale-funnel.ps1 -Model "gpt-oss-20b" -UpstreamBaseUrl "http://127.0.0.1:8080"
```

The local inference server itself must already be serving GPT-OSS under the exact ID `gpt-oss-20b`. Do not point Blackstar at a Qwen process and rename it: the model-discovery check is intended to prevent that mismatch.

## Prerequisites

- Windows 10 or later.
- The existing Blackstar Ollama bootstrap has already succeeded.
- A Tailscale account. The first sign-in is interactive and cannot be safely automated by Blackstar.
- Tailscale Funnel enabled for the tailnet. MagicDNS and HTTPS are required by Funnel.

## Start or rotate the bearer token

From the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\astra-serving\windows\setup-blackstar-tailscale-funnel.ps1
```

The script will install `Tailscale.Tailscale` through `winget` when Tailscale is missing. If Tailscale has not yet been signed in, it stops with a clear instruction to open the Tailscale app and authenticate once, then rerun the command.

Every successful run generates a fresh random bearer token, starts a fresh authenticated localhost proxy, verifies the public Funnel route, and stores the token as a Windows DPAPI-protected SecureString under the current user's `%LOCALAPPDATA%\Blackstar\runtime` directory. The token is intentionally never printed to the console.

When Windows clipboard support is available, the new bearer token is copied directly to the clipboard so it can be pasted into the deployment secret manager without appearing in screenshots or terminal history. The script prints only the non-secret values:

```dotenv
OPENAI_COMPATIBLE_BASE_URL=https://<device>.<tailnet>.ts.net/v1
OPENAI_COMPATIBLE_API_KEY=<copied to clipboard; value intentionally not printed>
BLACKSTAR_NATIVE_MODEL=gpt-oss-20b
BLACKSTAR_NATIVE_PRIMARY=true
```

If the clipboard copy was missed, copy the DPAPI-protected token again without printing it:

```powershell
powershell -ExecutionPolicy Bypass -File .\astra-serving\windows\copy-blackstar-bridge-token.ps1
```

Paste the clipboard value into the server-only `OPENAI_COMPATIBLE_API_KEY` secret in the deployment. Never expose that value in browser variables, screenshots, chat messages, source control, or shell history. Funnel is internet-accessible, so the bearer boundary remains mandatory even though Ollama itself stays localhost-only.

## Stop

```powershell
powershell -ExecutionPolicy Bypass -File .\astra-serving\windows\stop-blackstar-cloud-bridge.ps1
```

The stop helper resets the Tailscale Funnel configuration when this transport is active and stops the Blackstar localhost proxy.

## Certification boundary

A successful Funnel connection proves network reachability and inference transport only. It does not create Model Arena runs, attestations, certification, or verified evidence.
