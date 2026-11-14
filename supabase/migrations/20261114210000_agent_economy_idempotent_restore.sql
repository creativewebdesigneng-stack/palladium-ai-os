-- Idempotent, additive restore for issue #966.
-- Creates agent economy, simulation and evolution only when they are absent,
-- and tightens privileges and ownership checks when an earlier migration
-- already created them. No backfill, no provider execution, no settlement,
-- and evolution cannot be stored as applied.
--
-- The October 2026 recovery (20261016101516) refuses to run unless six
-- governance tables are all absent, and production history never recorded
-- 20260904113000. This migration is the one to apply when those tables are
-- missing or only partly present. It does not drop data or rewrite history.

do $$
begin
  if to_regclass('public.personal_agents') is null then
    raise exception 'personal_agents must exist before the agent economy restore';
  end if;
  if to_regprocedure('private.is_org_member(uuid)') is null then
    raise exception 'private.is_org_member(uuid) must exist before the agent economy restore';
  end if;
end $$;

do $$
declare
  missing text;
  expected text;
  relation text;
begin
  foreach relation in array array[
    'agent_economy_accounts',
    'agent_economy_entries',
    'agent_simulation_runs',
    'agent_evolution_proposals'
  ]
  loop
    if to_regclass('public.' || relation) is null then
      continue;
    end if;
    expected := case relation
      when 'agent_economy_accounts' then 'id,user_id,org_id,agent_id,currency,status,spend_limit_micros,created_at,updated_at'
      when 'agent_economy_entries' then 'id,user_id,org_id,account_id,agent_id,counterparty_agent_id,kind,amount_micros,currency,reference,correlation_id,metadata,created_at'
      when 'agent_simulation_runs' then 'id,user_id,org_id,agent_id,correlation_id,scenario,result,status,projected_cost_micros,risk_score,created_at'
      else 'id,user_id,org_id,agent_id,correlation_id,change_type,change_summary,baseline_metrics,candidate_metrics,evidence_refs,decision_status,decision_score,decision_reasons,requires_approval,applied,created_at'
    end;
    select string_agg(required.name, ', ' order by required.name)
      into missing
    from unnest(string_to_array(expected, ',')) as required(name)
    where not exists (
      select 1
      from information_schema.columns as column_info
      where column_info.table_schema = 'public'
        and column_info.table_name = relation
        and column_info.column_name = required.name
    );
    if missing is not null then
      raise exception '% is present but missing columns: %', relation, missing;
    end if;
  end loop;
end $$;

create table if not exists public.agent_economy_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid null,
  agent_id uuid not null,
  currency text not null default 'GBP' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'active' check (status in ('active','frozen','closed')),
  spend_limit_micros bigint null check (spend_limit_micros is null or spend_limit_micros >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agent_id, currency)
);

create table if not exists public.agent_economy_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid null,
  account_id uuid not null,
  agent_id uuid not null,
  counterparty_agent_id uuid null,
  kind text not null check (kind in ('credit','debit','escrow','release','refund')),
  amount_micros bigint not null check (amount_micros > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  reference text not null,
  correlation_id uuid null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_simulation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid null,
  agent_id uuid null,
  correlation_id uuid null,
  scenario jsonb not null,
  result jsonb not null,
  status text not null check (status in ('pass','needs_approval','blocked')),
  projected_cost_micros bigint not null check (projected_cost_micros >= 0),
  risk_score integer not null check (risk_score >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.agent_evolution_proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid null,
  agent_id uuid not null,
  correlation_id uuid null,
  change_type text not null check (change_type in ('prompt','routing','skill_policy','memory_policy','workflow_policy')),
  change_summary text not null check (char_length(change_summary) between 1 and 1000),
  baseline_metrics jsonb not null,
  candidate_metrics jsonb not null,
  evidence_refs jsonb not null default '[]'::jsonb,
  decision_status text not null check (decision_status in ('promote','review','reject')),
  decision_score double precision not null,
  decision_reasons jsonb not null default '[]'::jsonb,
  requires_approval boolean not null default true check (requires_approval = true),
  applied boolean not null default false check (applied = false),
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.agent_economy_accounts'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) ilike '%(agent_id, currency)%'
  ) then
    alter table public.agent_economy_accounts
      add constraint agent_economy_accounts_agent_currency_key unique (agent_id, currency);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'agent_economy_account_identity'
      and conrelid = 'public.agent_economy_accounts'::regclass
  ) then
    alter table public.agent_economy_accounts
      add constraint agent_economy_account_identity unique (id, user_id, agent_id, currency);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'agent_economy_entry_account_identity_fk'
      and conrelid = 'public.agent_economy_entries'::regclass
  ) then
    alter table public.agent_economy_entries
      add constraint agent_economy_entry_account_identity_fk
      foreign key (account_id, user_id, agent_id, currency)
      references public.agent_economy_accounts (id, user_id, agent_id, currency)
      on delete restrict;
  end if;
