# Astra Core — evidence-first cognition and competitive certification

## Goal

Blackstar Astra should become a high-performance coordinating intelligence for web research, software engineering, operator-approved tasks, image/video/3D generation and cross-domain reasoning. This is an ambitious engineering programme, **not a claim of AGI, universal internet access, or demonstrated superiority to GPT/Claude/Gemini**.

## Current executable foundations

- Reuse the existing Astra model identity, verifier-gated Native Intelligence routing, General Intelligence kernel, agent runtime, Workforce/Orchestrator and AI Hub.
- Reuse the signed-in, owner-scoped \`listAiHubResources\` inventory and \`getAutonomousRuntimeControlPlane\` read-only state.
- The new cognitive-awareness panel is a projection, not another provider registry, control plane, or autonomous scheduler.
- A tool being registered is NOT proof that the current agent can use it. Generated media inventory and model configuration are NOT benchmark certifications.
- All agent tool execution remains governed by the current permissions, approval requests, security policy, tenant boundaries and durable evidence.

## Engineering workstreams

1. **Reasoning & awareness:** Real operational snapshots, bounded decomposition, independent verification, conflicting-evidence detection, uncertainty disclosure and measured context recall. Preserve no hidden chain-of-thought.
2. **Research & knowledge:** Existing browsing and search workers must provide source URLs, publication dates, retrieval timestamps, quoted spans, permission/robots constraints and contradiction checks. Search is bounded, not literally 'every corner of the internet'; never bypass access controls.
3. **Coding:** Repo-owned reproducible tasks, typechecking, unit/integration tests, sandbox execution, independent verifier and approved deploys. Track reproducible fixes rather than self-reported code quality.
4. **Image/video/3D:** Dispatch through existing Media, Cinema, Game Foundry and 3D workers. Evaluate prompt fidelity, consistency, temporal coherence, geometric validity, engine compatibility, rights and export success. Billing/configuration/worker health must be verified separately.
5. **Owned models:** Carefully select licensed open weights; use the existing OpenAI-compatible model gateway, collect permissioned training data, fine-tune specialized adapters, hold out validation sets and register only verified results. Do not represent a model gateway or external bootstrap as independently trained weights.
6. **Continuous learning:** Aggregate only authenticated audited outcomes with strict provenance and scoped access; introduce regression suites before model promotion or policy updates.

## Independent evaluation programme

| Track | Useful public benchmark / test | Release metric |
| --- | --- | --- |
| Complex cross-domain tasks | GAIA-style agent tests | Verified task completion, evidence coverage and cost |
| Hard-to-find web research | BrowseComp-style retrieval | Factual accuracy, source attribution, coverage, freshness |
| Coding | SWE-bench Verified and internally held-out Blackstar issues | Independently passing patch/tests without unauthorized edits |
| Multimodal perception | VHELM-style vision tasks | Grounded accuracy and hallucination rate |
| Image/video/3D creation | Blackstar consented blind human + automated geometric/media testsets | Fidelity, temporal/geometry constraints, legal provenance, export rates |
| Multi-agent operations | Owner-scoped browser, workforce and storefront acceptance | End-to-end persisted success, approvals, clean audit, no cross-tenant leakage |
| Resilience & safety | Fail-closed negative fixtures and real staging chaos tests | No false completions, bounded retries, operator stop effective |

**Comparison rule:** Compare systems on matched task sets, tool access, budgets, latency limits, sampling and grading. Publish the entire run configuration and failure rates. Do not label Astra 'better than' another system on a single unreplicated benchmark.

## First awareness slice (this PR)

A new read-only panel in the *existing* AI Hub consumes its existing resource feed and Autonomous OS health endpoint. It distinguishes nine cognitive domains as 'registered-unverified', 'not registered', or 'unknown', and reports the existing operator master-stop/scheduler signal. It refuses to count skills' required tools as execution grants or unconfigured assets as available. No new DB table, scheduler, authority layer or action path is added.

## Release prerequisites

- Keep this PR draft until prerequisite PR #1022 merges, tests pass, and the exact-head Preview is READY.
- Require real authorised web/browsing/media/worker tasks and audit receipts before certification.
- Never treat CI success as evidence of improved model intelligence or independent creative quality.
