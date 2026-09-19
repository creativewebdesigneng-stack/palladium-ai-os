-- Restore Blackstar's missing canonical workforce and durable workflow ledgers.
-- Preserve existing workflows and permissions; new service-only execution ledgers
-- do not become general-purpose authenticated write surfaces.

create table if not exists public.workforces (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  purpose text,
  description text,
  department text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.workforces enable row level security;
revoke all on public.workforces from public,anon,authenticated;
grant all on public.workforces to service_role;
grant select,insert,update,delete on public.workforces to authenticated;
create policy workforces_owner_select on public.workforces
  for select to authenticated using (user_id=auth.uid());
create policy workforces_owner_insert on public.workforces
  for insert to authenticated with check (
    user_id=auth.uid() and (org_id is null or private.is_org_member(org_id))
  );
create policy workforces_owner_update on public.workforces
  for update to authenticated using (user_id=auth.uid())
  with check (user_id=auth.uid() and (org_id is null or private.is_org_member(org_id)));
create policy workforces_owner_delete on public.workforces
  for delete to authenticated using (user_id=auth.uid());
create trigger workforces_updated_at before update on public.workforces
  for each row execute function public.set_updated_at();

create table if not exists public.workforce_agents (
  id uuid primary key default gen_random_uuid(),
  workforce_id uuid not null references public.workforces(id) on delete cascade,
  agent_id uuid not null references public.personal_agents(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique(workforce_id,agent_id)
);
alter table public.workforce_agents enable row level security;
revoke all on public.workforce_agents from public,anon,authenticated;
grant all on public.workforce_agents to service_role;
grant select,insert,update,delete on public.workforce_agents to authenticated;
create policy workforce_agents_owner_all on public.workforce_agents
  for all to authenticated
  using (exists(select 1 from public.workforces w where w.id=workforce_id and w.user_id=auth.uid()))
  with check (exists(select 1 from public.workforces w where w.id=workforce_id and w.user_id=auth.uid()));

alter table public.workflows
  add column if not exists workforce_id uuid references public.workforces(id) on delete set null,
  add column if not exists trigger_type text not null default 'manual',
  add column if not exists trigger_config jsonb not null default '{}'::jsonb,
  add column if not exists schedule text;

create policy wf_owner_insert on public.workflows
  for insert to authenticated with check (
    user_id=auth.uid() and (org_id is null or private.is_org_member(org_id))
  );
create policy wf_owner_update on public.workflows
  for update to authenticated using (user_id=auth.uid())
  with check (user_id=auth.uid() and (org_id is null or private.is_org_member(org_id)));
create policy wf_owner_delete on public.workflows
  for delete to authenticated using (user_id=auth.uid());

create table if not exists public.workflow_steps (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  position integer not null default 0,
  name text,
  kind text not null default 'agent'
    check (kind in ('agent','approval','delay','notification')),
  agent_id uuid references public.personal_agents(id) on delete set null,
  tool text,
  config jsonb not null default '{}'::jsonb,
  requires_approval boolean not null default false,
  mode text not null default 'sequential',
  depends_on uuid[] not null default '{}'::uuid[],
  condition jsonb not null default '{}'::jsonb,
  input_template text,
  max_retries integer not null default 1,
  retry_delay_ms integer not null default 500,
  timeout_ms integer not null default 120000,
  continue_on_error boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.workflow_steps enable row level security;
revoke all on public.workflow_steps from public,anon,authenticated;
grant all on public.workflow_steps to service_role;
grant select,insert,update,delete on public.workflow_steps to authenticated;
create policy workflow_steps_select on public.workflow_steps
  for select to authenticated
  using (exists(select 1 from public.workflows w where w.id=workflow_id
   and (w.user_id=auth.uid() or private.is_org_member(w.org_id))));
create policy workflow_steps_owner_write on public.workflow_steps
  for all to authenticated
  using (exists(select 1 from public.workflows w where w.id=workflow_id and w.user_id=auth.uid()))
  with check (exists(select 1 from public.workflows w where w.id=workflow_id and w.user_id=auth.uid()));
create trigger workflow_steps_updated_at before update on public.workflow_steps
  for each row execute function public.set_updated_at();

create table if not exists public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  workforce_id uuid references public.workforces(id) on delete set null,
  org_id uuid references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status public.exec_status not null default 'pending',
  step_results jsonb not null default '[]'::jsonb,
  input text,
  output text,
  trigger text not null default 'manual',
  attempt integer not null default 1,
  tokens_in integer not null default 0,
  tokens_out integer not null default 0,
  cost_pence integer not null default 0,
  error text,
  cancel_requested boolean not null default false,
  waiting_approval_request_id uuid,
  waiting_step_id uuid,
  queued_at timestamptz,
  claimed_at timestamptz,
  worker_claimed_at timestamptz,
  worker_heartbeat_at timestamptz,
  worker_attempts integer not null default 0,
  worker_error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists workflow_runs_queue_idx
 on public.workflow_runs(status,queued_at) where status='queued';
create index if not exists workflow_runs_running_heartbeat_idx
 on public.workflow_runs(worker_heartbeat_at) where status='running';
create index if not exists workflow_runs_waiting_approval_request_idx
 on public.workflow_runs(waiting_approval_request_id)
 where waiting_approval_request_id is not null;
alter table public.workflow_runs enable row level security;
revoke all on public.workflow_runs from public,anon,authenticated;
grant all on public.workflow_runs to service_role;
grant select,insert on public.workflow_runs to authenticated;
create policy workflow_runs_owner_select on public.workflow_runs
  for select to authenticated using (user_id=auth.uid());
create policy workflow_runs_owner_queue on public.workflow_runs
  for insert to authenticated with check (
    user_id=auth.uid() and status='queued' and cancel_requested=false
    and worker_attempts=0 and step_results='[]'::jsonb
    and waiting_approval_request_id is null and waiting_step_id is null
    and exists(
      select 1 from public.workflows w where w.id=workflow_id
        and w.user_id=auth.uid()
        and w.org_id is not distinct from workflow_runs.org_id
        and w.workforce_id is not distinct from workflow_runs.workforce_id
    )
  );
create trigger workflow_runs_updated_at before update on public.workflow_runs
  for each row execute function public.set_updated_at();

create table if not exists public.workflow_step_runs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.workflow_runs(id) on delete cascade,
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  step_id uuid references public.workflow_steps(id) on delete set null,
  agent_id uuid references public.personal_agents(id) on delete set null,
  task_id uuid references public.agent_tasks(id) on delete set null,
  org_id uuid references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  kind text not null default 'agent',
  position integer not null default 0,
  attempt integer not null default 1,
  status public.exec_status not null default 'queued',
  input text,
  output text,
  error text,
  tokens_in integer not null default 0,
  tokens_out integer not null default 0,
  duration_ms integer,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists workflow_step_runs_run_idx on public.workflow_step_runs(run_id,position,attempt);
alter table public.workflow_step_runs enable row level security;
revoke all on public.workflow_step_runs from public,anon,authenticated;
grant all on public.workflow_step_runs to service_role;
grant select on public.workflow_step_runs to authenticated;
create policy workflow_step_runs_owner_select on public.workflow_step_runs
  for select to authenticated using (user_id=auth.uid());
create trigger workflow_step_runs_updated_at before update on public.workflow_step_runs
  for each row execute function public.set_updated_at();

create table if not exists public.agent_messages (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.workflow_runs(id) on delete cascade,
  from_step_run_id uuid references public.workflow_step_runs(id) on delete set null,
  to_step_id uuid references public.workflow_steps(id) on delete set null,
  from_agent_id uuid references public.personal_agents(id) on delete set null,
  to_agent_id uuid references public.personal_agents(id) on delete set null,
  org_id uuid references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'handoff',
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists agent_messages_run_idx on public.agent_messages(run_id,created_at);
alter table public.agent_messages enable row level security;
revoke all on public.agent_messages from public,anon,authenticated;
grant all on public.agent_messages to service_role;
grant select on public.agent_messages to authenticated;
create policy agent_messages_owner_select on public.agent_messages
  for select to authenticated using (user_id=auth.uid());

notify pgrst,'reload schema';
