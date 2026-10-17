# Agent feature verification — 17 October 2026

## Live finding and repair

The authenticated Agent Builder created QA Feature Verification 2026-10-17
(agent `44046eb7-d7f5-4225-8592-934c55fdff2d`) using Gemini 3.6 Flash.
Its six requested tools are calculator, current_time, data_analysis, memory_search,
memory_write and request_approval. Approval remains required; internet, files,
automation and external API scopes are disabled.

Task `f58e71eb-b298-4e39-b978-9727638b56ba` requested the synthetic expression
`37 * 19 + 5`. The calculator was correctly denied before execution by approval
policy (tool execution `b52c9b26-4aa8-4d3b-8b49-d1160c8ce78f`). The next native
Gemini request failed with HTTP 400. The adapter reconstructed function calls
without the opaque thought signatures required by Gemini 3 tool follow-ups.
The failed task and audit remain intact; no calculator or external action ran.

The repair retains public native response parts and their opaque signatures,
bound to the producing model, in server-side conversation history. Both atomic
and planned loops carry the continuation, including through durable checkpoints.
Parallel tool results are grouped into one user turn. Provider thought text is
excluded from visible text and persisted continuation. Signatures grant no tool,
provider, approval or tenant authority. No placeholder signature is fabricated.

Reference: https://ai.google.dev/gemini-api/docs/generate-content/thought-signatures

## Feature verification matrix

### Verified follow-ups

Gemini tool continuation PR #987 passed every CI gate and was normally merged
as `b916452456ef3365ff5729c504e479648f105156`. Exact-commit production deployment
`dpl_CgdC613nurdNekdtomPJabGnDQfN` reached READY. Authenticated live task
`b5af2ff6-908c-495f-a417-f64d1b6e89b2` completed with
`CALCULATOR BLOCKED BY APPROVAL`; its calculator execution remained denied.
Task, audit and usage agree on Gemini 3.6 Flash and 2,027 tokens. No approval was
bypassed and no calculator execution is claimed.

Workflow objective PR #989 passed every CI gate and was normally merged as
`18e702cef3de283dbf07a48238a0c1cf85a4067b`; exact-commit production deployment
`dpl_FRyDKaDXVi4KznPeqgD75nax19q2` is READY. After secure session refresh,
authenticated workflow run `932bb285-3862-4d18-b460-e4f97852fa8a` completed
successfully. Its only step saved `Delayed for 10 ms.` and the live Run History
displayed Completed. It used no agent, connector or external action.

Cancellation QA exposed an optimistic UI claim: task
`78c5f77b-0bbc-4795-9ffb-e6a84d127a3b` completed while the screen said cancelled.
The cancellation repair returns the actual owner-bound terminal receipt if
completion wins, waits for confirmation before aborting the UI stream, and
prevents a late provider response from overwriting a saved cancellation.
PR #990 passed all CI gates (2,870 app tests, 1,576 PostgreSQL checks, worker
safety and security audit). Merge `e005387ed3f6b48858ac0e185cfa38dc6f5d96ab`
is READY in production `dpl_BwCkEg4NBt5A2GxbJH8FPYKYQTdY`. Automated race tests
cover streaming and buffered execution. Live retest task
`d3815e69-652e-4ff7-9642-7cfe510e6898` failed with Gemini quota exhaustion
before cancellation could win. The UI displayed that saved failure accurately,
not a false cancellation. Live active cancellation remains quota-blocked.

Production semantic-memory logs reported embedding-provider rate limits.
Keyword fallback remains available; semantic recall is not certified healthy.
Approval request `531d3d09-4b04-44d0-8654-25af193b3864` was rejected through
the repaired authenticated UI at 12:58:26.353 UTC. Supabase saved rejected and
the Approval Centre displayed zero pending actions and the recent rejection.
No action was approved or executed.

Browser hit testing found that the animated preserve-3d mission frame sometimes
intercepts clicks intended for Reject and memory buttons. The control repair
keeps the shell flat and retains its ambient pulse. It does not alter approval
handlers, database policies or user permissions. Live rejection passed.
Further browser inspection found a separate obstruction: native notification
cards never scheduled expiry, close buttons had no dismissal callback, and the
empty fixed notification containers intercepted clicks. The existing hook now
schedules its removal queue; the renderer hides dismissed cards immediately,
wires the labelled close button, and lets empty notification containers pass
pointer events. No new notification system or permission is introduced.

| Feature | Evidence / current status |
| --- | --- |
| Authentication and agent creation | Live authenticated wizard creation and owner-bound Supabase record verified. |
| Model inference / fallback | Earlier no-tool QA tasks `5aa78c33-9cdb-4e8b-8244-56c970ce6e9d` and `66f191b2-0680-49f4-9d08-e90d1a00b45b` succeeded on actual Gemini 3.6 Flash; task, audit and usage agree. |
| Tool permission enforcement | Live calculator denial and Gemini follow-up both verified; no calculator execution claimed. |
| Approval request / decision | Synthetic request created and rejected through authenticated UI; rejected status and decision time verified in Supabase. No external action executed. |
| Memory | Automated consent, provenance, isolation, capture and search tests pass. Semantic lookup reported embedding-provider limits; live memory-form check awaits notification repair. No privacy override. |
| Planning / verification / steering / cancellation | Automated boundaries and late-provider cancellation races pass. UI now renders the saved terminal receipt; live active cancellation is blocked by Gemini quota. |
| Workflows / scheduler | Delay-only live run succeeded and Run History displayed Completed. Recent worker receipts: HTTP 200, no degradation or processor failures. |
| Durable recovery | Three legacy QA runs have no checkpoint and cannot safely replay. Audited bounded repair remains draft #988; normal migration retries return expired requestState and the function is confirmed absent. No direct state edits. Approval pauses protected. |
| Browser Use / connected services | Browser worker policy tests pass. Real execution requires the existing authenticated healthy worker/provider and assigned capability. No external writes or credential substitution used for certification. |
| OpenViking / AgentMemory | Archive audit remains subject to authenticated deployment, licensing and tenant-isolation requirements documented in the existing archive integration reports. No replacement memory system deployed. |
| Scientific / Diagram guides | Existing secure importers completed all 177 scientific skills plus Diagram Design. All 178 remain disabled; scientific verdicts 121 OK, 7 warning, 49 dangerous; Diagram OK. |
| Both Harness collections | Adopted through existing governance and negative-boundary tests; no separate engine or benchmark score claimed. |
| Native inference / 3D / Cinema / external connectors | Contract and safety coverage is not live provider verification. Missing authenticated workers, connections or hardware remain explicit external prerequisites. |

## Verification

Focused native transport, atomic/streaming/planned continuation and checkpoint
regressions: 30 tests passed. Production build and TypeScript check passed.
Full regression and release receipts are recorded in the PR after execution.

Notification lifecycle regressions verify expiry and immediate dismissal with
fake timers and the rendered existing Toaster. Full app suite: 2,872 tests in
649 files passed locally. Notification release still requires CI and live
acceptance before declaring the obstruction resolved.

The independently prepared recovery branch passed 2,868 application tests in
648 files, 1,576 isolated PostgreSQL authorization checks across 15 suites,
26 browser-worker tests and 8 Python safety tests. Its additional recovery tests
are not part of the Gemini continuation release. Local Windows PowerShell parsing
was unavailable because pwsh is not installed; CI retains that check.

No claim that every external agent feature is live-certified is justified yet.
