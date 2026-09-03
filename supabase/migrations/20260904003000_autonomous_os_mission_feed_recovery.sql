-- Surface specialist fleet execution through Mission Control's existing realtime
-- activity stream and schedule bounded self-healing for unattended autonomous goals.

alter table public.autonomous_goals
  add column if not exists recovery_attempts integer not null default 0,
  add column if not exists last_recovery_at timestamptz,
  add column if not exists last_recovery_error text;

create or replace function public.publish_autonomous_fleet_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  goal_name text;
  agent_name text;
  message_text text;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;

  select g.name into goal_name
  from public.autonomous_goals g
  where g.id = new.goal_id;

  select a.name into agent_name
  from public.personal_agents a
  where a.id = new.agent_id;

  message_text := format(
    'Autonomous OS · %s · %s · %s',
    coalesce(goal_name, 'Mission'),
    coalesce(agent_name, new.title, 'Specialist'),
    coalesce(new.status, 'updated')
  );

  insert into public.agent_activities (
    user_id,
    agent_id,
    message,
    kind,
    metadata
  ) values (
    new.user_id,
    new.agent_id,
    message_text,
    'autonomous_os',
    jsonb_build_object(
      'goal_id', new.goal_id,
      'run_id', new.run_id,
      'assignment_id', new.assignment_id,
      'assignment_title', new.title,
      'status', new.status,
      'requires_approval', new.requires_approval
    )
  );

  return new;
end;
$$;

drop trigger if exists autonomous_fleet_activity_stream on public.autonomous_goal_fleet_assignments;
create trigger autonomous_fleet_activity_stream
after insert or update of status on public.autonomous_goal_fleet_assignments
for each row execute function public.publish_autonomous_fleet_activity();

create or replace function public.schedule_autonomous_recovery()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  goal_row public.autonomous_goals%rowtype;
  retry_at timestamptz;
  attempt_no integer;
begin
  if new.status <> 'failed' or old.status = 'failed' then
    return new;
  end if;

  select * into goal_row
  from public.autonomous_goals
  where id = new.goal_id
  for update;

  if not found
     or goal_row.status <> 'active'
     or goal_row.autonomy_level <> 'autonomous'
     or not goal_row.allow_replanning
     or goal_row.trigger_type not in ('schedule', 'continuous', 'event')
     or goal_row.recovery_attempts >= 2 then
    return new;
  end if;

  attempt_no := goal_row.recovery_attempts + 1;
  retry_at := now() + make_interval(mins => case attempt_no when 1 then 2 else 5 end);

  update public.autonomous_goals
  set recovery_attempts = attempt_no,
      last_recovery_at = now(),
      last_recovery_error = left(coalesce(new.error, 'Autonomous specialist workflow failed.'), 1000),
      next_run_at = retry_at,
      scheduler_claimed_at = null,
      scheduler_lease_until = null,
      updated_at = now()
  where id = goal_row.id;

  insert into public.autonomous_goal_events (
    goal_id, run_id, user_id, event_type, severity, message, payload
  ) values (
    new.goal_id,
    new.id,
    new.user_id,
    'autonomous_recovery_scheduled',
    'warning',
    format('Self-healing retry %s of 2 scheduled after an autonomous run failed.', attempt_no),
    jsonb_build_object(
      'attempt', attempt_no,
      'retry_at', retry_at,
      'previous_error', left(coalesce(new.error, ''), 1000)
    )
  );

  return new;
end;
$$;

drop trigger if exists autonomous_goal_bounded_recovery on public.autonomous_goal_runs;
create trigger autonomous_goal_bounded_recovery
after update of status on public.autonomous_goal_runs
for each row execute function public.schedule_autonomous_recovery();

-- Successful completion clears the recovery budget for future independent failures.
create or replace function public.reset_autonomous_recovery_after_success()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    update public.autonomous_goals
    set recovery_attempts = 0,
        last_recovery_error = null,
        updated_at = now()
    where id = new.goal_id;
  end if;
  return new;
end;
$$;

drop trigger if exists autonomous_goal_recovery_reset on public.autonomous_goal_runs;
create trigger autonomous_goal_recovery_reset
after update of status on public.autonomous_goal_runs
for each row execute function public.reset_autonomous_recovery_after_success();

notify pgrst, 'reload schema';
