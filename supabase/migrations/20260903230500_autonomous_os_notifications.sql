create or replace function public.notify_autonomous_goal_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  goal_name text;
  goal_org_id uuid;
  notification_title text;
  notification_severity text;
begin
  if new.event_type not in (
    'workflow_queued',
    'goal_run_waiting_for_approval',
    'goal_run_completed',
    'goal_run_failed',
    'scheduled_run_failed',
    'goal_cancel'
  ) then
    return new;
  end if;

  select g.name, g.org_id
    into goal_name, goal_org_id
    from public.autonomous_goals g
   where g.id = new.goal_id
     and g.user_id = new.user_id;

  if goal_name is null then
    return new;
  end if;

  notification_title := case new.event_type
    when 'workflow_queued' then 'Autonomous mission queued'
    when 'goal_run_waiting_for_approval' then 'Autonomous mission needs approval'
    when 'goal_run_completed' then 'Autonomous mission completed'
    when 'goal_run_failed' then 'Autonomous mission failed'
    when 'scheduled_run_failed' then 'Autonomous scheduler retrying'
    when 'goal_cancel' then 'Autonomous mission cancelled'
    else 'Autonomous OS update'
  end;

  notification_severity := case
    when new.severity = 'error' then 'critical'
    when new.severity in ('info','success','warning') then new.severity
    else 'info'
  end;

  insert into public.notifications (
    user_id,
    org_id,
    kind,
    title,
    body,
    link,
    metadata,
    severity
  ) values (
    new.user_id,
    goal_org_id,
    'autonomous_os',
    notification_title,
    left(goal_name || ': ' || new.message, 1000),
    '/autonomous-os',
    jsonb_build_object(
      'goal_id', new.goal_id,
      'autonomous_run_id', new.run_id,
      'event_id', new.id,
      'event_type', new.event_type
    ),
    notification_severity
  );

  return new;
end;
$$;

revoke all on function public.notify_autonomous_goal_event() from public;

drop trigger if exists autonomous_goal_event_notify on public.autonomous_goal_events;
create trigger autonomous_goal_event_notify
after insert on public.autonomous_goal_events
for each row execute function public.notify_autonomous_goal_event();

comment on function public.notify_autonomous_goal_event() is
  'Routes material Autonomous OS lifecycle events into Blackstar notifications and Mission Control without duplicating runtime execution state.';

notify pgrst, 'reload schema';