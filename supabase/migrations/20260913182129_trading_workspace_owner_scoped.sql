create table if not exists public.trading_watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  description text check (description is null or char_length(description) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists trading_watchlists_user_name_uidx
  on public.trading_watchlists (user_id, lower(btrim(name)));
create index if not exists trading_watchlists_user_updated_idx
  on public.trading_watchlists (user_id, updated_at desc);

create table if not exists public.trading_watchlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  watchlist_id uuid not null references public.trading_watchlists(id) on delete cascade,
  symbol text not null check (char_length(btrim(symbol)) between 1 and 32),
  name text check (name is null or char_length(name) <= 120),
  market text check (market is null or char_length(market) <= 80),
  asset_type text check (asset_type is null or asset_type in ('stock','etf','fund','bond','fx','future','option','commodity','crypto','index','other')),
  notes text check (notes is null or char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists trading_watchlist_items_symbol_uidx
  on public.trading_watchlist_items (watchlist_id, upper(btrim(symbol)));
create index if not exists trading_watchlist_items_user_idx
  on public.trading_watchlist_items (user_id, updated_at desc);
create index if not exists trading_watchlist_items_watchlist_idx
  on public.trading_watchlist_items (watchlist_id, updated_at desc);

create table if not exists public.trading_journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text check (symbol is null or char_length(btrim(symbol)) between 1 and 32),
  side text not null default 'neutral' check (side in ('long','short','neutral')),
  status text not null default 'planned' check (status in ('planned','open','closed','cancelled')),
  thesis text check (thesis is null or char_length(thesis) <= 8000),
  plan text check (plan is null or char_length(plan) <= 8000),
  outcome text check (outcome is null or char_length(outcome) <= 8000),
  lessons text check (lessons is null or char_length(lessons) <= 8000),
  tags text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trading_journal_entries_user_updated_idx
  on public.trading_journal_entries (user_id, updated_at desc);
create index if not exists trading_journal_entries_user_symbol_idx
  on public.trading_journal_entries (user_id, symbol);

create table if not exists public.trading_simulations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null check (char_length(btrim(symbol)) between 1 and 32),
  side text not null check (side in ('long','short')),
  quantity numeric not null check (quantity > 0),
  entry_price numeric not null check (entry_price > 0),
  exit_price numeric check (exit_price is null or exit_price > 0),
  status text not null default 'planned' check (status in ('planned','open','closed','cancelled')),
  thesis text check (thesis is null or char_length(thesis) <= 8000),
  notes text check (notes is null or char_length(notes) <= 8000),
  opened_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trading_simulations_user_updated_idx
  on public.trading_simulations (user_id, updated_at desc);
create index if not exists trading_simulations_user_symbol_idx
  on public.trading_simulations (user_id, symbol);

alter table public.trading_watchlists enable row level security;
alter table public.trading_watchlist_items enable row level security;
alter table public.trading_journal_entries enable row level security;
alter table public.trading_simulations enable row level security;

revoke all on table public.trading_watchlists from anon, authenticated;
revoke all on table public.trading_watchlist_items from anon, authenticated;
revoke all on table public.trading_journal_entries from anon, authenticated;
revoke all on table public.trading_simulations from anon, authenticated;

grant select, insert, update, delete on table public.trading_watchlists to authenticated;
grant select, insert, update, delete on table public.trading_watchlist_items to authenticated;
grant select, insert, update, delete on table public.trading_journal_entries to authenticated;
grant select, insert, update, delete on table public.trading_simulations to authenticated;

create policy "trading watchlists select own" on public.trading_watchlists
  for select to authenticated using (auth.uid() = user_id);
create policy "trading watchlists insert own" on public.trading_watchlists
  for insert to authenticated with check (auth.uid() = user_id);
create policy "trading watchlists update own" on public.trading_watchlists
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "trading watchlists delete own" on public.trading_watchlists
  for delete to authenticated using (auth.uid() = user_id);

create policy "trading watchlist items select own" on public.trading_watchlist_items
  for select to authenticated using (
    auth.uid() = user_id and exists (
      select 1 from public.trading_watchlists w where w.id = watchlist_id and w.user_id = auth.uid()
    )
  );
create policy "trading watchlist items insert own" on public.trading_watchlist_items
  for insert to authenticated with check (
    auth.uid() = user_id and exists (
      select 1 from public.trading_watchlists w where w.id = watchlist_id and w.user_id = auth.uid()
    )
  );
create policy "trading watchlist items update own" on public.trading_watchlist_items
  for update to authenticated using (
    auth.uid() = user_id and exists (
      select 1 from public.trading_watchlists w where w.id = watchlist_id and w.user_id = auth.uid()
    )
  ) with check (
    auth.uid() = user_id and exists (
      select 1 from public.trading_watchlists w where w.id = watchlist_id and w.user_id = auth.uid()
    )
  );
create policy "trading watchlist items delete own" on public.trading_watchlist_items
  for delete to authenticated using (
    auth.uid() = user_id and exists (
      select 1 from public.trading_watchlists w where w.id = watchlist_id and w.user_id = auth.uid()
    )
  );

create policy "trading journal select own" on public.trading_journal_entries
  for select to authenticated using (auth.uid() = user_id);
create policy "trading journal insert own" on public.trading_journal_entries
  for insert to authenticated with check (auth.uid() = user_id);
create policy "trading journal update own" on public.trading_journal_entries
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "trading journal delete own" on public.trading_journal_entries
  for delete to authenticated using (auth.uid() = user_id);

create policy "trading simulations select own" on public.trading_simulations
  for select to authenticated using (auth.uid() = user_id);
create policy "trading simulations insert own" on public.trading_simulations
  for insert to authenticated with check (auth.uid() = user_id);
create policy "trading simulations update own" on public.trading_simulations
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "trading simulations delete own" on public.trading_simulations
  for delete to authenticated using (auth.uid() = user_id);
