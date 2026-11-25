# Astra X Integration Contracts

## 1. Blackstar AI OS integration

The existing product is a TanStack Start / React / TypeScript application. Astra X must integrate with its existing authenticated server-side AI gateway and native Astra services. It must not add a second authentication system, expose model credentials to the browser, or create a competing production inference runtime.

### Request flow

1. The authenticated application submits a task to an existing server route.
2. The server validates user, project scope, permissions and request schema.
3. Astra X creates a task envelope and trace ID.
4. The deterministic router selects the registered local provider.
5. The provider gateway forwards only supported OpenAI-compatible endpoints to local Ollama.
6. The response is validated and tagged with model/provider provenance.
7. Tool actions pass through the tool registry and approval policy.
8. The verifier evaluates the result and stores a bounded audit record.

The browser must never connect directly to Ollama or receive the bearer token.

### Existing Blackstar implementation to extend

The repository already contains the production model gateway at `src/lib/runtime/model-gateway.server.ts` and its transport/provider implementation at `src/lib/runtime/model-gateway.base.ts`. The compatible provider reads `OPENAI_COMPATIBLE_BASE_URL` and optional `OPENAI_COMPATIBLE_API_KEY` server-side. The Windows bearer proxy itself reads `BLACKSTAR_BRIDGE_TOKEN`; the cloud bridge setup prints the matching value as `OPENAI_COMPATIBLE_API_KEY` for the Blackstar server deployment.

Important routing distinction: `runChatPinned` is the exact-provider/model path used by evaluation and certification; it avoids cross-provider and alternate-model failover. The general `runChat` path has a configured-provider fallback order and can call external/metered providers. Astra X's local-only benchmark and any zero-spend execution must use an explicitly pinned compatible model path and enforce its own local-provider policy. Do not assume `BLACKSTAR_NATIVE_PRIMARY=true` alone prevents fallback in the general gateway.

Blackstar also already contains:
- AI Hub workload contracts, discovery, deterministic routing, orchestration, provider registry and approval-gated execution under `src/lib/ai-hub/`;
- native adapter registration for the model gateway, agent runtime, MCP, skills and workflows;
- agent planning/orchestration/trust code under `src/lib/agents/`;
- scoped memory retrieval and context policy under `src/lib/memory/`;
- Astra certification/evaluation suites under `src/lib/evals/` and `src/lib/ai/`.

A server-only bridge now exists at `src/lib/ai/astra-x-runtime.server.ts`. It validates the existing native runtime flag/model/endpoint settings, requires HTTPS plus a server bearer key for non-loopback endpoints, bounds text requests, disables tools and calls `runChatPinned` only. It deliberately does not claim endpoint reachability or prove that a remote tunnel terminates on the owner's workstation.

An authenticated server entry point now exists at `src/lib/ai/astra-x.functions.ts`. It uses the existing Supabase auth middleware and AI Hub execution gateway, and is disabled unless `ASTRA_X_ENABLED=true`. It routes text-only requests through the pinned compatible model bridge with no tools or cross-provider fallback. The console uses the existing Blackstar Memory Fabric and per-user memory preferences for scoped recall. Memory failures fail closed to no recalled context; the memory prompt is explicitly labelled untrusted reference data and cannot grant tools or permissions.

It must not create a parallel model gateway, approval queue, memory fabric or agent runtime. The existing research package's plan validator is a local testable policy primitive, not a replacement for the server-side AI Hub gateway.

### Existing local runtime to preserve

Previously recorded Blackstar setup:
- Ollama runs on the owner's Windows PC.
- Recorded local model: qwen3:8b-q4_K_M.
- An authenticated localhost-only bearer proxy/private bridge has been used.
- Server-only settings include OPENAI_COMPATIBLE_BASE_URL and BLACKSTAR_NATIVE_MODEL.
- The proxy exposes only /v1/models and /v1/chat/completions.
- Ollama itself stays bound to localhost.

These are prior recorded facts, not a fresh live health check. Verify them read-only before integration. Never publish the raw Ollama port or rely on a long-lived public tunnel in production.

### UI integration surfaces

Build only after backend contracts are stable:
- Astra X status and selected model;
- local runtime health and last successful heartbeat;
- model identity, quantisation and context metadata;
- task routing reason;
- mission plan and agent-step timeline;
- approvals queue;
- evaluation/regression report;
- resource and latency telemetry.

Status must distinguish configured, reachable, tested and production-enabled. Do not display "online" based solely on saved configuration.

## 2. Recomp Lab integration

Recomp Lab remains a separate research package and execution boundary. Astra X supplies planning, code explanation, test generation and review; Recomp Lab owns deterministic compiler/analysis tools and their test evidence.

### Job envelope

A Recomp Lab job contains:
- job_id, parent_task_id and trace_id;
- operation from a strict enum: inspect, disassemble, translate_subset, validate_shader or compare_output;
- input_artifact_ref and cryptographic hash;
- input provenance and authorisation record;
- target architecture and target runtime;
- allowed capabilities;
- CPU, memory, wall-clock and output-size limits;
- expected outputs and acceptance criteria;
- approval state.

### Result envelope

A result contains:
- job and trace IDs;
- tool and tool-version identity;
- input/output hashes;
- operation status and structured diagnostics;
- warnings and unsupported features;
- test evidence and reproducible command/configuration;
- artifact references;
- reviewer/approval status.

Do not return raw executable code for automatic execution. Patch proposals require review. Reject missing provenance or unsupported operation values.

### GTA 6 research boundary

The GTA 6 workstream is public-documentation research and lawful compatibility engineering only. Do not fetch, ingest, decrypt, execute or distribute leaked proprietary game files or bypass DRM. Use synthetic programs, open-source test binaries and shader samples with clear licences.

## 3. Shared governance

Both integrations use one Blackstar identity/permission source, trace IDs across gateway/Astra X/Recomp Lab, model and tool provenance, explicit approvals for side effects, zero-spend defaults, no automatic cloud fallback, production feature flags defaulting off, and independent acceptance tests plus rollback procedures.
