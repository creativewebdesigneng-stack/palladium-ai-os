-- Reconcile Blackstar's original Autonomous OS safety/event contracts.
-- The production database had goals and workflow ledgers but no Mission
-- Control activity ledger or autonomous cancellation/guardrail triggers.
-- Do not activate the separate workflow runner as part of this migration.

create table if not exists public.agent_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_id uuid references public.personal_agents(id) on delete set null,
  task_id uuid references public.personal_tasks(id) on delete cascade,
  org_id uuid references public.organisations(id) on delete cascade,
  kind text not null default 'info',
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists agent_activities_user_idx
  on public.agent_activities(user_id,created_at desc);
alter table public.agent_activities enable row level security;
revoke all on public.agent_activities from public,anon,authenticated;
grant all on public.agent_activities to service_role;
grant select,insert on public.agent_activities to authenticated;
drop policy if exists agent_activities_owner_select on public.agent_activities;
drop policy if exists agent_activities_owner_insert on public.agent_activities;
create policy agent_activities_owner_select on public.agent_activities
  for select to authenticated using (user_id=(select auth.uid()));
create policy agent_activities_owner_insert on public.agent_activities
  for insert to authenticated with check (user_id=(select auth.uid()));

alter function public.touch_autonomous_os_updated_at() set search_path = public;

-- Original: supabase/migrations/20260903225500_autonomous_os_cancel_propagation.sql
create or replace function public.propagate_autonomous_run_cancellation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'cancelled'
     and old.status is distinct from 'cancelled'
     and new.workflow_run_id is not null then
    update public.workflow_runs
       set cancel_requested = true
     where id = new.workflow_run_id
       and user_id = new.user_id
       and status in ('pending','queued','running','waiting_for_approval');
  end if;
  return new;
end;
$$;

revoke all on function public.propagate_autonomous_run_cancellation() from public;

drop trigger if exists autonomous_goal_run_cancel_workflow on public.autonomous_goal_runs;
create trigger autonomous_goal_run_cancel_workflow
after update of status on public.autonomous_goal_runs
for each row
when (new.status = 'cancelled' and old.status is distinct from 'cancelled')
execute function public.propagate_autonomous_run_cancellation();

comment on function public.propagate_autonomous_run_cancellation() is
  'Propagates an owner-scoped Autonomous OS cancellation into the linked durable workflow run without granting the client direct workflow-worker privileges.';

notify pgrst, 'reload schema';

-- Original: supabase/migrations/20260903230500_autonomous_os_notifications.sql
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

-- Original: supabase/migrations/20260904000500_autonomous_os_notification_events.sql
alter table public.autonomous_goals
  add column if not exists event_source text,
  add column if not exists event_match text,
  add column if not exists pending_event_context jsonb not null default '{}'::jsonb;

update public.autonomous_goals
set event_source = 'notification'
where trigger_type = 'event' and event_source is null;

create or replace function public.trigger_autonomous_goals_from_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.kind, '') = 'autonomous_os' then
    return new;
  end if;

  update public.autonomous_goals g
  set
    next_run_at = now(),
    pending_event_context = jsonb_build_object(
      'source', 'notification',
      'notification_id', new.id,
      'kind', new.kind,
      'severity', new.severity,
      'title', new.title,
      'body', new.body,
      'created_at', new.created_at
    ),
    updated_at = now()
  where g.user_id = new.user_id
    and g.status = 'active'
    and g.trigger_type = 'event'
    and coalesce(g.event_source, 'notification') = 'notification'
    and nullif(trim(g.event_match), '') is not null
    and (
      coalesce(new.title, '') ilike '%' || g.event_match || '%'
      or coalesce(new.body, '') ilike '%' || g.event_match || '%'
      or coalesce(new.kind, '') ilike '%' || g.event_match || '%'
    );

  return new;
end;
$$;

drop trigger if exists autonomous_goal_notification_event on public.notifications;
create trigger autonomous_goal_notification_event
after insert on public.notifications
for each row execute function public.trigger_autonomous_goals_from_notification();


-- Original: supabase/migrations/20260904001800_autonomous_os_hard_guardrails.sql
create or replace function public.enforce_autonomous_goal_guardrails()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  breach record;
  cancelled_count integer := 0;
