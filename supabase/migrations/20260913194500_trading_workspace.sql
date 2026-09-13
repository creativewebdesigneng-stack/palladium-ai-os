-- Blackstar Trading Hub: persistent owner-scoped watchlists, simulations and journal.
-- Research/simulation records only. These tables do not represent broker orders or verified fills.

create table if not exists public.trading_watchlists (
  id uuid constraint trading_watchlists_pkey primary key default gen_random_uuid(),
  user_id uuid not null constraint trading_watchlists_user_id_fkey references auth.users(id) on delete cascade,
  name text not null constraint trading_watchlists_name_check check (char_length(btrim(name)) between 1 and 80),
  description text constraint trading_watchlists_description_check check (description is null or char_length(description) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trading_watchlist_items (
  id uuid constraint trading_watchlist_items_pkey primary key default gen_random_uuid(),
  user_id uuid not null constraint trading_watchlist_items_user_id_fkey references auth.users(id) on delete cascade,
  watchlist_id uuid not null constraint trading_watchlist_items_watchlist_id_fkey references public.trading_watchlists(id) on delete cascade,
  symbol text not null constraint trading_watchlist_items_symbol_check check (char_length(btrim(symbol)) between 1 and 32),
  name text constraint trading_watchlist_items_name_check check (name is null or char_length(name) <= 120),
  market text constraint trading_watchlist_items_market_check check (market is null or char_length(market) <= 80),
  asset_type text constraint trading_watchlist_items_asset_type_check check (
    asset_type is null or asset_type in ('stock','etf','fund','bond','fx','future','option','commodity','crypto','index','other')
  ),
  notes text constraint trading_watchlist_items_notes_check check (notes is null or char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trading_journal_entries (
  id uuid constraint trading_journal_entries_pkey primary key default gen_random_uuid(),
  user_id uuid not null constraint trading_journal_entries_user_id_fkey references auth.users(id) on delete cascade,
  symbol text constraint trading_journal_entries_symbol_check check (symbol is null or char_length(btrim(symbol)) between 1 and 32),
  side text not null default 'neutral' constraint trading_journal_entries_side_check check (side in ('long','short','neutral')),
  status text not null default 'planned' constraint trading_journal_entries_status_check check (status in ('planned','open','closed','cancelled')),
  thesis text constraint trading_journal_entries_thesis_check check (thesis is null or char_length(thesis) <= 8000),
  plan text constraint trading_journal_entries_plan_check check (plan is null or char_length(plan) <= 8000),
  outcome text constraint trading_journal_entries_outcome_check check (outcome is null or char_length(outcome) <= 8000),
  lessons text constraint trading_journal_entries_lessons_check check (lessons is null or char_length(lessons) <= 8000),
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trading_simulations (
  id uuid constraint trading_simulations_pkey primary key default gen_random_uuid(),
  user_id uuid not null constraint trading_simulations_user_id_fkey references auth.users(id) on delete cascade,
  symbol text not null constraint trading_simulations_symbol_check check (char_length(btrim(symbol)) between 1 and 32),
  side text not null constraint trading_simulations_side_check check (side in ('long','short')),
  quantity numeric not null constraint trading_simulations_quantity_check check (quantity > 0),
  entry_price numeric not null constraint trading_simulations_entry_price_check check (entry_price > 0),
  exit_price numeric constraint trading_simulations_exit_price_check check (exit_price is null or exit_price > 0),
  status text not null default 'planned' constraint trading_simulations_status_check check (status in ('planned','open','closed','cancelled')),
  thesis text constraint trading_simulations_thesis_check check (thesis is null or char_length(thesis) <= 8000),
  notes text constraint trading_simulations_notes_check check (notes is null or char_length(notes) <= 8000),
  opened_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  currency text not null default 'GBP' constraint trading_simulations_currency_check check (char_length(currency) = 3)
);

create unique index if not exists trading_watchlists_user_name_uidx
  on public.trading_watchlists (user_id, lower(btrim(name)));
create index if not exists trading_watchlists_user_updated_idx
  on public.trading_watchlists (user_id, updated_at desc);

create unique index if not exists trading_watchlist_items_symbol_uidx
  on public.trading_watchlist_items (watchlist_id, upper(btrim(symbol)));
create index if not exists trading_watchlist_items_user_idx
  on public.trading_watchlist_items (user_id, updated_at desc);
create index if not exists trading_watchlist_items_watchlist_idx
  on public.trading_watchlist_items (watchlist_id, updated_at desc);

create index if not exists trading_journal_entries_user_symbol_idx
  on public.trading_journal_entries (user_id, symbol);
create index if not exists trading_journal_entries_user_updated_idx
  on public.trading_journal_entries (user_id, updated_at desc);

create index if not exists trading_simulations_user_symbol_idx
  on public.trading_simulations (user_id, symbol);
create index if not exists trading_simulations_user_updated_idx
  on public.trading_simulations (user_id, updated_at desc);

alter table public.trading_watchlists enable row level security;
alter table public.trading_watchlist_items enable row level security;
alter table public.trading_journal_entries enable row level security;
alter table public.trading_simulations enable row level security;

revoke all on public.trading_watchlists from anon;
revoke all on public.trading_watchlist_items from anon;
revoke all on public.trading_journal_entries from anon;
revoke all on public.trading_simulations from anon;

grant select, insert, update, delete on public.trading_watchlists to authenticated;
grant select, insert, update, delete on public.trading_watchlist_items to authenticated;
grant select, insert, update, delete on public.trading_journal_entries to authenticated;
grant select, insert, update, delete on public.trading_simulations to authenticated;

drop policy if exists "trading watchlists select own" on public.trading_watchlists;
create policy "trading watchlists select own" on public.trading_watchlists
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "trading watchlists insert own" on public.trading_watchlists;
create policy "trading watchlists insert own" on public.trading_watchlists
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "trading watchlists update own" on public.trading_watchlists;
create policy "trading watchlists update own" on public.trading_watchlists
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "trading watchlists delete own" on public.trading_watchlists;
create policy "trading watchlists delete own" on public.trading_watchlists
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "trading watchlist items select own" on public.trading_watchlist_items;
create policy "trading watchlist items select own" on public.trading_watchlist_items
  for select to authenticated using (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.trading_watchlists w
      where w.id = trading_watchlist_items.watchlist_id
        and w.user_id = (select auth.uid())
    )
  );
drop policy if exists "trading watchlist items insert own" on public.trading_watchlist_items;
create policy "trading watchlist items insert own" on public.trading_watchlist_items
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.trading_watchlists w
      where w.id = trading_watchlist_items.watchlist_id
        and w.user_id = (select auth.uid())
    )
  );
drop policy if exists "trading watchlist items update own" on public.trading_watchlist_items;
create policy "trading watchlist items update own" on public.trading_watchlist_items
  for update to authenticated using (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.trading_watchlists w
      where w.id = trading_watchlist_items.watchlist_id
        and w.user_id = (select auth.uid())
    )
  ) with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.trading_watchlists w
      where w.id = trading_watchlist_items.watchlist_id
        and w.user_id = (select auth.uid())
    )
  );
