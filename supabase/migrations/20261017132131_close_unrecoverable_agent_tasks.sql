-- The existing scheduler closes interrupted runs that cannot safely be resumed.
-- Never replay a model/tool action, close an approval pause, or steal a live lease.
create or replace function public.close_unrecoverable_agent_tasks(_limit integer default 4)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  task public.agent_tasks%rowtype;
  reason text;
  terminal_status text;
  closed integer := 0;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'service role required';
  end if;
  for task in
    select t.* from public.agent_tasks t
    join public.personal_agents a on a.id = t.agent_id and a.user_id = t.user_id
    where t.status in ('queued', 'running')
      and coalesce(t.heartbeat_at, t.started_at, t.created_at) < now() - interval '15 minutes'
      and (t.resume_lease_expires_at is null or t.resume_lease_expires_at < now())
      and (t.cancel_requested is true or t.checkpoint_state is null
        or t.checkpoint_state -> 'safe_to_resume' is distinct from 'true'::jsonb
        or t.checkpoint_state -> 'schema' is distinct from '1'::jsonb
        or coalesce(t.resume_count, 0) >= 3)
    order by coalesce(t.heartbeat_at, t.started_at, t.created_at), t.id
    limit greatest(1, least(coalesce(_limit, 4), 20))
    for update of t skip locked
  loop
    terminal_status := case when task.cancel_requested then 'cancelled' else 'failed' end;
    reason := case
      when task.cancel_requested then 'cancellation_requested'
      when coalesce(task.resume_count, 0) >= 3 then 'resume_attempts_exhausted'
      when task.checkpoint_state is null then 'missing_checkpoint'
      when task.checkpoint_state -> 'safe_to_resume' is distinct from 'true'::jsonb then 'unsafe_checkpoint'
      else 'unsupported_checkpoint'
    end;
    -- Required audit and terminal transition share one transaction. Any audit
    -- failure rolls back every change made by this invocation.
    insert into public.mission_audit_logs(user_id, org_id, agent_id, action, target_type, target_id, status, metadata)
    values(task.user_id, task.org_id, task.agent_id, 'agent.run_recovery_closed', 'agent_task', task.id::text,
      case when terminal_status = 'cancelled' then 'success' else 'failed' end,
      jsonb_build_object('reason', reason, 'terminal_status', terminal_status,
        'last_heartbeat_at', task.heartbeat_at, 'resume_count', task.resume_count,
        'actions_replayed', false));
    update public.agent_tasks set
      status = terminal_status,
      error = case when terminal_status = 'cancelled' then 'Cancelled by the operator.'
        else 'Execution interrupted without a safe recovery boundary. Review possible external effects before retrying; no actions were replayed.' end,
      completed_at = now(), heartbeat_at = now(),
      resume_lease_token = null, resume_lease_expires_at = null,
      resume_last_error = reason
    where id = task.id and user_id = task.user_id and status in ('queued', 'running');
    closed := closed + 1;
  end loop;
  return closed;
end;
$$;
revoke all on function public.close_unrecoverable_agent_tasks(integer) from public, anon, authenticated;
grant execute on function public.close_unrecoverable_agent_tasks(integer) to service_role;
notify pgrst, 'reload schema';
