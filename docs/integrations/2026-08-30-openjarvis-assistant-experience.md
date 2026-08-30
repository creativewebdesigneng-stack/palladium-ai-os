# 2026-08-30 OpenJarvis assistant-experience integration audit

The supplied OpenJarvis source was audited before implementation. OpenJarvis is Apache-2.0 licensed. PalladiumAI does not import OpenJarvis as a second assistant, dashboard, agent runtime, websocket service, memory store or provider router. The useful interaction and observability patterns are adapted into PalladiumAI's existing systems.

## What was useful

The strongest reusable concepts were OpenJarvis's explicit speech/assistant lifecycle, live inference/tool event presentation, system-pulse dashboard treatment, provider-health visibility and trace-oriented debugging. Its dashboard makes the assistant's current work understandable rather than reducing the assistant to a chat bubble.

OpenJarvis also exposes multiple STT/TTS backends. PalladiumAI already has a stronger ambient voice path: continuous browser recognition, automatic cloud recording fallback, deduplication between recognition paths, speech-output echo avoidance, account preferences, current OpenAI transcription with `whisper-1` model fallback, and the separate Voice Studio/LuxTTS runtime. Those existing systems remain authoritative.

## Native PalladiumAI implementation

### Assistant lifecycle

A small browser-only activity bus represents safe public lifecycle state without storing audio, transcripts, memory or prompts. Supported states are:

- off
- idle
- listening
- transcribing
- thinking
- navigating
- working
- waiting for approval
- speaking
- error

The state is intended to be emitted by the existing global assistant and consumed by workspace UI such as the Home dashboard. It does not create a new execution channel.

### Assistant Pulse

The existing Home dashboard gains an **Assistant Pulse** panel. It combines current browser lifecycle state with authenticated server-side runtime facts from PalladiumAI's existing tables:

- voice enabled/muted status;
- configured cloud STT model;
- running and queued agent tasks;
- pending approval count;
- recent failures and completions;
- assistant requests in the last 24 hours;
- real task token/cost metadata where recorded;
- recent governed tool execution summaries where the audit table is available.

The panel links back to the existing Agent Runtime and Mission Control rather than creating an OpenJarvis dashboard page.

### Trace boundary

Only bounded trace summaries are exposed to the dashboard. Tool inputs/outputs, credentials, raw prompts, microphone audio, transcripts and memory contents are not copied into the Assistant Pulse. Existing `tool_executions`, `agent_tasks`, `approval_requests`, `usage_records` and voice preferences remain the systems of record.

## Deliberately not copied

- No OpenJarvis websocket server; PalladiumAI already uses Supabase realtime and its runtime telemetry paths.
- No second model/provider router; PalladiumAI's Model Gateway remains authoritative.
- No second memory system; existing PalladiumAI Memory remains authoritative.
- No duplicate assistant page or dashboard.
- No fabricated energy or thermal metrics. OpenJarvis can expose device-energy telemetry, but PalladiumAI does not claim measurements it does not collect.
- No regression from PalladiumAI's newer speech path to OpenJarvis's simpler recorder/query/TTS chain.

## Provider direction

OpenJarvis's provider abstraction confirms the value of keeping speech provider-neutral. Additional STT/TTS providers such as Deepgram can be added behind the existing PalladiumAI voice runtime later, but this integration does not duplicate provider credentials or weaken the current OpenAI/browser fallback path merely to match OpenJarvis's provider list.

## Database changes

None. This batch intentionally reuses current owner-scoped records and runtime audit data.