end $$;

create index if not exists agent_economy_accounts_owner_idx
  on public.agent_economy_accounts (user_id, agent_id);
create index if not exists agent_economy_entries_account_created_idx
  on public.agent_economy_entries (account_id, created_at desc);
create index if not exists agent_economy_entries_owner_agent_idx
  on public.agent_economy_entries (user_id, agent_id, currency, created_at);
create index if not exists agent_economy_entries_account_identity_idx
  on public.agent_economy_entries (account_id, user_id, agent_id, currency);
create index if not exists agent_economy_entries_correlation_idx
  on public.agent_economy_entries (correlation_id) where correlation_id is not null;
create index if not exists agent_simulation_runs_owner_created_idx
  on public.agent_simulation_runs (user_id, created_at desc);
create index if not exists agent_simulation_runs_agent_created_idx
  on public.agent_simulation_runs (agent_id, created_at desc) where agent_id is not null;
create index if not exists agent_simulation_runs_correlation_idx
  on public.agent_simulation_runs (correlation_id) where correlation_id is not null;
create index if not exists agent_evolution_owner_agent_created_idx
  on public.agent_evolution_proposals (user_id, agent_id, created_at desc);
create index if not exists agent_evolution_correlation_idx
  on public.agent_evolution_proposals (correlation_id) where correlation_id is not null;

create or replace function private.enforce_agent_economy_account_owner()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.user_id is not distinct from old.user_id
      and new.agent_id is not distinct from old.agent_id
      and new.org_id is not distinct from old.org_id then
      return new;
    end if;
  end if;
  if not exists (
    select 1
    from public.personal_agents as agent
    where agent.id = new.agent_id
      and agent.user_id = new.user_id
      and coalesce(agent.org_id_fk, agent.org_id) is not distinct from new.org_id
  ) then
    raise exception 'Economy account must match an existing owned agent and organisation';
  end if;
  return new;
end $$;

create or replace function private.enforce_agent_economy_entry_scope()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.agent_economy_accounts as account
    where account.id = new.account_id
      and account.org_id is not distinct from new.org_id
  ) then
    raise exception 'Economy entry organisation must match its account';
  end if;
  return new;
end $$;

revoke all on function private.enforce_agent_economy_account_owner() from public, anon, authenticated;
revoke all on function private.enforce_agent_economy_entry_scope() from public, anon, authenticated;
grant execute on function private.enforce_agent_economy_account_owner() to service_role;
grant execute on function private.enforce_agent_economy_entry_scope() to service_role;
grant usage on schema private to service_role;

drop trigger if exists agent_economy_account_owner_identity on public.agent_economy_accounts;
create trigger agent_economy_account_owner_identity
  before insert or update on public.agent_economy_accounts
  for each row execute function private.enforce_agent_economy_account_owner();

drop trigger if exists agent_economy_entry_scope on public.agent_economy_entries;
create trigger agent_economy_entry_scope
  before insert or update on public.agent_economy_entries
  for each row execute function private.enforce_agent_economy_entry_scope();

alter table public.agent_economy_accounts enable row level security;
alter table public.agent_economy_entries enable row level security;
alter table public.agent_simulation_runs enable row level security;
alter table public.agent_evolution_proposals enable row level security;

