# Astra X — Technical Architecture

**Status:** Architecture baseline for staged implementation  
**Ambition:** Frontier-capable capabilities over time; no claim of frontier-level performance today  
**Compute:** Existing local workstation first; no additional hardware or paid inference by default

## 1. Product definition

Astra X is Blackstar's independently governed intelligence platform. It combines model-agnostic orchestration, planning and agent execution, project memory, tool governance, evaluation, model adaptation and a long-term foundation-model research programme.

Keep two assets distinct:

- **Astra X Platform:** orchestration, interfaces, memory, tools, safety, evaluation, observability and deployment. Blackstar can own and improve this immediately.
- **Astra X Models:** open-weight models and adapters in the near term; Blackstar-owned model architecture and weights as a long-term research objective.

Astra X must never describe a third-party model as a Blackstar-trained model. A capable agent platform and a foundation model are different engineering deliverables.

## 2. Non-negotiable principles

1. Local-first: prefer the existing local inference service and fail closed if it is unavailable.
2. No surprise spend: no automatic remote fallback, paid API call, GPU rental or cloud training.
3. Model independence: provider adapters are replaceable; orchestration does not depend on one vendor SDK.
4. Evidence over claims: each capability has acceptance criteria and a visible status.
5. Human authority: consequential actions, external side effects, code execution and spend require policy checks and approval.
6. Least privilege: agents receive only the tools and data needed for a task.
7. Reproducibility: record model identity, quantisation, prompt/template version, context settings, dataset provenance and evaluation version.
8. Compatibility: integrate with existing Blackstar Astra services rather than creating a competing production runtime.
9. Upgrade-ready: model and hardware changes must not require redesigning the product.
10. Production safety: feature flags default off until reviewed and verified.

## 3. Logical architecture

    Blackstar AI OS (TanStack Start / React / TypeScript)
             |
             | authenticated server-side requests only
             v
    Existing Astra / AI Provider Gateway
             |
             +-- policy + task classification
             +-- deterministic model router
             +-- mission and conversation context
             +-- explicit project-memory retrieval
             +-- tool registry + approval gates
             +-- trace, cost and evaluation metadata
             |
             +-- local inference adapter
             |       |
             |       +-- existing local Ollama service
             |       +-- baseline qwen3:8b-q4_K_M
             |
             +-- optional future model adapters (disabled)
             +-- Recomp Lab job adapter
             +-- evaluation and verification

    Separate research track:
    Astra X Model Lab
      data provenance -> tokenizer/model experiments -> training/adaptation
      -> checkpoints -> evaluation -> signed model manifest -> approved runtime

This is the target design, not a claim that every component already exists.

## 4. Runtime subsystems

### 4.1 Task gateway and policy

Normalise each request into a typed task envelope containing task ID, parent mission ID, task kind, user/project scope, data classification, requested tools, permissions, latency/context budget, spend ceiling, approval requirements and trace ID.

Validate the envelope before routing. Browser clients never receive provider secrets and never call Ollama directly.

### 4.2 Model router

The router selects only registered, enabled and healthy providers. Selection is deterministic and auditable.

Initial policy:
- local provider preferred and required for normal Astra X operation;
- remote providers disabled;
- no silent fallback;
- no credentials in browser code;
- reject tasks whose context/capability requirements exceed provider declarations;
- record routing decision and reason.

Remote adapters may be designed behind interfaces for future use, but they must not be activated until the owner explicitly changes the budget and security policy after revenue.

### 4.3 Model adapter contract

Each adapter provides health, capabilities, bounded generation and optional embeddings. Responses include provider ID, model ID, adapter version, latency, token counts when available, truncation status and trace ID. Provider claims are not proof of model identity; compare the returned model with the local service's model listing.

### 4.4 Planner / executor / verifier

Use three explicit roles:
- **Planner:** creates a bounded plan with dependencies, expected outputs and approval points.
- **Executor:** performs one approved step using allowlisted tools.
- **Verifier:** checks output against acceptance criteria and independent tests.

A single model may perform multiple roles, but each role has separate instructions, permissions and logged outputs. The executor cannot approve its own high-impact actions. Retries are bounded and cannot expand permissions.

### 4.5 Memory and knowledge

Memory is project-scoped and provenance-aware. Support short-lived task context, explicit project facts/decisions, source-linked retrieval, correction/deletion, retention policy and stale/conflicting-memory detection.

Do not store credentials, secrets, payment data or unnecessary sensitive personal data in model memory. Retrieved content is untrusted data, not executable instructions.

### 4.6 Tool registry

Every tool declares a stable ID/version, input/output schema, required permissions, side-effect classification, timeout/resource budget, approval requirement and audit event schema.

No arbitrary shell, unrestricted filesystem, browser or network access is granted to an agent. Generated code is data until reviewed and executed inside a disposable restricted sandbox.

### 4.7 Evaluation and observability

