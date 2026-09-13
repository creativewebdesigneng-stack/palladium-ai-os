create table if not exists public.trading_market_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  kind text not null check (kind in ('equity','fx','crypto')),
  symbol text not null check (char_length(btrim(symbol)) between 1 and 32),
  operator text not null check (operator in ('above','below')),
  threshold numeric not null check (threshold > 0),
  enabled boolean not null default true,
  cooldown_minutes integer not null default 1440 check (cooldown_minutes between 60 and 10080),
  last_evaluated_at timestamptz,
  last_value numeric,
  last_as_of date,
  last_provider text check (last_provider is null or char_length(last_provider) <= 80),
  last_triggered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trading_market_alerts_user_updated_idx
  on public.trading_market_alerts (user_id, updated_at desc);
create index if not exists trading_market_alerts_user_enabled_idx
  on public.trading_market_alerts (user_id, enabled, kind, symbol);

alter table public.trading_market_alerts enable row level security;

revoke all on table public.trading_market_alerts from anon, authenticated;
grant select, insert, update, delete on table public.trading_market_alerts to authenticated;

drop policy if exists "trading market alerts select own" on public.trading_market_alerts;
create policy "trading market alerts select own" on public.trading_market_alerts
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "trading market alerts insert own" on public.trading_market_alerts;
create policy "trading market alerts insert own" on public.trading_market_alerts
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "trading market alerts update own" on public.trading_market_alerts;
create policy "trading market alerts update own" on public.trading_market_alerts
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "trading market alerts delete own" on public.trading_market_alerts;
create policy "trading market alerts delete own" on public.trading_market_alerts
  for delete to authenticated using ((select auth.uid()) = user_id);
