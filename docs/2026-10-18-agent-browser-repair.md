# Existing agent browser configuration repair — 18 October 2026

Scope: existing Blackstar agent editor/runtime/registry and Workforce. No replacement architecture, schema migration, archive activation, or Production release.

## Confirmed findings

- QA Groq 20B (`b2fea39e-92d3-4a1f-8928-6ff744686630`) still has an empty `allowed_tools` array and requires approval. It was originally created without tools; empty configuration alone is not evidence of lost persistence.
- The runtime sidebar displayed tools without an edit control. Full agent normalization also capped saved assignments at 30, below some existing agents' tool counts.
- Direct agent browser calls could reach the generic approval refusal without a resumable request. Personal tasks already had an immutable-payload approval/resume lifecycle.
- The personal-agent editor could substitute default tools for an explicitly empty list, inject default domains on edit, and reset existing permission rows during a detail save.
- Workforce cards counted only `completed`, while the runtime persists `succeeded`. Capability certification had the same status mismatch.
- Workforce passed an entire usage response (including entitlement/recent-record objects) to a numeric panel; workflow output also used object string coercion.

## Repairs

- Existing sidebar now edits assignments from the live executable catalogue, shows browser-domain policy and saves agent-scoped policy through the existing authenticated permission service. A narrow owner-scoped, audited, compare-and-swap update persists only assignments. No model, identity, memory, approval or lifecycle fields are overwritten by this save.
- New browser assignments require saved non-empty agent policy. Invalid/empty browser domain settings fail closed. Runtime entitlement, catalogue, domain and approval checks remain authoritative. Permission lookup failures are surfaced, rather than treated as missing rows.
- Direct/browser streaming and planned runs reuse the existing paused tool payload, approval decision and agent task columns. A browser pause returns as waiting for approval, without another model round or a false successful receipt. Approval resumes exactly the locked call once, after reloading current grants and restrictions; subsequent calls retain approval requirements. Revocation, cancellation and mismatched associations are refused.
- Current saved assignments override stale registry tool declarations for effective bindings; changing assignments refreshes certification display. Configuration does not create verified evidence.
- Personal-agent editing preserves empty selections and existing policies when domains are omitted; explicit domain edits retain denial, approval and spending controls. Permission save failures are reported.
- Workforce uses successful runtime states consistently, reads the persisted tool/timestamp fields, separates approval/cancelled task states and displays numeric usage totals only. Structured workflow outputs are formatted as JSON. Usage scope is labelled as the latest loaded records, not a complete billing cycle.
- Preserves the existing browser Preview branch's editor portal/inline and early backend-credential checks. Merge conflicts retain the newer main-branch streaming receipt parser and its protection against automatic task replay.

## Release and acceptance requirements

Run the full application suite, build, typecheck and existing CI/security/database/worker checks before advancing the existing browser Preview branch. Preserve branch-scoped worker credentials without copying or decrypting them. Do not merge this PR into main or promote a deployment.

Live acceptance remains distinct from unit fixtures: sign in on Preview, edit the QA agent, assign `browser_task` with `httpbingo.org`, reload to verify persistence, request navigation to `https://httpbingo.org/html` and extraction, decide the immutable request in the existing Approval Centre, and correlate the same task with real `tool_executions`, browser session/steps and audit records. Confirm `simulated:false`, extracted content, final task status and approval linkage. Do not claim live success from mocked tests or the worker's separate acceptance tests.

At initial investigation the available Blackstar browser session redirected to sign-in. No agent policy or task row was changed through privileged SQL; all database inspection was read-only. Disabled/review archive records remain untouched.
