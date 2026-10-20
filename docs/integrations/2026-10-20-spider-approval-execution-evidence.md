# Astra Spider — approval and gateway execution receipts (20 October 2026)

## Purpose

Connect the existing Astra Spider decision network to actual recorded AI Hub
approval gateway states. Reuse the existing `approval_requests` records instead
of inventing a synthetic 'live execution' signal or new logging subsystem.

## Source and trust boundary

- The read-only `listAiHubSpiderReceipts` endpoint requires Supabase
  authentication and queries `approval_requests` with **both**
  `user_id = context.userId` and `action_type = ai_hub_execution`.
- The authenticated Supabase client retains existing row-level security. This
  query does not use `supabaseAdmin`, change grants or issue an approval.
- Read volume is bounded to 1–100 latest records, 50 by default in the UI.
- Normalization allows only resource identity, gateway status, timestamps and
  receipt ID. Raw goals, MCP arguments, `execution_result` and task
  fingerprints are intentionally not returned.
- A saved `succeeded` state is a **recorded approval gateway outcome** based on
  an adapter reporting completion; it is **not** independent proof of provider
  output, a certified worker result or calibrated reliability score.
- An `approved` record without an execution state is never described as
  completed. Errors in reading the evidence are shown; not silently converted
  into successful executions.

## Visual behavior

- The spider continues to use the existing client-side read-only AI Hub router.
- The selected node's panel can now display the most recent scoped approval
  receipt matching **both provider ID and capability ID**; a coincidentally
  named model/tool is not mistaken for another provider's activity.
- A dotted ring around a node denotes a **historical recorded outcome** only.
  Planned routing lines are separate and retain their original explanation.
- The evidence query does not run, resume, claim or approve any task. All
  operator authorization stays in the existing AI Hub execution gateway.
- The UI refreshes the evidence feed periodically but does not claim this
  polling is a real-time execution event stream.

## Acceptance boundaries

Tests check the owner-scoped read, input and fingerprint exclusion, all gateway
states, collisions between provider identities, missing data, size bounds, and
non-execution UI wiring. Full end-to-end acceptance still needs an authorised
user to execute a real agent/MCP call, approve its exact input and verify
the corresponding receipt in the rendered hub. This work does **not** claim
that external provider output has been independently certified.

## Deployment

Apply through the existing GitHub CI and Vercel Preview checks. Do not merge
into Production without checks and a verified matching Preview deployment.
