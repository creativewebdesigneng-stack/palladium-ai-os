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