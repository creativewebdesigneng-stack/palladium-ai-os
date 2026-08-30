# 2026-08-30 creative, social and agent integration audit

This batch was audited before implementation. The goal is to preserve the useful capabilities of the supplied projects while keeping PalladiumAI as the single system of record for agents, tools, workflows, approvals, prompts, CRM, Knowledge, integrations, media jobs and audit state.

## Audit summary

| Archive | Licence observed in supplied source | Useful capability | PalladiumAI integration decision |
| --- | --- | --- | --- |
| taste-skill-main | MIT | Design, redesign, image-to-code, brand, mobile/web visual and output-completeness playbooks | Consolidated into existing security-scanned Agent Skills. No new runtime or page. |
| LuxTTS-master | Apache-2.0 | High-quality 48 kHz TTS / reference-audio voice cloning | Added as a separately deployed worker inside existing Voice Studio. PalladiumAI stores job metadata, not reference audio bytes. |
| Ornith-1-main | MIT | Self-scaffolding/self-improvement execution pattern | Added as a bounded Agent Skill using existing Harness, sub-agent limits, checkpoints and verified skill reflection. No autonomous permission escalation. |
| awesome-seedream-5-prompts-main | MIT | 200 prompt examples across 15 production categories plus structured prompt guidance | Consolidated into 15 installable, versioned collections in existing Prompt Workspace. No duplicate prompt database. |
| SeeDream-5.0-Pro-main | Apache-2.0 | Image generation/editing workflow and visual-prompt concepts | Added a Seedream-compatible external image worker lane to existing Media Studio. The supplied sandbox UI/server is not duplicated. |
| superplane-main | Apache-2.0 | Durable operational delivery, policy gates, approvals, progressive rollout and incident workflows | Added reusable operational playbooks that use existing Workflows, Automation Studio, approvals, integrations and durable workers. No second scheduler/workflow engine. |
| LTX-2-main | LTX Community License | Synchronized audio/video generation, text-to-video and image-to-video | Model code/weights are not copied into PalladiumAI. Added an external LTX-compatible worker lane in Media Studio. |
| Raven-main | Apache-2.0 | Long-horizon harness patterns, traces, memory, skills, evaluation and research escalation | Added a long-horizon execution playbook on top of existing Agent Runtime/Harness, Memory, Skills, Research and telemetry. No duplicate harness. |
| postiz-app-main | AGPL-3.0 | Multi-network social publishing/scheduling | No AGPL source copied. Existing Social Operations can discover a connected `postiz` integration capability and use it as an approval/policy-controlled publishing target. |
| scout-main | Apache-2.0 | Company intelligence through navigation across web, workspace, CRM, Knowledge and MCP | Added a company-intelligence navigation playbook using existing web, Integrations, CRM, Knowledge, MCP and bounded sub-agent systems. No duplicate CRM/wiki. |

## Native PalladiumAI changes

### Skills & Agent Runtime

The existing `agent_skills` subsystem remains authoritative. An audited built-in pack can be installed from **Skills & Tools**. Every playbook is passed through the existing skill package scanner before persistence. The pack includes the Taste design workflows plus Ornith, Raven, SuperPlane and Scout operating patterns. These playbooks provide procedure and decision guidance only; they do not create executable tools, grant credentials or bypass the Agent Runtime policy engine.

### Prompt Workspace / Seedream prompt pack

The existing private, versioned Prompt Workspace remains authoritative. The supplied Seedream prompt library is represented as 15 production collections aligned to its category structure. The collections preserve the source library's useful prompt-engineering behaviour: explicit task/audience, subject, composition, visual language, exact text, invariants, avoid rules and acceptance checks. Reinstalling the pack creates normal new prompt versions instead of maintaining a second prompt catalogue.

### Media Studio / Seedream and LTX

Media Studio now exposes two optional generation worker lanes in addition to its existing automatic editing runtime:

- `SEEDREAM_WORKER_URL` (+ optional `SEEDREAM_WORKER_TOKEN`) for text-to-image, image editing and multi-image composition.
- `LTX_WORKER_URL` (+ optional `LTX_WORKER_TOKEN`) for synchronized text-to-video, image-to-video and audio/video generation.

Both use the same bounded worker contract: `POST /jobs` to submit and `GET /jobs/:id` to refresh. Jobs are persisted in `media_generation_jobs` with owner-scoped RLS. Private/local source URLs are rejected before worker submission. PalladiumAI never fabricates a successful render.

The LTX model's large weights/CUDA runtime and its custom Community License remain outside PalladiumAI. Deploying an LTX worker is a separate operational/licensing decision.

### Voice Studio / LuxTTS

Voice Studio keeps its existing OpenAI TTS/STT functionality and gains an optional LuxTTS section. `LUXTTS_WORKER_URL` (+ optional `LUXTTS_WORKER_TOKEN`) points to a separately deployed worker with `POST /synthesize`.

Reference voice audio is converted for the explicit request and sent to the configured worker only when the operator presses generate. PalladiumAI stores text, reference filename/MIME type, speed/steps, duration, output byte count and status in `voice_clone_jobs`; it does not persist the uploaded reference audio bytes. The UI labels the upload as consent-backed reference audio.

### Social Operations / Postiz

PalladiumAI's existing `social_posts` and `social_post_targets` remain the scheduling and audit records. `postiz` is accepted as an integration capability provider alongside direct social providers. A Postiz connection must still be exposed through PalladiumAI's existing integration runtime. Credentials are not accepted in social post data, and the existing `prepareIntegrationAction` policy/approval path remains authoritative.

No Postiz AGPL frontend/backend source was imported into PalladiumAI.

## Pages

No new top-level pages were required for this batch. The correct homes are:

- **Skills & Tools** — Taste, Ornith, Raven, SuperPlane and Scout playbooks.
- **Prompt Workspace** — Seedream production prompt collections.
- **Media Studio** — Seedream image generation and LTX video generation.
- **Voice Studio** — LuxTTS voice cloning, alongside existing TTS/STT.
- **Social Operations** — direct social destinations plus optional Postiz aggregator capability.

This avoids duplicate workspaces and keeps navigation coherent.

## Database changes

Two owner-scoped tables are added because their jobs are genuinely new execution records rather than duplicates of existing schemas:

- `media_generation_jobs` for Seedream/LTX worker generation.
- `voice_clone_jobs` for LuxTTS metadata.

Existing `agent_skills`, `saved_prompts`, `saved_prompt_versions`, `social_posts`, `social_post_targets`, workflow/approval, CRM, Knowledge and integration tables are reused unchanged.

## Security and runtime boundaries

- All worker tokens are server-only and documented without `VITE_` exposure.
- Heavy Python/CUDA/model-weight stacks are not imported into the web runtime.
- No simulated generated media/audio is returned when a worker is unavailable.
- Source URLs are validated before generative-media submission and local/private IPv4 targets are blocked.
- LuxTTS reference audio is not persisted by PalladiumAI.
- Skill packages are scanned using the existing scanner.
- Social action payloads retain existing secret-like-field rejection.
- External publishing and operational mutations remain subject to existing integration policy and approvals.
- AGPL Postiz source and custom-licensed LTX model code/weights are not copied into the PalladiumAI repository.
