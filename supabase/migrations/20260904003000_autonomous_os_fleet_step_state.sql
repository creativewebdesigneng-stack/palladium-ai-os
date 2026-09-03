create or replace function public.sync_autonomous_fleet_step_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  autonomous_run_id uuid;
  assignment_key text;
  next_status text;
begin
  select agr.id
  into autonomous_run_id
  from public.autonomous_goal_runs agr
  where agr.workflow_run_id = new.run_id
    and agr.user_id = new.user_id
  limit 1;

  if autonomous_run_id is null then
    return new;
  end if;

  select ws.config ->> 'orchestrator_assignment_id'
  into assignment_key
  from public.workflow_steps ws
  where ws.id = new.step_id
  limit 1;

  if assignment_key is null or assignment_key = '' then
    return new;
  end if;

  next_status := case new.status::text
    when 'pending' then 'queued'
    when 'succeeded' then 'completed'
    when 'completed' then 'completed'
    when 'waiting_for_tool' then 'running'
    else new.status::text
  end;

  update public.autonomous_goal_fleet_assignments
  set status = next_status,
      updated_at = now()
  where run_id = autonomous_run_id
    and user_id = new.user_id
    and assignment_id = assignment_key;

  return new;
end;
$$;

drop trigger if exists autonomous_fleet_step_state on public.workflow_step_runs;
create trigger autonomous_fleet_step_state
after insert or update of status on public.workflow_step_runs
for each row execute function public.sync_autonomous_fleet_step_state();