drop policy if exists "trading watchlist items delete own" on public.trading_watchlist_items;
create policy "trading watchlist items delete own" on public.trading_watchlist_items
  for delete to authenticated using (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.trading_watchlists w
      where w.id = trading_watchlist_items.watchlist_id
        and w.user_id = (select auth.uid())
    )
  );

drop policy if exists "trading journal select own" on public.trading_journal_entries;
create policy "trading journal select own" on public.trading_journal_entries
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "trading journal insert own" on public.trading_journal_entries;
create policy "trading journal insert own" on public.trading_journal_entries
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "trading journal update own" on public.trading_journal_entries;
create policy "trading journal update own" on public.trading_journal_entries
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "trading journal delete own" on public.trading_journal_entries;
create policy "trading journal delete own" on public.trading_journal_entries
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "trading simulations select own" on public.trading_simulations;
create policy "trading simulations select own" on public.trading_simulations
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "trading simulations insert own" on public.trading_simulations;
create policy "trading simulations insert own" on public.trading_simulations
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "trading simulations update own" on public.trading_simulations;
create policy "trading simulations update own" on public.trading_simulations
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "trading simulations delete own" on public.trading_simulations;
create policy "trading simulations delete own" on public.trading_simulations
  for delete to authenticated using ((select auth.uid()) = user_id);
