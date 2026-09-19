-- Repair production drift in the original agent_tasks execution record.
-- Preserve existing task IDs and owner-scoped RLS; only add absent columns.
alter table public.agent_tasks
  add column if not exists task_id uuid references public.personal_tasks(id) on delete set null,
  add column if not exists output jsonb,
  add column if not exists error text,
  add column if not exists tokens_in integer not null default 0,
  add column if not exists tokens_out integer not null default 0,
  add column if not exists cost_pence numeric not null default 0,
  add column if not exists duration_ms integer,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists heartbeat_at timestamptz,
  add column if not exists provider text,
  add column if not exists model text,
  add column if not exists planner_state jsonb not null default '{}'::jsonb,
  add column if not exists verification_state jsonb not null default '{}'::jsonb,
  add column if not exists replan_count integer not null default 0;

-- Keep runtime crash recovery privileged. Anonymous clients must never be able
-- to read execution state, even when another table grants public access.
revoke all on public.agent_tasks from anon;
grant all on public.agent_tasks to service_role;
alter table public.agent_tasks enable row level security;

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

-- Concurrency-safe leases for resuming stale agent runs from durable checkpoints.
-- Only service-role workers may claim runs. Approval-paused or terminal tasks are
-- deliberately excluded so resume never bypasses human approval or replays a
-- completed/failed task.

alter table public.agent_tasks
  add column if not exists resume_lease_token uuid,
  add column if not exists resume_lease_expires_at timestamptz,
  add column if not exists resume_last_error text;

create index if not exists agent_tasks_resume_lease_idx
  on public.agent_tasks (heartbeat_at, resume_lease_expires_at)
  where checkpoint_state is not null
    and status in ('queued', 'running');

create or replace function public.claim_resumable_agent_task(
  _stale_before timestamptz,
  _lease_seconds integer default 120
)
returns setof public.agent_tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  _task_id uuid;
  _lease uuid := gen_random_uuid();
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required';
  end if;

  select t.id
    into _task_id
  from public.agent_tasks t
  where t.status in ('queued', 'running')
    and t.checkpoint_state is not null
    and coalesce((t.checkpoint_state ->> 'safe_to_resume')::boolean, false) = true
    and coalesce((t.checkpoint_state ->> 'schema')::integer, 0) = 1
    and t.heartbeat_at < _stale_before
    and (t.resume_lease_expires_at is null or t.resume_lease_expires_at < now())
  order by t.heartbeat_at asc nulls first, t.created_at asc
  for update skip locked
  limit 1;

  if _task_id is null then
    return;
  end if;

  return query
  update public.agent_tasks t
     set resume_lease_token = _lease,
         resume_lease_expires_at = now() + make_interval(secs => greatest(30, least(_lease_seconds, 600))),
         resume_count = coalesce(t.resume_count, 0) + 1,
         resume_last_error = null,
         heartbeat_at = now()
   where t.id = _task_id
   returning t.*;
end;
$$;

revoke all on function public.claim_resumable_agent_task(timestamptz, integer) from public, anon, authenticated;
grant execute on function public.claim_resumable_agent_task(timestamptz, integer) to service_role;

create or replace function public.release_agent_task_resume_lease(
  _task_id uuid,
  _lease_token uuid,
  _error text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  _updated integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required';
  end if;

  update public.agent_tasks
     set resume_lease_token = null,
         resume_lease_expires_at = null,
         resume_last_error = left(_error, 1000),
         heartbeat_at = now()
   where id = _task_id
     and resume_lease_token = _lease_token;

  get diagnostics _updated = row_count;
  return _updated = 1;
end;
$$;

revoke all on function public.release_agent_task_resume_lease(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.release_agent_task_resume_lease(uuid, uuid, text) to service_role;


-- Bound automatic crash recovery so a persistently failing resumable run cannot
-- be claimed forever. The third claimed resume is the final automatic attempt;
-- the worker closes the task if that attempt fails.

create or replace function public.claim_resumable_agent_task(
  _stale_before timestamptz,
  _lease_seconds integer default 120
)
returns setof public.agent_tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  _task_id uuid;
  _lease uuid := gen_random_uuid();
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required';
  end if;

  select t.id
    into _task_id
  from public.agent_tasks t
  where t.status in ('queued', 'running')
    and t.checkpoint_state is not null
    and coalesce((t.checkpoint_state ->> 'safe_to_resume')::boolean, false) = true
    and coalesce((t.checkpoint_state ->> 'schema')::integer, 0) = 1
    and coalesce(t.resume_count, 0) < 3
    and t.heartbeat_at < _stale_before
    and (t.resume_lease_expires_at is null or t.resume_lease_expires_at < now())
  order by t.heartbeat_at asc nulls first, t.created_at asc
  for update skip locked
  limit 1;

  if _task_id is null then
    return;
  end if;

  return query
  update public.agent_tasks t
     set resume_lease_token = _lease,
         resume_lease_expires_at = now() + make_interval(secs => greatest(30, least(_lease_seconds, 600))),
         resume_count = coalesce(t.resume_count, 0) + 1,
         resume_last_error = null,
         heartbeat_at = now()
   where t.id = _task_id
   returning t.*;
end;
$$;

revoke all on function public.claim_resumable_agent_task(timestamptz, integer) from public, anon, authenticated;
grant execute on function public.claim_resumable_agent_task(timestamptz, integer) to service_role;

-- The bounded three-attempt claim RPC above is the canonical implementation;
-- the earlier unbounded definition is overwritten in the same migration.
revoke all on function public.claim_resumable_agent_task(timestamptz,integer)
  from public,anon,authenticated;
grant execute on function public.claim_resumable_agent_task(timestamptz,integer)
  to service_role;
revoke all on function public.release_agent_task_resume_lease(uuid,uuid,text)
  from public,anon,authenticated;
grant execute on function public.release_agent_task_resume_lease(uuid,uuid,text)
  to service_role;
notify pgrst,'reload schema';
