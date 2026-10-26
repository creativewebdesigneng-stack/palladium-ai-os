# Blackstar local inference on Windows + Ollama

This is the Windows development path for Blackstar-controlled inference. It extends the existing `astra-serving` system rather than replacing it.

The default bootstrap target is `qwen3:8b-q4_K_M`, an 8B Qwen3 quantized model suitable for a GTX 1080 Ti-class 11 GB card. Model quality, throughput, tool use and context limits must still be measured on the actual machine; installing a model is not certification.

## One-command bootstrap

From PowerShell at the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\astra-serving\windows\setup-blackstar-ollama.ps1
```

The script:

1. checks Windows and reports NVIDIA GPU/VRAM when `nvidia-smi` is available;
2. finds Ollama or installs the official Windows package through `winget`;
3. starts Ollama bound to `127.0.0.1:11434` when needed;
4. pulls `qwen3:8b-q4_K_M` by default;
5. verifies `GET /v1/models` contains the exact model identity;
6. sends a real `POST /v1/chat/completions` smoke test and checks the model followed the challenge;
7. queries Ollama `GET /api/ps` **after inference** and fails if the active model has zero GPU VRAM residency or invalid telemetry;
8. prints the Blackstar server-only environment values for local development.

To try another model:

```powershell
powershell -ExecutionPolicy Bypass -File .\astra-serving\windows\setup-blackstar-ollama.ps1 -Model "MODEL_NAME"
```

## Prove the GTX 1080 Ti is running the model

Do not confuse an installed GPU, a successful Ollama API response, and actual GPU-backed inference. The bootstrap now checks the exact loaded model in Ollama's live `/api/ps` telemetry and requires nonzero `size_vram`. It reports the proportion of loaded model memory resident in VRAM and warns if it is below 75%. This is a **local GPU smoke test**, not evidence of model quality, production routing, or agent tool execution.

- If `nvidia-smi` is missing or `size_vram` is zero, inspect the NVIDIA driver and Ollama GPU support. Do not claim that the GPU test passed.
- If the 8B quantized model runs out of memory or mostly offloads to CPU, rerun with a smaller model: `powershell -ExecutionPolicy Bypass -File .\\astra-serving\\windows\\setup-blackstar-ollama.ps1 -Model "qwen3:4b"`. Use the **same exact model ID** in Blackstar's server-only configuration.
- The script needs a real Windows NVIDIA PC to validate GPU inference. Repository unit tests can only verify the script's contract; they cannot simulate a GPU pass.

## Blackstar local environment

When the Blackstar server process itself runs on this PC, the expected values are:

```dotenv
OPENAI_COMPATIBLE_BASE_URL=http://127.0.0.1:11434/v1
BLACKSTAR_NATIVE_MODEL=qwen3:8b-q4_K_M
BLACKSTAR_NATIVE_PRIMARY=true
```

Ollama's ordinary localhost setup does not require `OPENAI_COMPATIBLE_API_KEY`.

## Cloud-hosted Blackstar

`127.0.0.1` is only correct for a Blackstar server process running on the same Windows PC. Lovable, Vercel, or another cloud deployment cannot reach your PC through its own localhost.

Do **not** expose Ollama's port 11434 directly to the internet.

For a first cloud-to-home proof of connection, Blackstar includes a temporary authenticated bridge. It keeps Ollama on localhost, starts a second localhost-only bearer-auth proxy, permits only `GET /v1/models` and `POST /v1/chat/completions`, and publishes that proxy through a Cloudflare TLS Quick Tunnel.

From PowerShell at the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\astra-serving\windows\setup-blackstar-cloud-bridge.ps1
```

The bridge verifies local Ollama/model discovery first, installs `cloudflared` through `winget` when needed, creates a cryptographically random bearer token, verifies the localhost proxy, creates the TLS tunnel, waits for the tunnel to register and its temporary hostname to resolve through Windows DNS, then verifies authenticated model discovery through the public tunnel. It does **not** declare success on a registered QUIC connection alone.

On success it prints four **server-only** configuration entries:

```dotenv
OPENAI_COMPATIBLE_BASE_URL=https://<temporary-host>.trycloudflare.com/v1
OPENAI_COMPATIBLE_API_KEY=<copied to clipboard; value intentionally not printed>
BLACKSTAR_NATIVE_MODEL=qwen3:8b-q4_K_M
BLACKSTAR_NATIVE_PRIMARY=true
```

The real bearer token is stored encrypted with the Windows user's DPAPI and copied to the clipboard, not printed in PowerShell. Paste it directly into the **Preview** environment's server-only `OPENAI_COMPATIBLE_API_KEY` setting, not into this chat or Git. If the clipboard was missed, run `powershell -ExecutionPolicy Bypass -File .\\astra-serving\\windows\\copy-blackstar-bridge-token.ps1` to copy it again.

### If the temporary hostname cannot be resolved

A successful QUIC/TCP Cloudflare tunnel connection is **not** proof that Windows can resolve the temporary `trycloudflare.com` hostname. The script now retries both tunnel registration and Windows DNS for a bounded interval, then diagnoses the hostname via Cloudflare's public DNS without changing your DNS settings. After the script stops on failure, its old Quick Tunnel hostname may cease to exist.

For an unresolved hostname **while that same tunnel is still running**, compare these two diagnostic commands using the hostname printed by that running tunnel:

```powershell
Resolve-DnsName <temporary-host>.trycloudflare.com -Type A
Resolve-DnsName <temporary-host>.trycloudflare.com -Server 1.1.1.1 -Type A
```

If public DNS resolves the name but your default DNS does not, investigate local DNS filtering or cached negative responses. If neither resolves, stop and retry the bridge for a fresh Quick Tunnel hostname. If the remote endpoint resolves but fails authentication or model discovery, do **not** bypass the bearer proxy, change localhost binding, or call it a GPU failure. Do not reset a separate browser-worker Tailscale Funnel.

The bearer token must stay secret and must never be exposed through a `VITE_` variable or committed to Git. Blackstar's existing compatible-provider gateway sends `OPENAI_COMPATIBLE_API_KEY` as an `Authorization: Bearer ...` header, so no separate provider path is created for this bridge.

Stop the temporary bridge with:

```powershell
powershell -ExecutionPolicy Bypass -File .\astra-serving\windows\stop-blackstar-cloud-bridge.ps1
```

A `trycloudflare.com` Quick Tunnel is a development bridge, not the final production topology. Once end-to-end Astra inference has been proven, replace it with a named/persistent tunnel or equivalent managed route with stable hostname, managed authentication, rotation, monitoring and restart/service handling. Do not weaken the bearer boundary or publish port 11434 itself.

## Optional vision experiment

A separate 8B-class Qwen vision model may fit the same card when loaded independently, but vision should be treated as an experiment until measured on the actual GTX 1080 Ti. Do not bind Blackstar's Astra vision identity to a checkpoint merely because it loads. The existing trusted multimodal certification remains the promotion gate.

## Certification boundary

A successful bootstrap or cloud bridge proves only that the model is reachable and can produce inference. It does not create Model Arena runs, attestations or verified evidence. After the local endpoint is operational, use Blackstar's existing evaluation and certification flow to earn task-class routing authority.
