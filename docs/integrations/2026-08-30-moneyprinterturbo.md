# 2026-08-30 MoneyPrinterTurbo integration audit

MoneyPrinterTurbo was audited before implementation. PalladiumAI does not import it as a second application or duplicate its provider, task, upload or media-management layers. The integration keeps PalladiumAI as the system of record and carries over the useful automated short-video workflow.

## Source audit

The supplied `MoneyPrinterTurbo-main` archive is MIT licensed. The audited implementation includes an automated short-video pipeline covering AI-assisted script generation, stock/generated/provided media sourcing, narration/TTS, subtitle generation/alignment, background music, transitions, clip composition/rendering, task status and publishing/upload concepts.

The source application's Python/MoviePy-style rendering runtime, provider-specific credential handling, task API/UI, upload layer and model-provider routing are not copied into PalladiumAI because equivalent or better native systems already exist.

## PalladiumAI integration decision

The useful capability is represented as **Automated short videos** inside the existing **Media Studio** rather than as a new top-level application.

PalladiumAI remains authoritative for:

- authenticated access and owner-scoped RLS;
- AI script planning through the existing Model Gateway and user model preference;
- job history through the existing `media_generation_jobs` table;
- audit events;
- Media Studio UI;
- governed agent execution through the existing Harness, Tools Framework, tool grants and `tool_executions` audit path;
- downstream publishing and scheduling through Social Operations;
- platform integrations, credentials, approvals and policy boundaries.

A separately deployed short-video worker owns the heavy media-processing work: stock/generated media assembly, narration rendering, subtitle alignment, soundtrack mixing, transitions and final video composition. This follows the same worker boundary already used by the existing Seedream and LTX Media Studio lanes instead of introducing a Python media stack into the web runtime.

## Worker contract

Server-only configuration:

- `SHORT_VIDEO_WORKER_URL`
- optional `SHORT_VIDEO_WORKER_TOKEN`

The worker exposes the bounded contract `POST /jobs` and `GET /jobs/:id`. PalladiumAI submits only validated production settings: script, aspect ratio, duration, media-source mode, public source URLs, narration voice, subtitle mode, background-music toggle and transition.

If no worker is configured, the UI reports that rendering is unavailable. PalladiumAI does not simulate a completed video or fabricate an output URL.

## Agent access

The existing Tools Framework gains one bounded `short_video` catalogue capability rather than a separate agent runtime. Agents may request only `capabilities`, `list`, `create` and `status`; the tool accepts no credentials, arbitrary filesystem paths or shell commands. Access still depends on the agent's existing allowed-tool set, catalogue state, plan entitlement and Harness policy, and execution is recorded through the existing tool execution audit path.

## Database and navigation

No new job table is required. `media_generation_jobs` already provides owner identity, RLS, status, worker job ID, output URL, error state, timestamps and flexible metadata. A backwards-compatible migration only widens its existing provider constraint to include `short_video` and registers the bounded `short_video` Tools Framework catalogue entry.

No new top-level page is required. The feature is mounted in the existing Media Studio workspace alongside the Seedream/LTX generation panel. Social publishing remains in Social Operations rather than duplicating MoneyPrinterTurbo's upload/post layer.

## Security boundaries

- Worker tokens remain server-side and are never exposed with `VITE_` variables.
- Supplied media URLs must be absolute HTTP(S) URLs.
- localhost, loopback, link-local, `.local` and private IPv4 targets are rejected before worker submission.
- The browser never receives the worker token.
- Existing Supabase owner RLS remains the authority for stored jobs.
- Model generation uses the existing PalladiumAI model preference/gateway path instead of provider keys supplied to this feature.
- Agent access remains governed by existing tool permissions and Harness input policy.
- Publishing credentials and approval/policy enforcement remain in the existing integration/Social Operations path.

## Duplication avoided

The integration intentionally does **not** add a second model router, TTS credential store, task database, scheduler, uploader, social planner, agent runtime, approval system, media library or top-level video application. Those remain existing PalladiumAI systems.