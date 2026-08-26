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
