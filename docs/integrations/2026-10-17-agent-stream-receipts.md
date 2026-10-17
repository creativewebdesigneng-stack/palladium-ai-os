# Agent streaming usability — 17 October 2026

Story: a signed-in user runs a saved agent through the existing streaming route,
receives real text/tool events, and sees a confirmed terminal result or an
explicit uncertain/failure state. No replacement runtime is introduced.

## Findings and changes

- The existing client retried every HTTP 5xx through buffered execution. A proxy
  failure does not establish that the original run was never accepted. Remove
  automatic replay; retain safe server errors and require a deliberate user
  decision after checking history. The existing buffered API remains available
  to its explicit callers, with unchanged authentication and policy.
- EOF without a complete event returned null as if the stream finished normally.
  Require a successful task receipt; surface truncated/disconnected streams as
  uncertain, preserve the prompt and refresh owner-bound run history.
- Validate event-stream content type and completion shape. Support CRLF framing,
  split chunks and final frames without a blank-line terminator. Release reader
  locks on terminal receipt, failure and interruption.
- Builder preview read obsolete delta/tool/error event fields instead of runtime
  text/name/message. Align it to the existing contract and label denied/failed
  tools accurately rather than describing them as executed.

## Evidence boundaries

Transport tests cover HTTP 500/502/503/504 without replay, successful receipt,
split/final/CRLF frames, early EOF, terminal error, invalid receipts, unexpected
HTML and missing sign-in. Preview source-contract checks protect the field
mapping; they are not live model execution evidence.

Provider quota and embedding limits cannot be repaired by client code. Actual
active cancellation remains live-unverified while Gemini quota is exhausted.
Recovery draft #988 is still blocked by the normal migration connection's
expired requestState. No direct task-state edits, alternate credentials,
provider substitutions, approval overrides or consent changes are made.

Prior #991 live acceptance confirmed notification dismissal/expiry and personal
preference save/edit in both UI and Supabase; it did not certify semantic recall.
Full CI and exact-commit deployment receipts must be checked before release.
