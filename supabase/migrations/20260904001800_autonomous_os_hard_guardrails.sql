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
