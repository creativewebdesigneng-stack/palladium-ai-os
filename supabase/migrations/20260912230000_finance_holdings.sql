-- Blackstar Finance Hub: user-owned portfolio holdings.
create table if not exists public.finance_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null check (char_length(symbol) between 1 and 32),
  name text,
  asset_type text not null default 'other' check (asset_type in ('stock','etf','fund','bond','cash','crypto','property','pension','other')),
  quantity numeric(24,8) not null default 0 check (quantity >= 0),
  cost_basis numeric(18,2) check (cost_basis is null or cost_basis >= 0),
  manual_value numeric(18,2) check (manual_value is null or manual_value >= 0),
  currency text not null default 'GBP' check (char_length(currency)=3),
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.finance_holdings enable row level security;
revoke all on public.finance_holdings from anon;
grant select, insert, update, delete on public.finance_holdings to authenticated;
drop policy if exists "finance_holdings_select_own" on public.finance_holdings;
create policy "finance_holdings_select_own" on public.finance_holdings for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "finance_holdings_insert_own" on public.finance_holdings;
create policy "finance_holdings_insert_own" on public.finance_holdings for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "finance_holdings_update_own" on public.finance_holdings;
create policy "finance_holdings_update_own" on public.finance_holdings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "finance_holdings_delete_own" on public.finance_holdings;
create policy "finance_holdings_delete_own" on public.finance_holdings for delete to authenticated using ((select auth.uid()) = user_id);
create index if not exists finance_holdings_user_id_idx on public.finance_holdings(user_id);
