-- Durable workflow execution queue.
-- A workflow request creates a queued row; a trusted worker atomically claims
-- it and executes outside the browser/server-function request lifetime.

alter table public.workflow_runs
  add column if not exists queued_at timestamptz,
  add column if not exists claimed_at timestamptz,
  add column if not exists worker_heartbeat_at timestamptz,
  add column if not exists worker_attempts integer not null default 0,
  add column if not exists worker_error text;

create index if not exists workflow_runs_queue_idx
  on public.workflow_runs (status, queued_at)
  where status = 'queued';

create index if not exists workflow_runs_running_heartbeat_idx
  on public.workflow_runs (worker_heartbeat_at)
  where status = 'running';

comment on column public.workflow_runs.queued_at is
  'When a durable workflow run became available to a background worker.';
comment on column public.workflow_runs.claimed_at is
  'When a worker atomically claimed this queued workflow run.';
comment on column public.workflow_runs.worker_heartbeat_at is
  'Last worker heartbeat used to identify abandoned running workflow jobs.';
comment on column public.workflow_runs.worker_attempts is
  'Number of background worker claims for this workflow run.';
comment on column public.workflow_runs.worker_error is
  'Last worker-level error, distinct from a workflow step failure.';
