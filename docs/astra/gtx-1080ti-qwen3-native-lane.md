# Astra local lane: Qwen3 8B Q4_K_M on a GTX 1080 Ti

This is the owner setup for the local-first Astra lane. It targets an NVIDIA GeForce GTX 1080 Ti (11 GB, Pascal, compute capability 6.1) serving `qwen3:8b-q4_K_M` through Ollama's OpenAI-compatible API.

A passing local check means the model answered. It does not create Model Arena evidence, and it does not grant tools, approvals, or execution rights.

## Why Ollama, not the vLLM bundle

`astra-serving/docker-compose.yml` pins a current vLLM CUDA image. That image needs compute capability 7.0 or newer. A GTX 1080 Ti cannot run it. Use Ollama (llama.cpp) on this card. Set `BLACKSTAR_NATIVE_RUNTIME=vllm` only on a newer GPU, and only with `BLACKSTAR_NATIVE_GPU_OVERRIDE=true` after you have measured memory use.

Q4_K_M weights are about 5 GB. An 8192-token context leaves room for the KV cache on 11 GB. Do not start this model at 32k or 128k on this card. Optional alias:

```bash
ollama pull qwen3:8b-q4_K_M
ollama create blackstar-qwen3-8b-q4 -f astra-serving/gtx-1080ti/Modelfile
```

If you keep the default tag, start Ollama with `OLLAMA_CONTEXT_LENGTH=8192` and `OLLAMA_HOST=127.0.0.1:11434`.

## Windows setup

From the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\astra-serving\windows\setup-blackstar-ollama.ps1
powershell -ExecutionPolicy Bypass -File .\astra-serving\windows\verify-qwen3-gtx1080ti.ps1
```

The setup script may install Ollama and pull the model. The verification script does neither. It checks `nvidia-smi`, localhost Ollama, the exact model id, and a real completion that must contain `BLACKSTAR_GPU_OK`. It refuses any URL that is not localhost.

## Linux GPU host

```bash
bash astra-serving/verify-qwen3-gtx1080ti.sh
```

Ollama must already be running on `127.0.0.1:11434` with the model pulled. The script does not download weights and does not call a hosted model API.

## Server-only environment

For a Blackstar process on the same machine:

```dotenv
OPENAI_COMPATIBLE_BASE_URL=http://127.0.0.1:11434/v1
BLACKSTAR_NATIVE_MODEL=qwen3:8b-q4_K_M
BLACKSTAR_NATIVE_PRIMARY=true
BLACKSTAR_NATIVE_RUNTIME=ollama
BLACKSTAR_NATIVE_NUM_CTX=8192
```

Leave `OPENAI_COMPATIBLE_API_KEY` unset for a normal localhost Ollama install. Do not copy these values into a `VITE_` variable. Do not publish port 11434.

When native-primary is on and the requested model is this Qwen tag, chat tries the local runtime first. Output is capped (512 tokens for ordinary chat, 2048 for coding, planning, and repair) so a long generation is less likely to exhaust 11 GB. If the prompt is larger than the local window, or the model is missing, unreachable, out of memory, or quota-blocked on a bridged endpoint, the gateway continues to providers that are already configured (`GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENAI_API_KEY`, and the other existing keys). Cancellation is not sent to another provider. Each attempt records model identity, latency, token counts, fallback, and an error code. The record stores prompt length, not prompt text, and it stores no API key.

`BLACKSTAR_NATIVE_LANE=off` leaves this hardware profile unused. A different `BLACKSTAR_NATIVE_MODEL` also stays on the existing compatible path.

Cloud-hosted Blackstar still cannot use `127.0.0.1`. Use the existing authenticated bridge under `astra-serving/windows/` and keep Ollama private. That bridge is a development route, not a certification.

## Memory and embeddings

Agent memory, document chunks, and deletion stay in Blackstar's database. Deletes for memories and documents include the caller's user id even when the database client is elevated. Semantic search still prefers keyword recall when embeddings are unavailable.

Automatic embeddings try a configured Lovable gateway, then OpenAI, when both are configured. A Gemini-style `RESOURCE_EXHAUSTED` response that also reports quota or billing is treated as quota and is not retried on that provider. A refused connection is retried on that provider, then the next configured provider is tried. Choosing `EMBEDDING_PROVIDER=openai` (or `lovable`) does not silently switch vendors. A local OpenAI-compatible embedding server is used only when `EMBEDDING_COMPATIBLE_FALLBACK=true`, and its vectors must still be 1536-dimensional or indexing fails closed. Ollama chat does not by itself provide those vectors.

## External memory sidecars

AgentMemory and OpenViking stay disconnected until their URLs and secrets are set. HTTP is accepted only for localhost. Public HTTP, credentials in the URL, and missing secrets stay in the `not-connected` state. No archive page call synchronises memory.

| Variable | Purpose |
| --- | --- |
| `AGENTMEMORY_BASE_URL` | AgentMemory origin, for example `http://127.0.0.1:3111` or an HTTPS origin |
| `AGENTMEMORY_SECRET` | Bearer secret for that server. Never commit it. |
| `OPENVKING_BASE_URL` | OpenViking origin, for example `https://viking.example` |
| `OPENVKING_API_KEY` | A user key, not a root key |

AgentMemory writes and searches are sent with project `blackstar:<tenant id>`. Delete reads the memory first and refuses the call when the stored project is different. OpenViking search is pinned to `viking://~/memories`. Delete refuses every URI outside `viking://~/memories/<child>`. Capture through AgentMemory requires an explicit consent flag in the server call. Retention and sensitive-capture choices on Blackstar memories are unchanged.

These adapters do not vendor either project and they do not claim the external service is healthy just because the variables are present.
