-- Persist the approval gate a workflow run is currently waiting on so the
-- same run can be resumed safely after an owner decision.
--
-- These audit links intentionally do not use foreign keys: approval requests
-- and workflow/step ledgers may have independent retention lifecycles, and we
-- want historical run records to remain inspectable if a linked row is later
-- removed.

alter table public.workflow_runs
  add column if not exists waiting_approval_request_id uuid,
  add column if not exists waiting_step_id uuid;

create index if not exists workflow_runs_waiting_approval_request_idx
  on public.workflow_runs (waiting_approval_request_id)
  where waiting_approval_request_id is not null;