revoke all on public.agent_economy_accounts from anon, authenticated;
revoke all on public.agent_economy_entries from anon, authenticated;
revoke all on public.agent_simulation_runs from anon, authenticated;
revoke all on public.agent_evolution_proposals from anon, authenticated;
grant select on public.agent_economy_accounts to authenticated;
grant select on public.agent_economy_entries to authenticated;
grant select, insert on public.agent_simulation_runs to authenticated;
grant select, insert on public.agent_evolution_proposals to authenticated;
grant all on public.agent_economy_accounts to service_role;
grant all on public.agent_economy_entries to service_role;
grant all on public.agent_simulation_runs to service_role;
grant all on public.agent_evolution_proposals to service_role;

drop policy if exists "agent economy accounts owner select" on public.agent_economy_accounts;
drop policy if exists agent_economy_accounts_recovery_select on public.agent_economy_accounts;
drop policy if exists agent_economy_accounts_owner_select on public.agent_economy_accounts;
create policy agent_economy_accounts_owner_select
  on public.agent_economy_accounts
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "agent economy entries owner select" on public.agent_economy_entries;
drop policy if exists agent_economy_entries_recovery_select on public.agent_economy_entries;
drop policy if exists agent_economy_entries_owner_select on public.agent_economy_entries;
create policy agent_economy_entries_owner_select
  on public.agent_economy_entries
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "agent simulation owner select" on public.agent_simulation_runs;
drop policy if exists "agent simulation owner insert" on public.agent_simulation_runs;
drop policy if exists agent_simulation_runs_recovery_select on public.agent_simulation_runs;
drop policy if exists agent_simulation_runs_recovery_insert on public.agent_simulation_runs;
drop policy if exists agent_simulation_runs_owner_select on public.agent_simulation_runs;
drop policy if exists agent_simulation_runs_owner_insert on public.agent_simulation_runs;
create policy agent_simulation_runs_owner_select
  on public.agent_simulation_runs
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy agent_simulation_runs_owner_insert
  on public.agent_simulation_runs
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (org_id is null or private.is_org_member(org_id))
    and (
      agent_id is null
      or exists (
        select 1
        from public.personal_agents as agent
        where agent.id = agent_id
          and agent.user_id = (select auth.uid())
          and coalesce(agent.org_id_fk, agent.org_id) is not distinct from agent_simulation_runs.org_id
      )
    )
  );

drop policy if exists "agent evolution owner select" on public.agent_evolution_proposals;
drop policy if exists "agent evolution owner insert" on public.agent_evolution_proposals;
drop policy if exists agent_evolution_proposals_recovery_select on public.agent_evolution_proposals;
drop policy if exists agent_evolution_proposals_recovery_insert on public.agent_evolution_proposals;
drop policy if exists agent_evolution_proposals_owner_select on public.agent_evolution_proposals;
drop policy if exists agent_evolution_proposals_owner_insert on public.agent_evolution_proposals;
create policy agent_evolution_proposals_owner_select
  on public.agent_evolution_proposals
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy agent_evolution_proposals_owner_insert
  on public.agent_evolution_proposals
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (org_id is null or private.is_org_member(org_id))
    and exists (
      select 1
      from public.personal_agents as agent
      where agent.id = agent_id
        and agent.user_id = (select auth.uid())
        and coalesce(agent.org_id_fk, agent.org_id) is not distinct from agent_evolution_proposals.org_id
    )
    and requires_approval = true
    and applied = false
  );

comment on table public.agent_economy_accounts is
  'Owner-scoped agent economy accounts. Authenticated sessions may read their own rows. Mutation is service-role only and must match an owned agent.';
comment on table public.agent_economy_entries is
  'Append-only agent economy ledger for authenticated readers. Writes are service-role only and must match the account owner, agent, currency and organisation. This is not external settlement.';
comment on table public.agent_simulation_runs is
  'Append-only planning simulations. Informational only; never authorization, billing, or proof of execution.';
comment on table public.agent_evolution_proposals is
  'Advisory evolution proposals. requires_approval stays true and applied stays false; proposals never change runtime configuration.';
