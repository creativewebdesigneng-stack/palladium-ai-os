# Blackstar Astra X — Research Prototype

Astra X is Blackstar's independent intelligence programme. Its ambition is to develop frontier-capable reasoning, software-engineering, research and agent capabilities over time while Blackstar owns orchestration, evaluation, memory, tool governance and eventually its own model weights.

This directory is an **isolated research package**. It does not replace the existing Astra runtime in Blackstar AI OS.

## First implementation slice

- Provider-neutral capability descriptors and task categories.
- Deterministic local-first model routing.
- Remote inference disabled by default, with explicit cost ceilings.
- Local-only OpenAI-compatible chat adapter with loopback URL validation.
- Redirect blocking and bounded response size.
- Read-only Windows hardware/Ollama inventory script.
- Bounded agent-plan validation with tool allowlists, argument schemas and approval gates.
- Recomp Lab job/result contracts with provenance hashes, resource limits, operation-specific permissions and verification evidence.
- Reproducible model experiment and artifact manifest contracts with weight/data hashes, licence metadata, Git revisions and local-compute policy.
- Blackstar Memory Fabric integration using user-scoped recall and stored memory preferences; retrieval failures fail closed and recalled content is labelled untrusted.
- Unit tests for routing, spend guardrails, agent policy and endpoint restrictions.

The research adapter is intended for a local Astra X process communicating with the existing authenticated local Blackstar provider proxy. The optional Blackstar AI Hub entry point is feature-flagged by server-side ASTRA_X_ENABLED (off unless explicitly set). The browser must never call Ollama directly. Provider credentials are injected by a trusted server-side process and must never be committed or exposed to client code.

## Existing Blackstar baseline to preserve

Previously recorded setup:
- Windows workstation with NVIDIA GTX 1080 Ti (11 GB VRAM).
- Local Ollama installation.
- Baseline model: qwen3:8b-q4_K_M.
- Existing authenticated localhost-only bearer proxy/private bridge.
- Server-only settings include OPENAI_COMPATIBLE_BASE_URL and BLACKSTAR_NATIVE_MODEL.
- The proxy exposes only /v1/models and /v1/chat/completions.
- Ollama remains bound to localhost.

These are prior recorded facts, not a fresh live health check. Verify them read-only before use. Do not change drivers, models, ports, proxy configuration or production settings without explicit approval.

Ollama's current hardware documentation lists the GTX 1080 Ti (compute capability 6.1) as supported and specifies driver 570 or newer for compute capabilities 5.0–6.2: https://docs.ollama.com/gpu

## Read-only Windows inventory

From PowerShell in the repository root, run:

    .\research\astra-x\scripts\Invoke-AstraXLocalInventory.ps1

The script reports GPU name, VRAM and driver when nvidia-smi is available; Ollama version, installed/running model lists; and whether the Ollama API responds on 127.0.0.1:11434. It does not change files, drivers, models, services or settings. It does not collect environment variables, API keys or bearer tokens, and it does not contact remote hosts. If the local Ollama API uses a different port, the script deliberately does not guess it.

## Local development

Requires Python 3.11 or newer.

    python -m venv .venv
    # Windows PowerShell:
    .venv\Scripts\Activate.ps1
    # macOS/Linux:
    # source .venv/bin/activate

    python -m pip install -e ".[dev]"
    python -m pytest

## Governed memory context

The Blackstar server entry point retrieves memory through the existing Memory Fabric using the authenticated user's Supabase client, with no organisation or agent scope expansion. It applies stored per-user preferences, excludes expired/disallowed records, labels retrieved content as untrusted reference data, and omits memory entirely if preference loading or recall fails. Astra X does not automatically write memories.

## Model experiment and artifact provenance

The `astra_x.experiments` module records experiment method, compute location, hardware profile, dataset/config hashes, source revision, model ownership, weight checksum, licence reference and evaluation evidence. Cloud compute is rejected by the default policy unless an explicit future programme decision changes it. These are governance contracts, not a training pipeline.

## Recomp Lab contract

The `astra_x.recomp_lab` module defines strict job and result envelopes for authorised research inputs. It validates artifact SHA-256 hashes, provenance, authorisation records, operation-specific capabilities, bounded CPU/memory/time/output limits, approval state, result linkage and verification evidence. It does not inspect or execute binaries; actual analysis tools must remain separately sandboxed and reviewed.

## Agent plan safety contract

The `astra_x.agent` module validates proposed plans before an executor is ever introduced. Tools must be explicitly allowlisted and registered, arguments must match declared keys and remain bounded JSON, and side-effecting tools require an approval ID. Code execution and network requests are denied by default. This module does not execute tools or generated code.

## Reproducible local benchmark

A small, versioned baseline dataset is stored at `benchmarks/baseline-v0.1.jsonl`. It covers reasoning, simple coding knowledge, research uncertainty handling and instruction following. The scorer uses transparent required-term checks; it is a smoke benchmark, not a substitute for HumanEval, SWE-bench, a blinded expert review or a safety evaluation.

From the repository root, configure the local shell with the existing authenticated localhost proxy URL, model ID and bearer token. The runner reads:
- `OPENAI_COMPATIBLE_BASE_URL`
- `BLACKSTAR_NATIVE_MODEL`
- a local bearer token from `BLACKSTAR_LOCAL_PROXY_BEARER_TOKEN`, `BLACKSTAR_BRIDGE_TOKEN` or the existing server setting `OPENAI_COMPATIBLE_API_KEY` (the token value must remain local and must never be committed)

Then run:

    python research/astra-x/scripts/run_benchmark.py

The default report is written to `research/astra-x/results/latest.json`. Reports contain model ID, dataset version/name, UTC timestamp, per-case pass/fail, latency and output character counts. Provider error messages and credentials are not written to reports. Do not commit benchmark reports if prompts or outputs contain private data. Use a fresh output path for comparisons and preserve the dataset version.

The benchmark runner never executes generated code, uses no remote judge and does not enable cloud fallback. Its required-term score is intentionally simple and must not be represented as a general intelligence score.

## Hardware and cost policy

The initial target is the existing GTX 1080 Ti. No additional GPU purchase, paid inference service or automatic cloud fallback is authorised by this programme. Select models using measured VRAM use, context length, latency and task quality. Include KV cache and runtime overhead in memory measurements. A prior GPT-OSS 20B attempt did not fit the 11 GB configuration and is not an approved baseline without fresh evidence.

## Development principles

1. Reuse and integrate with existing Blackstar Astra services; do not create a competing production runtime.
2. Keep research code isolated from production paths until reviewed.
3. Make routing deterministic and auditable.
4. Fail closed when no approved local provider is available.
5. Never silently spend money or fall back to a remote provider.
6. Treat model output as untrusted input; generated code requires sandboxing, review and tests.
7. Evaluate capability with reproducible benchmarks rather than marketing claims.
8. Track model, dataset and adapter provenance and licence.
9. Keep independent foundation-model research distinct from open-model adaptation.

## Current limitations

This is an early orchestration and provider-integration prototype. It is not a trained foundation model, production inference service, autonomous coding agent or proof of frontier capability. Next steps are provider adapter tests, baseline benchmarking and mapping the existing Astra server-side gateway before any production integration.
