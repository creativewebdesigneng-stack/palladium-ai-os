-- Recover existing governance/advisory contracts; no credits, policy grants or runtime authority are backfilled.
do $$ begin if to_regclass('public.agent_economy_accounts') is not null or to_regclass('public.agent_economy_entries') is not null or to_regclass('public.agent_simulation_runs') is not null or to_regclass('public.agent_collective_deliberations') is not null or to_regclass('public.agent_evolution_proposals') is not null or to_regclass('public.enterprise_autonomy_policies') is not null then raise exception 'Governance recovery requires all six tables absent; review partial state first.'; end if;end $$;

-- Contract: 20260904113000_blackstar_agent_economy.sql
create table public.agent_economy_accounts (
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

-- Contract: 20260904113000_blackstar_agent_economy.sql
create table public.agent_economy_entries (
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

-- Contract: 20260904123000_blackstar_simulation.sql
create table public.agent_simulation_runs (
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

-- Contract: 20260904124500_blackstar_collective_intelligence.sql
create table public.agent_collective_deliberations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid null,
  correlation_id uuid null,
  topic text not null check (char_length(topic) between 1 and 500),
  participant_agent_ids uuid[] not null,
  proposals jsonb not null,
  consensus jsonb not null,
  status text not null check (status in ('consensus','contested')),
  selected_answer_key text not null,
  confidence double precision not null check (confidence >= 0 and confidence <= 1),
  agreement_ratio double precision not null check (agreement_ratio >= 0 and agreement_ratio <= 1),
  created_at timestamptz not null default now()
);

-- Contract: 20260904133500_blackstar_evolution.sql
create table public.agent_evolution_proposals (
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

-- Contract: 20260904140500_blackstar_enterprise_autonomy.sql
create table public.enterprise_autonomy_policies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid not null references public.organisations(id) on delete cascade,
  max_concurrent_runs integer not null default 10 check (max_concurrent_runs between 1 and 1000),
  max_daily_spend_micros bigint not null default 0 check (max_daily_spend_micros >= 0),
  require_approval_for_external_writes boolean not null default true,
  require_approval_for_financial_actions boolean not null default true,
  allowed_providers text[] not null default '{}'::text[],
  allowed_capabilities text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id)
);
alter table public.agent_economy_accounts add constraint agent_economy_account_identity unique(id,user_id,agent_id,currency);
alter table public.agent_economy_entries add constraint agent_economy_entry_account_identity_fk foreign key(account_id,user_id,agent_id,currency) references public.agent_economy_accounts(id,user_id,agent_id,currency) on delete restrict;
create index agent_economy_accounts_recovery_0_idx on public.agent_economy_accounts(user_id,agent_id);
create index agent_economy_entries_recovery_0_idx on public.agent_economy_entries(account_id,created_at desc);
create index agent_economy_entries_recovery_1_idx on public.agent_economy_entries(user_id,agent_id,currency,created_at);
create index agent_simulation_runs_recovery_0_idx on public.agent_simulation_runs(user_id,created_at desc);
create index agent_simulation_runs_recovery_1_idx on public.agent_simulation_runs(agent_id,created_at desc);
create index agent_collective_deliberations_recovery_0_idx on public.agent_collective_deliberations(user_id,created_at desc);
create index agent_evolution_proposals_recovery_0_idx on public.agent_evolution_proposals(user_id,agent_id,created_at desc);
create index enterprise_autonomy_policies_recovery_0_idx on public.enterprise_autonomy_policies(user_id,org_id);
create index agent_economy_entries_correlation_idx on public.agent_economy_entries(correlation_id) where correlation_id is not null;
create index agent_simulation_runs_correlation_idx on public.agent_simulation_runs(correlation_id) where correlation_id is not null;
create index agent_collective_deliberations_correlation_idx on public.agent_collective_deliberations(correlation_id) where correlation_id is not null;
create index agent_evolution_proposals_correlation_idx on public.agent_evolution_proposals(correlation_id) where correlation_id is not null;

alter table public.agent_economy_accounts enable row level security;
revoke all on public.agent_economy_accounts from anon,authenticated;
grant select on public.agent_economy_accounts to authenticated;
grant all on public.agent_economy_accounts to service_role;
create policy agent_economy_accounts_recovery_select on public.agent_economy_accounts for select to authenticated using (user_id=(select auth.uid()));

alter table public.agent_economy_entries enable row level security;
revoke all on public.agent_economy_entries from anon,authenticated;
grant select on public.agent_economy_entries to authenticated;
grant all on public.agent_economy_entries to service_role;
create policy agent_economy_entries_recovery_select on public.agent_economy_entries for select to authenticated using (user_id=(select auth.uid()));

alter table public.agent_simulation_runs enable row level security;
revoke all on public.agent_simulation_runs from anon,authenticated;
grant select on public.agent_simulation_runs to authenticated;
grant all on public.agent_simulation_runs to service_role;
create policy agent_simulation_runs_recovery_select on public.agent_simulation_runs for select to authenticated using (user_id=(select auth.uid()));
grant insert on public.agent_simulation_runs to authenticated;
create policy agent_simulation_runs_recovery_insert on public.agent_simulation_runs for insert to authenticated with check (user_id=(select auth.uid()) and (org_id is null or private.is_org_member(org_id)) and (agent_id is null or exists(select 1 from public.personal_agents a where a.id=agent_id and a.user_id=(select auth.uid()) and coalesce(a.org_id_fk,a.org_id) is not distinct from agent_simulation_runs.org_id)));

alter table public.agent_collective_deliberations enable row level security;
revoke all on public.agent_collective_deliberations from anon,authenticated;
grant select on public.agent_collective_deliberations to authenticated;
grant all on public.agent_collective_deliberations to service_role;
create policy agent_collective_deliberations_recovery_select on public.agent_collective_deliberations for select to authenticated using (user_id=(select auth.uid()));
grant insert on public.agent_collective_deliberations to authenticated;
create policy agent_collective_deliberations_recovery_insert on public.agent_collective_deliberations for insert to authenticated with check (user_id=(select auth.uid()) and (org_id is null or private.is_org_member(org_id)) and cardinality(participant_agent_ids) between 2 and 20 and (select count(distinct pid) from unnest(participant_agent_ids) pid)=cardinality(participant_agent_ids) and not exists(select 1 from unnest(participant_agent_ids) pid where not exists(select 1 from public.personal_agents a where a.id=pid and a.user_id=(select auth.uid()) and coalesce(a.org_id_fk,a.org_id) is not distinct from agent_collective_deliberations.org_id)));

alter table public.agent_evolution_proposals enable row level security;
revoke all on public.agent_evolution_proposals from anon,authenticated;
grant select on public.agent_evolution_proposals to authenticated;
grant all on public.agent_evolution_proposals to service_role;
create policy agent_evolution_proposals_recovery_select on public.agent_evolution_proposals for select to authenticated using (user_id=(select auth.uid()));
grant insert on public.agent_evolution_proposals to authenticated;
create policy agent_evolution_proposals_recovery_insert on public.agent_evolution_proposals for insert to authenticated with check (user_id=(select auth.uid()) and (org_id is null or private.is_org_member(org_id)) and exists(select 1 from public.personal_agents a where a.id=agent_id and a.user_id=(select auth.uid()) and coalesce(a.org_id_fk,a.org_id) is not distinct from agent_evolution_proposals.org_id) and requires_approval=true and applied=false);

alter table public.enterprise_autonomy_policies enable row level security;
revoke all on public.enterprise_autonomy_policies from anon,authenticated;
grant select on public.enterprise_autonomy_policies to authenticated;
grant all on public.enterprise_autonomy_policies to service_role;
grant insert,update on public.enterprise_autonomy_policies to authenticated;
create policy enterprise_autonomy_policies_recovery_select on public.enterprise_autonomy_policies for select to authenticated using (private.is_org_member(org_id));
create policy enterprise_autonomy_policies_recovery_insert on public.enterprise_autonomy_policies for insert to authenticated with check (user_id=(select auth.uid()) and private.is_org_admin(org_id));
create policy enterprise_autonomy_policies_recovery_update on public.enterprise_autonomy_policies for update to authenticated using (private.is_org_admin(org_id)) with check (user_id=(select auth.uid()) and private.is_org_admin(org_id));
