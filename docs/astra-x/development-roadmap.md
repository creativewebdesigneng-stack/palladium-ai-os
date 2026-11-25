# Astra X Development Roadmap

**Direction:** frontier-capable ambition; open-model adaptation and independent model research in parallel; local-first hardware.

## Workstream A — Platform and runtime

Current implementation status is intentionally conservative: checked items below exist in the isolated research package and have dedicated tests. They are not yet wired into Blackstar production routes, verified against the owner's live Ollama proxy, or production-enabled.

### A0. Inventory and baseline
- [ ] Map existing Astra routes, provider gateway and local runtime configuration.
- [ ] Confirm current Ollama version, model list, driver version and GPU detection on the owner's PC.
- [ ] Capture baseline model latency, VRAM use, context behaviour and task quality.
- [ ] Record the integration boundary without exposing secrets or changing production.

**Gate:** evidence-backed architecture map and reproducible baseline report.

### A1. Provider contract and local adapter
- [x] Define provider capability descriptors and a local chat adapter interface (health reporting remains open).
- [x] Implement a local-only OpenAI-compatible adapter.
- [x] Enforce loopback-only URLs in the local adapter.
- [x] Add timeouts, bounded response sizes, message validation and safe error handling.
- [x] Test that remote hosts are rejected and redirects are blocked.
- [ ] Integrate only through the existing authenticated server-side gateway.

**Gate:** local mock-server tests pass; owner-device integration test recorded separately.

### A2. Routing, task envelopes and traces
- [ ] Add task envelope schemas and deterministic routing policy.
- [x] Enforce local-only and zero-spend defaults in the research router.
- [ ] Record model identity, policy decision, trace ID and latency.
- [ ] Add context budget and truncation detection.

**Gate:** no remote provider selected under default policy; routing tests pass.

### A3. Evaluation harness
- [x] Create a versioned starter dataset for reasoning, coding knowledge, research uncertainty and instruction following (full tool-use set remains open).
- [ ] Store prompt, expected outcome, rubric and source provenance.
- [x] Add deterministic smoke scoring; human review and richer rubrics remain open.
- [ ] Track pass rate, regression, latency, VRAM and failure categories.

**Gate:** repeatable baseline report for the current Qwen3 8B quantised model.

### A4. Agent runtime
- [ ] Implement planner/executor/verifier separation.
- [x] Define typed tool descriptors, argument allowlists and plan permission checks (runtime registry integration remains open).
- [x] Add plan validation that flags side-effecting actions for explicit approval (UI approval queue remains open).
- [ ] Bound retries, context, tokens, wall time and tool calls.
- [ ] Add prompt-injection and untrusted-content tests.

**Gate:** sandboxed test mission completes with traceable evidence and no unapproved side effects.

### A5. Project memory
- [ ] Define scoped memory record and provenance schema.
- [ ] Add retrieval, expiry, correction and deletion semantics.
- [ ] Add stale/conflict handling and access controls.
- [ ] Test user/project memory isolation.

**Gate:** retrieval and isolation tests pass.

### A6. Blackstar UI integration
- [ ] Add status, routing explanation, model provenance and mission timeline.
- [ ] Add approvals and evaluation results.
- [ ] Use existing TanStack Start routes, auth and design system.
- [ ] Keep feature flags off until backend and operator tests pass.

**Gate:** preview-only integration passes typecheck, lint, tests and security review.

## Workstream B — Open-model adaptation

### B0. Model catalogue
- [ ] Inventory current model and its licence.
- [ ] Compare small candidates by licence, quantisation, context, tool calling and benchmark results.
- [ ] Measure actual memory use; include KV cache and runtime overhead.
- [ ] Keep Qwen3 8B quantised as baseline until a replacement demonstrably wins.

### B1. Dataset preparation
- [ ] Use owned, public-domain or appropriately licensed data.
- [ ] Store source URL, licence, retrieval date, checksum and transformation history.
- [ ] Remove secrets, personal data and duplicated examples.
- [ ] Create train/validation/test splits with contamination controls.

### B2. Adaptation experiments
- [ ] Establish a baseline before fine-tuning.
- [ ] Evaluate LoRA/QLoRA feasibility for the selected model and GPU.
- [ ] Run small experiments only when supported by the actual stack.
- [ ] Compare adapter against the untouched base model.
- [ ] Keep adapters reversible and versioned.

**Gate:** measurable improvement on held-out Blackstar tasks without material regression in safety or general capability.

## Workstream C — Blackstar-owned model research

### C0. Tiny model from scratch
- [ ] Specify tokenizer, architecture and parameter count.
- [ ] Train a tiny decoder-only model on a small, properly licensed corpus.
- [ ] Save reproducible checkpoints and training metadata.
- [ ] Measure loss curves and held-out perplexity.
- [ ] Label it as a research demonstrator, not a frontier model.

### C1. Data and training pipeline
- [ ] Build provenance-aware ingestion and deduplication.
- [ ] Add filtering and contamination detection.
- [ ] Create deterministic training configurations and checkpoint manifests.
- [ ] Add resume, checkpoint validation and failure recovery.

### C2. Instruction and preference tuning
- [ ] Build owned/licensed instruction examples.
- [ ] Add supervised fine-tuning experiments.
- [ ] Evaluate preference optimisation methods on a small scale.
- [ ] Compare against base model and open-model adapters.

### C3. Scaling feasibility
- [ ] Estimate compute, storage, data, energy and engineering needs.
- [ ] Benchmark scaling behaviour on available hardware.
- [ ] Prepare a separate business case before any hardware/cloud spend.
- [ ] Keep frontier-scale pretraining as a long-term ambition.

**Gate:** technical feasibility report and explicit owner approval before spend or hardware purchase.

## Workstream D — Recomp Lab (parallel)

- [ ] Maintain isolated package and independent tests.
- [ ] Add strict job/result schemas and artifact provenance.
- [ ] Build executable inspection for authorised sample binaries.
- [ ] Build instruction decoder and small translation subset.
- [ ] Add equivalence tests against reference programs.
- [ ] Add shader validation and synthetic graphics test scenes.
- [ ] Expose Recomp Lab as a restricted Astra X tool only after schema/security review.
- [ ] Keep GTA 6 work to public research and authorised test inputs.

## Release gates

A feature moves through: planned -> implemented -> automated-tested -> security-reviewed -> owner-device-verified (where required) -> preview-verified -> production-approved.

A merged PR, passing unit test or attractive dashboard does not establish full production readiness. Production integration and deployment require separate review, owner approval where needed and a rollback plan.
