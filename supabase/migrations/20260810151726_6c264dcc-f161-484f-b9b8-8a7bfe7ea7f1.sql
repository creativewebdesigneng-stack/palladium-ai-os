-- ============ WORKFORCE ENGINE ============

alter table public.workforces add column if not exists description text;

alter table public.workflows
  add column if not exists workforce_id uuid references public.workforces(id) on delete set null;

alter table public.workflow_steps
  add column if not exists mode text not null default 'sequential',
  add column if not exists depends_on uuid[] not null default '{}'::uuid[],
  add column if not exists condition jsonb not null default '{}'::jsonb,
  add column if not exists input_template text,
  add column if not exists max_retries integer not null default 1,
  add column if not exists retry_delay_ms integer not null default 500,
  add column if not exists timeout_ms integer not null default 120000,
  add column if not exists continue_on_error boolean not null default false;

alter table public.workflow_runs
  add column if not exists workforce_id uuid references public.workforces(id) on delete set null,
  add column if not exists input text,
  add column if not exists output text,
  add column if not exists trigger text not null default 'manual',
  add column if not exists attempt integer not null default 1,
  add column if not exists tokens_in integer not null default 0,
  add column if not exists tokens_out integer not null default 0,
  add column if not exists cost_pence integer not null default 0;

create or replace function public.workflow_run_is_visible(_run uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workflow_runs r
    where r.id = _run and (r.user_id = auth.uid() or public.is_org_member(r.org_id))
  )
$$;
revoke all on function public.workflow_run_is_visible(uuid) from anon;
grant execute on function public.workflow_run_is_visible(uuid) to authenticated;

-- one row per step attempt: the authoritative execution ledger
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
grant select on public.workflow_step_runs to authenticated;
grant all on public.workflow_step_runs to service_role;
alter table public.workflow_step_runs enable row level security;
create policy wsr_select on public.workflow_step_runs for select to authenticated
  using (user_id = auth.uid() or public.is_org_member(org_id));
create trigger workflow_step_runs_updated_at before update on public.workflow_step_runs
  for each row execute function public.set_updated_at();
create index if not exists workflow_step_runs_run_idx on public.workflow_step_runs(run_id, position, attempt);

-- the ONLY agent-to-agent channel: always scoped to one run
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
grant select on public.agent_messages to authenticated;
grant all on public.agent_messages to service_role;
alter table public.agent_messages enable row level security;
create policy am_select on public.agent_messages for select to authenticated
  using (user_id = auth.uid() or public.is_org_member(org_id));
create index if not exists agent_messages_run_idx on public.agent_messages(run_id, created_at);