# Recovery status type correction

The scheduled recovery RPC returned HTTP 400 because agent_tasks.status uses the
public.exec_status enum while terminal_status was declared text. Production
rejected the update and rolled back the required audit and task transition.
The previous isolated fixture used text for status and therefore missed this.

The new migration declares terminal_status using agent_tasks.status%type.
Permissions, eligibility, row locks, audit transaction and no-replay behavior are
unchanged. The original migration is retained; its correction is recorded as the
actual applied database version 20261017182912.

The fixture now uses the production enum values. Before correction three closure
tests reproduced the exact enum/text error; after correction all eight recovery
database tests passed, including audit rollback, cancellation, idempotency and
approval/lease protection. Full CI and scheduled production receipt verification
are recorded in the PR after completion.
