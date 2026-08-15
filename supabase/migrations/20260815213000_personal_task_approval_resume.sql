-- Persist the approval gate and resumable model/tool state for a personal
-- agent task. The existing agent_tasks row remains the execution/audit identity
-- before and after the operator decision; resume must never create a second run.
--
-- Approval requests and task ledgers intentionally retain independent deletion
-- lifecycles, so waiting_approval_request_id is an audit link rather than a
-- foreign key. Existing rows remain valid because every new column is nullable.

alter table public.agent_tasks
  add column if not exists waiting_approval_request_id uuid,
  add column if not exists approval_resume_state jsonb;

create index if not exists agent_tasks_waiting_approval_request_idx
  on public.agent_tasks (waiting_approval_request_id)
  where waiting_approval_request_id is not null;
