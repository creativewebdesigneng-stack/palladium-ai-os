-- Production reconciliation of the canonical seven-step agent builder/runtime.
-- Blackstar's production personal_agents table retained only the initial identity
-- columns. Add the existing runtime's missing configuration columns without
-- deleting agents, resetting policies, or granting any new execution authority.
alter table public.personal_agents
  add column if not exists description text,
  add column if not exists purpose text,
  add column if not exists personality text default 'professional',
  add column if not exists instructions text,
  add column if not exists system_prompt text,
  add column if not exists preferences jsonb not null default '{}'::jsonb,
  add column if not exists model text not null default 'gpt-5-mini',
  add column if not exists model_provider text not null default 'openai',
  add column if not exists temperature numeric not null default 0.4,
  add column if not exists max_tokens integer not null default 4096,
  add column if not exists memory_enabled boolean not null default true,
  add column if not exists allowed_tools text[] not null default '{}'::text[],
  add column if not exists allowed_providers text[] not null default '{}'::text[],
  add column if not exists requires_approval boolean not null default true,
  add column if not exists autonomy text not null default 'prepare',
  add column if not exists slug text,
  add column if not exists scope text not null default 'personal',
  add column if not exists icon text,
  add column if not exists visibility text not null default 'private',
  add column if not exists current_version integer not null default 1,
  add column if not exists spec_version integer not null default 1,
  add column if not exists operating_profile jsonb not null default '{}'::jsonb,
  add column if not exists last_run_at timestamptz;

-- The agent runtime uses this ledger for queue creation and task history.
alter table public.agent_tasks
  add column if not exists title text,
  add column if not exists output_text text,
  add column if not exists tool_calls integer not null default 0,
  add column if not exists cancel_requested boolean not null default false;

create index if not exists personal_agents_user_idx
  on public.personal_agents(user_id);
create index if not exists personal_agents_allowed_providers_gin
  on public.personal_agents using gin(allowed_providers);
create index if not exists personal_agents_operating_profile_gin
  on public.personal_agents using gin(operating_profile);

-- The pre-existing production table had SELECT-only RLS. Keep organisational
-- reads untouched; allow only owners to create, update and remove their agents.
alter table public.personal_agents enable row level security;
revoke all on public.personal_agents from public,anon;
grant select,insert,update,delete on public.personal_agents to authenticated;
grant all on public.personal_agents to service_role;

drop policy if exists personal_agents_owner_insert on public.personal_agents;
create policy personal_agents_owner_insert on public.personal_agents
  for insert to authenticated
  with check (
    user_id=(select auth.uid())
    and (org_id is null or private.is_org_member(org_id))
    and (org_id_fk is null or private.is_org_member(org_id_fk))
  );

drop policy if exists personal_agents_owner_update on public.personal_agents;
create policy personal_agents_owner_update on public.personal_agents
  for update to authenticated
  using (user_id=(select auth.uid()))
  with check (
    user_id=(select auth.uid())
    and (org_id is null or private.is_org_member(org_id))
    and (org_id_fk is null or private.is_org_member(org_id_fk))
  );

drop policy if exists personal_agents_owner_delete on public.personal_agents;
create policy personal_agents_owner_delete on public.personal_agents
  for delete to authenticated using (user_id=(select auth.uid()));

-- Task owners can queue their own work and update their own execution history.
-- This does not let them claim another user's agent or read another user's tasks.
alter table public.agent_tasks enable row level security;
revoke all on public.agent_tasks from public,anon;
grant select,insert,update on public.agent_tasks to authenticated;
grant all on public.agent_tasks to service_role;
drop policy if exists agent_tasks_owner_insert on public.agent_tasks;
create policy agent_tasks_owner_insert on public.agent_tasks
  for insert to authenticated
  with check (
    user_id=(select auth.uid())
    and (agent_id is null or exists (
      select 1 from public.personal_agents a
      where a.id=agent_id and a.user_id=(select auth.uid())
    ))
  );
drop policy if exists agent_tasks_owner_update on public.agent_tasks;
create policy agent_tasks_owner_update on public.agent_tasks
  for update to authenticated
  using (user_id=(select auth.uid()))
  with check (
    user_id=(select auth.uid())
    and (agent_id is null or exists (
      select 1 from public.personal_agents a
      where a.id=agent_id and a.user_id=(select auth.uid())
    ))
  );

notify pgrst,'reload schema';
