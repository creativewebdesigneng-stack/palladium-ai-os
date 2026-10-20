# AI Hub gateway: never record success for paused runtime work

## Problem

The existing AI Hub agent and workflow adapters awaited their respective
canonical runtimes, then always returned `status: completed` to the approval
gateway. Both canonical runtimes can resolve without terminal success:

- `executeAgentTask` returns an agent task whose persisted status is
  `waiting_for_approval` when a tool call needs a separate approval.
- `executeWorkflow` returns a workflow run with `waiting_for_approval`
  when a workflow step pauses. It can also return a `failed` run for
  a blocking step failure.

An outer approved AI Hub request must **not** become a recorded gateway
success simply because the runtime function returned. This would cause
Astra Spider's receipt inspector to present misleading history.

## Bounded repair

Use the existing `AiHubExecutionGateway` and `approval_requests` state
machine; do **not** add a second execution or approval architecture.

- The AI Hub adapter now returns completed only when the persisted underlying
  agent task / workforce run has status `succeeded`.
- For all other/missing states, the **AI Hub gateway attempt** returns
  failed. A separate nested tool or workflow approval remains in its
  authoritative runtime, and must be resumed in Agent Tasks / Workforce.
  This is **not** a cancellation or rewrite of the underlying task.
- The existing approval gate records failure for a non-completing outer
  attempt. The status belongs to the AI Hub gateway attempt, **not** to the
  underlying task's entire future lifecycle. A future change to support
  nested resumptions would require separate state-machine design and tests.
- The existing AI Hub screen surfaces returned `failed` responses from
  agent/workflow and external-MCP actions. React Query resolves these
  responses successfully at the transport level, so they cannot be shown
  only through `isError`.
- Never trust a nonempty model response or a nonempty workflow output as
  proof of terminal execution. Only the persisted canonical runtime status
  is accepted.

## Verification

Vitest covers success, failure, cancellation, unknown states and nested
approval pauses, plus wiring to the canonical adapter and UI failure
display. Full build, strict TypeScript, tests, isolated database policy
checks and Preview must pass before merge.

No live run, external tool call, new connector, migration, or provider
certification is claimed by these unit tests. The user must still authorise
real tool execution before its end-to-end outcome is certified.
