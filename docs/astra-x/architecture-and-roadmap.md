# Astra X — Architecture and Roadmap

**Status:** Research foundation started  
**Repository:** `creativewebdesigneng-stack/palladium-ai-os`  
**Isolation:** `research/astra-x/`  
**Production status:** No production runtime, deployment or model configuration changed.

## Product goal

Develop Blackstar-owned intelligence capabilities over time: model-independent orchestration, task planning, memory interfaces, tool governance, coding workflows, evaluation and eventually independently trained/adapted models.

Astra X is not a claim that Blackstar can immediately reproduce a frontier-scale proprietary foundation model. A capable agent platform and a foundation model are different deliverables. The initial programme builds the platform and evaluation discipline first, then uses open-weight models where hardware and licences permit.

## System boundaries

- **Existing Astra runtime:** remains the current Blackstar runtime; Astra X must integrate through documented interfaces rather than silently replace it.
- **Astra X orchestration:** task classification, deterministic routing, budgets, approvals and trace metadata.
- **Model adapters:** separate interfaces for local and optional external models. External providers remain disabled unless separately configured and approved.
- **Memory:** explicit, inspectable retrieval and project-scoped memory; no unbounded hidden writes.
- **Tools:** allowlisted tools with least privilege, approval gates and auditable execution.
- **Evaluation:** offline task suites, regression tests, latency/resource measurements and human review.
- **Training/adaptation:** later research track; dataset provenance, model licences and reproducibility required.

## Delivery stages

### A — Foundation (current)
- Isolated Python research package.
- Typed task/provider contracts.
- Local-first deterministic router.
- Remote disabled by default and cost guardrails.
- Unit tests.

### B — Local inference adapter
- Inspect existing Blackstar local model bridge before adding another runtime.
- Confirm Windows host, Ollama endpoint binding and model identity using owner-side evidence.
- Do not expose Ollama publicly.
- Measure real VRAM, RAM, latency and output quality on the GTX 1080 Ti.
- Do not assume GPT-OSS 20B fits: previous recorded 11 GB tests encountered CUDA out-of-memory.

### C — Evaluation harness
- Curated, licence-compliant coding/reasoning test cases.
- Exact prompt, model and configuration provenance.
- Deterministic scoring where possible; human review for subjective tasks.
- Separate synthetic tests from actual owner-device/model evidence.

### D — Agent and tool governance
- Planner/executor/verifier separation.
- Strict tool allowlists, bounded inputs and outputs.
- Human approval for consequential actions.
- Sandboxed code execution; never run model-generated commands directly on the host.

### E — Memory and knowledge
- Project-scoped retrieval with provenance.
- User-visible inspect/correct controls.
- Retention and deletion policies.
- Retrieval quality and stale-context tests.

### F — Model adaptation
- Evaluate small open-weight models compatible with the actual hardware.
- LoRA/QLoRA only where the selected model, CUDA stack and memory budget support it.
- Training data must be licensed or created for this purpose.
- Track base model, adapter, dataset and evaluation versions.

### G — Foundation-model research
- Feasibility study for training a small model from scratch.
- Estimate dataset, compute, storage and evaluation costs before authorising spend.
- Keep frontier-scale training as a long-term research ambition, not an assumed near-term outcome.

## Non-negotiable constraints

- Never commit directly to `main`.
- Use feature branches and reviewed pull requests.
- Do not change Production or Vercel production settings as part of this research foundation.
- No paid GPU/cloud inference by default.
- No automatic remote fallback.
- Do not expose local model services publicly.
- Do not claim a model ran on the owner's GPU unless a real owner-device run proves it.
- Do not claim a feature is complete solely because a UI or mock exists.
- Keep GTA 6 work to public research and lawful, authorised test inputs; do not ingest leaked game executables/assets or bypass DRM.

## Acceptance gates

A stage is complete only when its tests pass and evidence is recorded. Synthetic unit tests, CI results, preview deployment, and owner-device tests must be labelled separately. No production integration until a separate review confirms security, compatibility, cost and rollback strategy.
