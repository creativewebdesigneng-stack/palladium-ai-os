-- Reconcile Blackstar's canonical human-approval foundation. The original
-- approval_requests table is missing in production even though the verified
-- decision/execution handlers are already deployed. This table records human
-- decisions; it never executes external actions by itself.
create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organisations(id) on delete set null,
  agent_id uuid references public.personal_agents(id) on delete set null,
  task_id uuid references public.personal_tasks(id) on delete set null,
  action_type text not null default 'other',
  title text not null,
  details jsonb not null default '{}'::jsonb,
  summary text,
  estimated_cost numeric(12,2),
  currency text not null default 'GBP',
  risk_level text not null default 'low'
    check(risk_level in ('low','medium','high','critical')),
  status text not null default 'pending'
    check(status in ('pending','approved','rejected','expired','cancelled')),
  expires_at timestamptz,
  decided_at timestamptz,
  decided_by uuid references auth.users(id) on delete set null,
  decision_note text,
  execution_status text
    check(execution_status is null or execution_status in ('executing','succeeded','failed')),
  executed_at timestamptz,
  execution_error text,
  execution_result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists approval_requests_user_idx
  on public.approval_requests(user_id,status);
create index if not exists approval_requests_execution_idx
  on public.approval_requests(user_id,execution_status)
  where execution_status is not null;
create index if not exists approval_requests_agent_idx
  on public.approval_requests(agent_id,created_at desc) where agent_id is not null;

-- Keep action details, provider selection and cost/risk metadata immutable after
-- creation. Allow the existing decision handlers to atomically claim a pending
-- human decision, and the external executor to finalize its own execution state.
create or replace function public.guard_approval_request_transition()
returns trigger language plpgsql security invoker
set search_path=public
as $$
begin
  if row(new.user_id,new.org_id,new.agent_id,new.task_id,new.action_type,
         new.title,new.details,new.summary,new.estimated_cost,new.currency,
         new.risk_level,new.expires_at,new.created_at)
     is distinct from
     row(old.user_id,old.org_id,old.agent_id,old.task_id,old.action_type,
         old.title,old.details,old.summary,old.estimated_cost,old.currency,
         old.risk_level,old.expires_at,old.created_at)
  then raise exception 'Approval payload is immutable after creation';
  end if;
  if old.status is distinct from new.status
    and not (old.status='pending' and new.status in ('approved','rejected','expired','cancelled'))
  then raise exception 'Approval decisions are terminal';
  end if;
  if old.execution_status is distinct from new.execution_status then
    if not (
      (old.execution_status is null and new.execution_status='executing')
      or (old.execution_status='executing' and new.execution_status in ('succeeded','failed'))
      or (old.execution_status='failed' and new.execution_status='executing')
    ) then raise exception 'Invalid approval execution transition';
    end if;
  end if;
  if new.execution_status is not null and new.status<>'approved' then
    raise exception 'Only approved requests may execute';
  end if;
  return new;
end
$$;

drop trigger if exists approval_requests_transition_guard on public.approval_requests;
create trigger approval_requests_transition_guard
 before update on public.approval_requests
 for each row execute function public.guard_approval_request_transition();
drop trigger if exists approval_requests_updated_at on public.approval_requests;
create trigger approval_requests_updated_at
 before update on public.approval_requests
 for each row execute function public.set_updated_at();

alter table public.approval_requests enable row level security;
revoke all on public.approval_requests from public,anon,authenticated;
grant select,insert on public.approval_requests to authenticated;
grant update(status,decided_at,decided_by,decision_note,execution_status,
             executed_at,execution_error,execution_result)
  on public.approval_requests to authenticated;
grant all on public.approval_requests to service_role;

drop policy if exists approval_requests_owner_select on public.approval_requests;
create policy approval_requests_owner_select on public.approval_requests
 for select to authenticated
 using(user_id=(select auth.uid()));

drop policy if exists approval_requests_owner_insert on public.approval_requests;
create policy approval_requests_owner_insert on public.approval_requests
 for insert to authenticated
 with check(
   user_id=(select auth.uid()) and status='pending' and execution_status is null
   and (org_id is null or private.is_org_member(org_id))
   and (agent_id is null or exists(
     select 1 from public.personal_agents a where a.id=agent_id and
       (a.user_id=(select auth.uid())
        or (org_id is not null and private.is_org_member(org_id)
          and coalesce(a.org_id_fk,a.org_id)=org_id))
   ))
   and (task_id is null or exists(
     select 1 from public.personal_tasks t where t.id=task_id and
       (t.user_id=(select auth.uid())
        or (org_id is not null and t.org_id=org_id and private.is_org_member(org_id)))
   ))
 );

drop policy if exists approval_requests_owner_update on public.approval_requests;
create policy approval_requests_owner_update on public.approval_requests
 for update to authenticated
 using(user_id=(select auth.uid()))
 with check(user_id=(select auth.uid()));

notify pgrst,'reload schema';
