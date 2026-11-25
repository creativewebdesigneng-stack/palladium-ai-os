# Blackstar Astra X — Research Prototype

Astra X is a proposed independent Blackstar intelligence programme. Its long-term goal is to develop strong reasoning, software-engineering, research and agent capabilities while retaining control over orchestration, evaluation, memory and deployment.

This directory is an **isolated research package**. It does not replace the existing Astra runtime in Blackstar AI OS.

## What exists in this first slice

- A provider-neutral capability descriptor.
- Task categories for reasoning, coding, research and embeddings.
- A deterministic model-routing policy.
- Local-first selection by default.
- Remote inference disabled by default.
- Explicit remote cost ceilings and an operator-approval flag.
- Unit tests for routing and spend guardrails.

The router only chooses a declared provider. It does not load a model, make network requests, read API keys, execute model output or claim that a provider is healthy.

## Local development

Requires Python 3.11 or newer.

```bash
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate

python -m pip install -e ".[dev]"
python -m pytest
```

## Hardware and cost policy

The initial target is the existing NVIDIA GTX 1080 Ti (11 GB VRAM). No additional GPU purchase, paid inference service or automatic cloud fallback is authorised by this project plan. Model selection must be based on measured VRAM use, context length, latency and task quality; the existing Blackstar notes that GPT-OSS 20B did not fit the 11 GB card in the previous configuration, so it must not be treated as a viable local default without new evidence.

## Development principles

1. Reuse and integrate with existing Blackstar Astra services where appropriate; do not create a competing production runtime.
2. Keep research code isolated from production paths until reviewed.
3. Make routing deterministic and auditable.
4. Fail closed when no approved provider is available.
5. Never silently spend money or fall back to a remote model.
6. Treat model output as untrusted input; generated code requires sandboxing, review and tests.
7. Evaluate capability with reproducible benchmarks rather than marketing claims.

## Current limitations

This is not a foundation model, trained model, autonomous coding agent or production inference service. It is the first small orchestration component from which those capabilities can be developed and evaluated.