Capture task/trace IDs, provider/model and exact revision, prompt/tool-schema versions, token counts where available, latency/resource usage, routing policy, verification outcome and human acceptance/correction.

Redact secrets. Do not log full sensitive prompts by default.

## 5. Two model-development tracks in parallel

### Track A — Open-weight model adaptation

- Keep the existing local Qwen3 8B quantised model as the initial baseline until measured evaluation identifies a better candidate.
- Check licence, architecture, tokenizer, context length, quantisation and tool-use support for every candidate.
- Evaluate on Blackstar coding, reasoning, research and tool-use tasks.
- Consider LoRA/QLoRA only after baseline measurements and a driver/memory compatibility check.
- Keep base weights and adapters separate and reversible.
- Measure KV cache and runtime buffers as well as model weights.

### Track B — Blackstar-owned model research

Build the independent model pipeline in progressively larger experiments:
1. tokenizer and data-format experiments;
2. tiny decoder-only transformer trained from scratch on a small, properly licensed corpus;
3. reproducible pretraining loop and checkpoint format;
4. instruction tuning on owned or appropriately licensed examples;
5. preference/evaluation experiments;
6. model cards, provenance and safety evaluations;
7. scaling feasibility report before any larger run.

The GTX 1080 Ti is suitable for small experiments and some local inference, not frontier-scale pretraining. A competitive frontier model requires substantially more compute, data and engineering. Do not promise frontier capability from local training on this card.

### Model release gates

A model is eligible only when licence/data provenance are documented, model hash/configuration are recorded, safety and capability evaluations pass, performance is measured on target hardware, rollback is tested and its status is labelled accurately as open-weight, adapted or Blackstar-trained.

## 6. Hardware and local runtime

Known target:
- NVIDIA GeForce GTX 1080 Ti, 11 GB VRAM;
- existing local Ollama installation;
- recorded baseline model qwen3:8b-q4_K_M.

Ollama's current hardware documentation lists the GTX 1080 Ti as compute capability 6.1 and specifies NVIDIA driver 570 or newer for compute capabilities 5.0–6.2. Confirm the actual driver and runtime on the owner's machine before changing anything: https://docs.ollama.com/gpu

The first hardware milestone is a read-only inventory. Do not install drivers, replace models, change CUDA stacks or modify the owner's machine without explicit approval.

Keep Ollama bound to localhost. Use the established authenticated local proxy/provider gateway; do not expose port 11434 or the raw Ollama API publicly. Existing server-only configuration names include OPENAI_COMPATIBLE_BASE_URL and BLACKSTAR_NATIVE_MODEL. Never move secrets into client-side variables.

A previously recorded GPT-OSS 20B attempt did not fit the 11 GB configuration. Do not treat it as a supported baseline without fresh measured evidence.

## 7. Blackstar AI OS integration

The repository currently uses TanStack Start, React and TypeScript with Vite. Astra X must use the existing application, authentication and server-side provider gateway; do not introduce a parallel Next.js application or duplicate authentication.

UI surfaces should remain thin clients of authenticated server routes:
- model/runtime status;
- active model and provenance;
- task routing explanation;
- agent mission timeline;
- approvals and tool permissions;
- evaluation results;
- local runtime diagnostics.

Production routes remain unchanged until a separate reviewed integration PR is approved.

## 8. Recomp Lab integration

Recomp Lab is a specialist engineering workspace, not a privileged shell agent. Astra X may explain public technical material, plan authorised experiments, generate test specifications, analyse source code and binaries supplied with permission, review compiler/shader results and propose patches for human review.

It must not ingest leaked GTA 6 executables/assets, bypass DRM/encryption/platform protections, distribute proprietary game code/assets or execute model-generated code on the host without sandboxing and approval.

Each Recomp Lab job carries task ID, input provenance, authorisation statement, target architecture, allowed analysis modes, resource limits, expected artefacts and verification evidence. Results return as structured reports and patch proposals, never as unreviewed production changes.

## 9. Security boundaries

- Provider keys are server-side secrets only.
- Ollama remains localhost-only; the authenticated proxy is the integration boundary.
- No public tunnel is a production dependency.
- No automatic paid inference or cloud training.
- Tools are allowlisted and permission-scoped.
- External content is untrusted.
- Model output cannot alter policy, permissions or secrets.
- Code execution requires disposable sandboxing, resource limits and explicit approval.
- Model/data artefacts are hashed and provenance-tracked.
- Production deployment requires review, CI, rollback and operator verification.

## 10. Definition of success

Astra X is not frontier because a dashboard says so. Progress is measured through reproducible benchmark suites, task success, reliability, tool-use correctness, latency, resource consumption, safety and independent review.

The first releasable outcome is a dependable local-first orchestration and evaluation layer using the existing Blackstar runtime safely. Foundation-model research remains a separate, evidence-gated long-term track.
