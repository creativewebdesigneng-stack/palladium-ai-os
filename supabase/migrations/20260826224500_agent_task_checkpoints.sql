-- Durable, backwards-compatible runtime checkpoint storage for agent tasks.
-- Checkpoints are written only at safe execution boundaries; they are not a
-- licence to replay an in-flight external action.

alter table public.agent_tasks
  add column if not exists checkpoint_state jsonb,
  add column if not exists checkpoint_version integer not null default 0,
  add column if not exists checkpointed_at timestamptz,
  add column if not exists resume_count integer not null default 0;

create index if not exists agent_tasks_checkpoint_resume_idx
  on public.agent_tasks (user_id, status, checkpointed_at desc)
  where checkpoint_state is not null
    and status in ('queued', 'running');

comment on column public.agent_tasks.checkpoint_state is
  'Durable runtime snapshot written only at safe model/tool/verification boundaries; never implies an in-flight external write is safe to replay.';
comment on column public.agent_tasks.checkpoint_version is
  'Monotonic runtime checkpoint schema/version counter for safe resume validation.';
comment on column public.agent_tasks.resume_count is
  'Number of times execution has been resumed from a durable checkpoint.';