-- Single-claim execution ledger for approved reusable skill recipes.
-- Approval remains authoritative in approval_requests; this table only prevents
-- the same approved immutable recipe from being replayed more than once.

create table if not exists public.agent_skill_script_executions (
  id uuid primary key default gen_random_uuid(),
  approval_request_id uuid not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid null,
  agent_id uuid null,
  task_id uuid null,
  skill_id uuid not null references public.agent_skills(id) on delete restrict,
  script_name text not null,
  fingerprint text not null,
  status text not null default 'running',
  result jsonb null,
  error text null,
  started_at timestamptz not null default now(),
  completed_at timestamptz null,
  constraint agent_skill_script_execution_status check (status in ('running', 'succeeded', 'failed')),
  constraint agent_skill_script_execution_fingerprint check (fingerprint ~ '^[a-f0-9]{64}$'),
  constraint agent_skill_script_execution_script_name check (char_length(script_name) between 1 and 80)
);

create index if not exists agent_skill_script_executions_user_started_idx
  on public.agent_skill_script_executions(user_id, started_at desc);
create index if not exists agent_skill_script_executions_agent_started_idx
  on public.agent_skill_script_executions(agent_id, started_at desc)
  where agent_id is not null;

alter table public.agent_skill_script_executions enable row level security;

drop policy if exists "agent_skill_script_executions_select_own" on public.agent_skill_script_executions;
create policy "agent_skill_script_executions_select_own"
  on public.agent_skill_script_executions for select
  using (auth.uid() = user_id);

drop policy if exists "agent_skill_script_executions_insert_own" on public.agent_skill_script_executions;
create policy "agent_skill_script_executions_insert_own"
  on public.agent_skill_script_executions for insert
  with check (auth.uid() = user_id);

drop policy if exists "agent_skill_script_executions_update_own" on public.agent_skill_script_executions;
create policy "agent_skill_script_executions_update_own"
  on public.agent_skill_script_executions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.agent_skill_script_executions is
  'Owner-scoped single-claim ledger for immutable approved skill-script recipes. approval_requests remains the authoritative approval record.';
