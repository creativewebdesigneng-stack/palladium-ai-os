# Evidence-gated intelligence routing — 20 October 2026

## Purpose

Implement the *architectural idea* behind the publicly demonstrated "Prompt Spider"
style workflow in Blackstar, not third-party source code. Direct access to the
creator's implementation, source licence and benchmarks has **not** been verified.
This is our own extension of the existing AI Hub Intelligence Router.

## Reused rather than duplicated

- `src/lib/ai-hub/router.ts` still decides eligible routing from deployment,
  capability, cost, latency, reliability, quality and policy signals.
- `src/lib/ai-hub/orchestrator.ts` still owns planning and placement.
- `src/lib/ai-hub/execution.ts` still dispatches through the existing
  approval gate and provider adapters.
- `src/screens/AIHub.jsx` and `src/components/ai-hub/AiHubNetworkScene.jsx`
  remain the existing AI Hub control surface. The new explorer is an additional
  read-only view of the current tenant's inventory.
- No database tables, independent model gateways, connector stacks,
  credentials, production settings or external third-party code were added.

## Opt-in behaviour

The optional `workload.requirements.evidenceRouting = { mode: 'evidence-gated' }`
asks the existing router for a planned decision trace:

1. **Deterministic tool**: a tool must explicitly declare
   `executionClass: 'deterministic'`, `verifiedExecutor: true` and
   `readOnly: true`, with >=20 observed executions and >=0.8 Bayesian-smoothed
   historical success. These are planning conditions, not proof the tool is safe.
2. **Model escalation**: if no tool qualifies, a matching model can be selected
   *only* when inventory metadata explicitly says `configured: true`.
3. **Human review**: if neither qualifies, plan an eligible resource but require
   the existing human approval gate before any dispatch. No candidate => no plan.

Existing `requireHumanApproval`, tenant policy, capability matching and
runtime controls **still apply on every lane**. There is no auto-permission
for "read-only" or purported deterministic tools. A forged plan that marks
human review but disables approval is rejected before adapter invocation.

The `decisionTrace` records candidate identifiers, evidence thresholds,
sample counts and selected planning lane. It is deliberately labelled
`planned-not-executed`: it is **not** an execution receipt, audit event,
calibrated model confidence, or indication that a tool actually ran.

## UI

The new **Decision network** section beneath the existing live AI Hub topology
uses the inventory already returned to the signed-in user. Selecting a required
capability and routing objective previews the evidence-based lane. No prompt is
transmitted, task created, provider invoked or side effect performed.

## Important limits and next work

- The existing AI Hub execution entrypoints for explicitly selected agents,
  workflows and MCP tools still follow their original approval behaviour.
  They are **not** silently switched into this optional policy.
- Existing tool inventory does not yet certify deterministic executors with
  enough real execution evidence. Until certification data is available,
  corresponding candidates fall back to model escalation or human review.
- Historical task success is only a heuristic, not calibrated confidence.
  Real deterministic proof needs versioned tool attestations, domain/action
  checks, signed execution audits and tests against actual workers.
- Operational adoption requires connecting this opt-in mode to specific
  authorised agent workflows, persisting the trace through existing audit
  records, and evaluating whether chosen routes improve outcomes.
- Runtime acceptance, browser navigation, real provider availability and
  end-to-end prompt-to-execution performance must be checked separately.
  Static unit tests cannot establish those outcomes.

## Verification

The new `evidence-routing.test.ts` covers opt-in compatibility, verified
read-only deterministic selection, missing evidence, configured model fallback,
human approval and no-candidate routing. `decision-explorer.test.ts` checks
inventory reuse and that no execution calls are wired to the explorer.

Do not mark the feature fully operational until the CI results and real
executor/audit acceptance evidence are recorded.
