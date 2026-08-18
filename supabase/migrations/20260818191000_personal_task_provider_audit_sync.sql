-- Keep durable agent-task provider/model audit metadata aligned with the
-- provider that actually completed a personal task after model failover.

create or replace function public.sync_personal_task_agent_provider_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed'
     and jsonb_typeof(new.result) = 'object'
     and coalesce(new.result->>'agent_run_id', '') <> '' then
    update public.agent_tasks
       set provider = coalesce(nullif(new.result->>'provider', ''), provider),
           model = coalesce(nullif(new.result->>'model', ''), model)
     where id::text = new.result->>'agent_run_id'
       and user_id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_personal_task_agent_provider_audit on public.personal_tasks;
create trigger sync_personal_task_agent_provider_audit
after update of status, result on public.personal_tasks
for each row
when (new.status = 'completed')
execute function public.sync_personal_task_agent_provider_audit();