begin
  for breach in
    select
      agr.id as autonomous_run_id,
      agr.goal_id,
      agr.user_id,
      agr.workflow_run_id,
      agr.started_at,
      g.max_runtime_seconds,
      g.budget_pence,
      coalesce(sum(at.cost_pence), 0)::numeric as spent_pence,
      case
        when g.max_runtime_seconds is not null
          and agr.started_at is not null
          and agr.started_at + make_interval(secs => g.max_runtime_seconds) <= now()
          then 'runtime'
        when g.budget_pence is not null
          and coalesce(sum(at.cost_pence), 0) >= g.budget_pence
          then 'budget'
        else null
      end as breach_reason
    from public.autonomous_goal_runs agr
    join public.autonomous_goals g on g.id = agr.goal_id and g.user_id = agr.user_id
    join public.workflow_runs wr on wr.id = agr.workflow_run_id and wr.user_id = agr.user_id
    left join public.workflow_step_runs wsr on wsr.run_id = wr.id
    left join public.agent_tasks at on at.id = wsr.task_id and at.user_id = agr.user_id
    where agr.status in ('queued','planning','running','waiting_for_approval')
      and wr.status in ('pending','queued','running','waiting_for_approval')
      and coalesce(wr.cancel_requested, false) = false
    group by agr.id, agr.goal_id, agr.user_id, agr.workflow_run_id, agr.started_at,
      g.max_runtime_seconds, g.budget_pence
    having
      (g.max_runtime_seconds is not null and agr.started_at is not null
        and agr.started_at + make_interval(secs => g.max_runtime_seconds) <= now())
      or
      (g.budget_pence is not null and coalesce(sum(at.cost_pence), 0) >= g.budget_pence)
  loop
    update public.workflow_runs
    set
      cancel_requested = true,
      worker_error = case
        when breach.breach_reason = 'budget' then 'Autonomous OS budget ceiling reached.'
        else 'Autonomous OS runtime ceiling reached.'
      end,
      updated_at = now()
    where id = breach.workflow_run_id
      and user_id = breach.user_id
      and coalesce(cancel_requested, false) = false;

    if found then
      insert into public.autonomous_goal_events (
        goal_id, run_id, user_id, event_type, severity, message, payload
      ) values (
        breach.goal_id,
        breach.autonomous_run_id,
        breach.user_id,
        'guardrail_cancel_requested',
        'warning',
        case
          when breach.breach_reason = 'budget' then 'Autonomous run reached its configured spend ceiling; cancellation was requested.'
          else 'Autonomous run reached its configured runtime ceiling; cancellation was requested.'
        end,
        jsonb_build_object(
          'reason', breach.breach_reason,
          'workflow_run_id', breach.workflow_run_id,
          'spent_pence', breach.spent_pence,
          'budget_pence', breach.budget_pence,
          'max_runtime_seconds', breach.max_runtime_seconds
        )
      );
      cancelled_count := cancelled_count + 1;
    end if;
  end loop;

  return cancelled_count;
end;
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'autonomous-goal-guardrails') then
      perform cron.unschedule((select jobid from cron.job where jobname = 'autonomous-goal-guardrails' limit 1));
    end if;
    perform cron.schedule(
      'autonomous-goal-guardrails',
      '* * * * *',
      'select public.enforce_autonomous_goal_guardrails();'
    );
  end if;
end;
$$;


-- Original: supabase/migrations/20260904003000_autonomous_os_fleet_step_state.sql
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


-- Original: supabase/migrations/20260904003000_autonomous_os_mission_feed_recovery.sql
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

-- Trigger functions are driven by their table events, not by client RPC calls.
revoke execute on function public.propagate_autonomous_run_cancellation() from public,anon,authenticated;
revoke execute on function public.notify_autonomous_goal_event() from public,anon,authenticated;
revoke execute on function public.trigger_autonomous_goals_from_notification() from public,anon,authenticated;
revoke execute on function public.enforce_autonomous_goal_guardrails() from public,anon,authenticated;
grant execute on function public.enforce_autonomous_goal_guardrails() to service_role;
revoke execute on function public.sync_autonomous_fleet_step_state() from public,anon,authenticated;
revoke execute on function public.publish_autonomous_fleet_activity() from public,anon,authenticated;
revoke execute on function public.schedule_autonomous_recovery() from public,anon,authenticated;
revoke execute on function public.reset_autonomous_recovery_after_success() from public,anon,authenticated;
notify pgrst,'reload schema';
