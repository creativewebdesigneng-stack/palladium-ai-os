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
6. sends a real `POST /v1/chat/completions` smoke test;
7. prints the Blackstar server-only environment values for local development.

To try another model:

```powershell
powershell -ExecutionPolicy Bypass -File .\astra-serving\windows\setup-blackstar-ollama.ps1 -Model "MODEL_NAME"
```

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

Do **not** expose Ollama's port 11434 directly to the internet. Before cloud Blackstar can use the home GPU, place Ollama behind a separately secured route that provides TLS, authentication and restricted ingress. Then configure the cloud deployment with that secured `/v1` base URL and its server-only credential.

## Optional vision experiment

A separate 8B-class Qwen vision model may fit the same card when loaded independently, but vision should be treated as an experiment until measured on the actual GTX 1080 Ti. Do not bind Blackstar's Astra vision identity to a checkpoint merely because it loads. The existing trusted multimodal certification remains the promotion gate.

## Certification boundary

A successful bootstrap proves only that the model is reachable and can produce inference. It does not create Model Arena runs, attestations or verified evidence. After the local endpoint is operational, use Blackstar's existing evaluation and certification flow to earn task-class routing authority.
