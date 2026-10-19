# NVIDIA NIM and Dell AI Factory in Blackstar — Preview rollout

**Scope:** `repair/agent-tool-verification` / PR #1002. Reuse the existing Blackstar model gateway, agent model selection, worker endpoints, approvals and audit. No new model router, connector store, GPU scheduler, database migration or hardware purchase.

## What is implemented

- **NVIDIA NIM** is a selectable model provider for new or existing agents (`nvidia`, `openai/gpt-oss-20b` default). It runs through the same bounded non-streaming/streaming tool-call gateway as the other OpenAI-compatible providers.
- **Dell AI Factory with NVIDIA** is a *hosting profile* for an operator-deployed NIM endpoint, not a model provider, Dell account integration or hardware management interface. Model tasks use exactly the same NVIDIA provider. The Models dashboard reports profile selection and configuration, **never live hardware certification**.
- Existing providers, worker routes, credentials, agent approvals, tool grants, payment controls and Production stay unchanged.

## Preview configuration — hosted NVIDIA API Catalog

1. An operator creates a key at https://build.nvidia.com/settings and reviews the model's terms and rate limits. Some prototype endpoints have free evaluation use; this is **not** a promise of unlimited free production inference.
2. In **Vercel Preview environment variables only**, set `NVIDIA_API_KEY` to the server secret. Optionally set `NVIDIA_NIM_MODEL=openai/gpt-oss-20b`. Do **not** place a key in `VITE_*`, a repository, a chat message, browser storage, screenshots or client code.
3. Leave `NVIDIA_NIM_BASE_URL` **unset**. The server pins hosted inference to `https://integrate.api.nvidia.com/v1/chat/completions`.
4. Redeploy Preview and open **Runtime Models**. NVIDIA readiness will report deployment configuration (not a successful call) and can be selected from the existing agent model menu.
5. Select **Check NVIDIA connection (read-only)** on Runtime Models. This calls `GET /v1/models` with an 8-second timeout, no redirects, and the server-side credential. `reachable` means the selected model was listed, **not** that paid inference or agent tool calling succeeded; `unsupported` means this deployment does not support catalogue listing, not that its inference API necessarily failed. A missing key blocks the probe.
6. Run a new authorised QA agent task and separately verify model invocation, token receipt, response content, original task completion, approved tool behaviour and audits. **Do not enable automatic agent fallback or merge to Production on configuration alone.**

## Dell AI Factory / self-hosted NVIDIA NIM (optional)

Dell AI Factory includes PowerEdge GPU compute, networking and storage validated for running NVIDIA software; it is *not* an external generative text API. To use a Dell system, procure/provision actual supported hardware, compatible NVIDIA NIM licensing and a securely authenticated HTTPS reverse proxy to the NIM `/v1` endpoint. Consult the NVIDIA per-model support matrix before attempting a GPU deployment.

Preview operator variables:

- `DELL_AI_FACTORY_ENABLED=true` — selects the **informational** hosting profile.
- `NVIDIA_NIM_BASE_URL=https://nim.example.com/v1` — a dedicated authenticated HTTPS, publicly DNS-resolvable NIM endpoint operated by you. This must be a TLS-validated hostname; local IPs, localhost, .local/.internal, embedded credentials, querystrings and fragments are intentionally rejected. The hosted default is not modified until this is set.
- `NVIDIA_API_KEY` — server-side bearer credential required for that NIM reverse proxy.
- `NVIDIA_NIM_MODEL` — the actual deployed NIM model ID, where different from the hosted default.

**Important:** A Dell management controller (iDRAC/Redfish) must **not** be exposed directly to Vercel, and Blackstar does not currently issue Dell server management commands or report measured GPU utilisation. Running models, Game Foundry workers, Cinema Studio workers, and RTX rendering workers on actual Dell/NVIDIA machines needs separate endpoint deployment, per-GPU compatibility/VRAM verification, stable network routing, quota and acceptance tests. Existing worker contracts (`CINEMA_STUDIO_WORKER_URL`, `GAME_FOUNDRY_3D_API_URL`, etc.) should be reused rather than cloned.

### Release requirements

- A real NVIDIA Chat Completions call with the **actual** operator-owned key and target model must pass; streaming and tool-call examples should be tested before assigning production agents.
- Recorded failed/auth/quota responses must be surfaced as errors, never simulated success.
- Dell profile readiness is **not** proof of an accessible PowerEdge system or GPU worker.
- Existing human approvals remain mandatory for browser actions, external writes or spending. NVIDIA model responses do not bypass agent tool policy.
- Keep PR #1002 open, Preview-only until Green CI and reviewed real evidence.

References:
- NVIDIA API Catalog https://build.nvidia.com/
- NVIDIA NIM API reference https://docs.api.nvidia.com/nim/reference/llm-apis
- Dell AI Factory overview https://www.dell.com/en-us/dt/nvidia-ai.htm
- Dell AI Factory architecture https://infohub.delltechnologies.com/en-us/t/dell-ai-factory-with-nvidia-gpus-and-open-source-software-stack/
