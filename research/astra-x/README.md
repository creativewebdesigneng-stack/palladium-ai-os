# Blackstar Astra X — Research Prototype

Astra X is Blackstar's independent intelligence programme. Its ambition is to develop frontier-capable reasoning, software-engineering, research and agent capabilities over time while Blackstar owns orchestration, evaluation, memory, tool governance and eventually its own model weights.

This directory is an **isolated research package**. It does not replace the existing Astra runtime in Blackstar AI OS.

## First implementation slice

- Provider-neutral capability descriptors and task categories.
- Deterministic local-first model routing.
- Remote inference disabled by default, with explicit cost ceilings.
- Local-only OpenAI-compatible chat adapter with loopback URL validation.
- Redirect blocking and bounded response size.
- Unit tests for routing, spend guardrails and endpoint restrictions.

The adapter is intended for a local Astra X process communicating with the existing authenticated local Blackstar provider proxy. The browser must never call Ollama directly. Provider credentials are injected by a trusted server-side process and must never be committed or exposed to client code.

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

## Local development

Requires Python 3.11 or newer.

    python -m venv .venv
    # Windows PowerShell:
    .venv\Scripts\Activate.ps1
    # macOS/Linux:
    # source .venv/bin/activate

    python -m pip install -e ".[dev]"
    python -m pytest

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
