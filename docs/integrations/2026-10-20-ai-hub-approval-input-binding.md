# AI Hub approval input binding — 20 October 2026

## Finding

The existing `approval_requests` claim matched operator, organisation,
workload, provider, capability, approval state and execution state, but did not
bind the approved execution to the **exact task input**. An approved pending
request for an AI Hub agent/workflow/MCP capability could therefore be offered
back with changed goal text or changed MCP tool arguments, while retaining the
same approval ID.

## Repair

The existing `createAiHubApprovalGate` now constructs a canonical
representation of its input and includes a SHA-256 `ai_hub_input_fingerprint`
in the existing `approval_requests.details` JSON object.

- Request lookup, insertion and atomic claim all use this binding.
- The fingerprint is recomputed on the server from the authenticated actor,
  tenant/organisation scope, workload, provider, capability and the exact
  canonical input. It cannot be supplied directly by clients.
- Identical JSON objects with different key order produce the same fingerprint.
- Non-serialisable, missing, circular, excessively nested or oversized inputs
  fail closed.
- Agent and workflow execution already passed their goal as `context.input`.
- External MCP dispatch now passes the **parsed and validated tool input**
  through the same context. Both execution types keep their existing operator
  approval system, owner restrictions and policy boundaries.
- No new table, column, credentials, permissions, bypass or database migration.

**Privacy note:** SHA-256 is a deterministic equality fingerprint, **not**
encryption, a confidential commitment, a digital signature, or a cryptographic
attestation of model correctness. Approval records still do not store raw
goal text or tool argument objects in the `details` payload. Because a
low-entropy input might be guessed from its hash, fingerprint data must remain
restricted by existing approval-record policies.

## Compatibility and operations

Previously issued `ai_hub_execution` approvals **without a fingerprint
will not match new claim and reuse queries**. This is deliberate: old approval
IDs must not be treated as authorisation for an input the system did not
bind. Operators should request a fresh approval for the exact task if an old
unexecuted request cannot be resumed. Old records are not deleted.

No change is made to the read-only Decision Network's visual output. This
hardening protects currently available manual execution routes and forms
part of the foundation for future evidence-gated agent execution.

## Verification

The existing approval-gate suite now checks fingerprint presence, absence of
raw input, exact objective binding, equivalent JSON key ordering, and
missing/non-serialisable data failure. The normal backend-check CI suite and
Preview deployment must pass before merge.

A real authorised MCP/agent approval-resume acceptance test and existing audit
record inspection remain required before claiming full end-to-end certification.
