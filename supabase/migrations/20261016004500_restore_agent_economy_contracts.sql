-- Recover the existing Blackstar agent economy contract without enabling payments.
-- Authenticated clients may read their own ledger only; trusted server writes remain service-only.
do $$ begin
 if to_regclass('public.agent_economy_accounts') is not null
    or to_regclass('public.agent_economy_entries') is not null
 then raise exception 'Agent economy recovery requires both tables absent; review partial state';
 end if;
end $$;

-- Composite identity supports foreign keys that verify ownership, not merely existence.
create unique index if not exists personal_agents_user_id_id_economy_uq
  on public.personal_agents(user_id,id);

create table public.agent_economy_accounts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 org_id uuid,
 agent_id uuid not null,
 currency text not null default 'GBP' check (currency ~ '^[A-Z]{3}$'),
 status text not null default 'active' check (status in ('active','frozen','closed')),
 spend_limit_micros bigint check (spend_limit_micros is null or spend_limit_micros >= 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(agent_id,currency),
 unique(id,user_id,agent_id,currency),
 foreign key(user_id,agent_id) references public.personal_agents(user_id,id) on delete cascade
);

create table public.agent_economy_entries (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 org_id uuid,
 account_id uuid not null,
 agent_id uuid not null,
 counterparty_agent_id uuid,
 kind text not null check(kind in ('credit','debit','escrow','release','refund')),
 amount_micros bigint not null check(amount_micros > 0),
 currency text not null check(currency ~ '^[A-Z]{3}$'),
 reference text not null,
 correlation_id uuid,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 foreign key(account_id,user_id,agent_id,currency)
  references public.agent_economy_accounts(id,user_id,agent_id,currency) on delete restrict,
 foreign key(user_id,counterparty_agent_id)
  references public.personal_agents(user_id,id)
);

create index agent_economy_accounts_owner_idx on public.agent_economy_accounts(user_id,agent_id);
create index agent_economy_entries_account_created_idx on public.agent_economy_entries(account_id,created_at desc);
create index agent_economy_entries_correlation_idx on public.agent_economy_entries(correlation_id) where correlation_id is not null;
alter table public.agent_economy_accounts enable row level security;
alter table public.agent_economy_entries enable row level security;
revoke all on public.agent_economy_accounts from public,anon,authenticated;
revoke all on public.agent_economy_entries from public,anon,authenticated;
grant select on public.agent_economy_accounts to authenticated;
grant select on public.agent_economy_entries to authenticated;
create policy agent_economy_accounts_owner_select on public.agent_economy_accounts
 for select to authenticated using(user_id=(select auth.uid()));
create policy agent_economy_entries_owner_select on public.agent_economy_entries
 for select to authenticated using(user_id=(select auth.uid()));
comment on table public.agent_economy_accounts is 'Owner-scoped agent economy accounts; mutations service-only; not payment settlement.';
comment on table public.agent_economy_entries is 'Append-only micro-unit ledger; mutations service-only; not external settlement.';
