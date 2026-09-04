-- Blackstar Agent Economy: owner-scoped, auditable micro-unit ledger.
-- Money movement is recorded here; external settlement remains with the canonical billing/payment system.

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
  account_id uuid not null references public.agent_economy_accounts(id) on delete restrict,
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

create index if not exists agent_economy_accounts_owner_idx on public.agent_economy_accounts(user_id, agent_id);
create index if not exists agent_economy_entries_account_created_idx on public.agent_economy_entries(account_id, created_at desc);
create index if not exists agent_economy_entries_correlation_idx on public.agent_economy_entries(correlation_id) where correlation_id is not null;

alter table public.agent_economy_accounts enable row level security;
alter table public.agent_economy_entries enable row level security;

revoke all on public.agent_economy_accounts from anon;
revoke all on public.agent_economy_entries from anon;
grant select, insert, update on public.agent_economy_accounts to authenticated;
grant select, insert on public.agent_economy_entries to authenticated;

create policy "agent economy accounts owner select" on public.agent_economy_accounts for select to authenticated using (user_id = auth.uid());
create policy "agent economy accounts owner insert" on public.agent_economy_accounts for insert to authenticated with check (user_id = auth.uid());
create policy "agent economy accounts owner update" on public.agent_economy_accounts for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "agent economy entries owner select" on public.agent_economy_entries for select to authenticated using (user_id = auth.uid());
create policy "agent economy entries owner insert" on public.agent_economy_entries for insert to authenticated with check (user_id = auth.uid());

comment on table public.agent_economy_entries is 'Append-only Blackstar agent economy ledger. External payment settlement remains in canonical billing/payment infrastructure.';
