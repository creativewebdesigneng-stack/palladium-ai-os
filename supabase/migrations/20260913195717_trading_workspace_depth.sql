-- Deepens the existing owner-scoped Trading Hub workspace; it does not add broker execution or live-price storage.
alter table public.trading_watchlist_items
  add column if not exists thesis text,
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists watch_level numeric,
  add column if not exists target_level numeric;

alter table public.trading_watchlist_items
  drop constraint if exists trading_watchlist_items_thesis_check,
  add constraint trading_watchlist_items_thesis_check
    check (thesis is null or char_length(thesis) <= 4000),
  drop constraint if exists trading_watchlist_items_tags_check,
  add constraint trading_watchlist_items_tags_check
    check (cardinality(tags) <= 20),
  drop constraint if exists trading_watchlist_items_watch_level_check,
  add constraint trading_watchlist_items_watch_level_check
    check (watch_level is null or watch_level > 0),
  drop constraint if exists trading_watchlist_items_target_level_check,
  add constraint trading_watchlist_items_target_level_check
    check (target_level is null or target_level > 0);

alter table public.trading_simulations
  add column if not exists asset_type text,
  add column if not exists market text,
  add column if not exists stop_price numeric,
  add column if not exists target_price numeric,
  add column if not exists strategy text,
  add column if not exists tags text[] not null default '{}'::text[];

alter table public.trading_simulations
  drop constraint if exists trading_simulations_asset_type_check,
  add constraint trading_simulations_asset_type_check
    check (asset_type is null or asset_type in ('stock','etf','fund','bond','fx','future','option','commodity','crypto','index','other')),
  drop constraint if exists trading_simulations_market_check,
  add constraint trading_simulations_market_check
    check (market is null or char_length(market) <= 80),
  drop constraint if exists trading_simulations_stop_price_check,
  add constraint trading_simulations_stop_price_check
    check (stop_price is null or stop_price > 0),
  drop constraint if exists trading_simulations_target_price_check,
  add constraint trading_simulations_target_price_check
    check (target_price is null or target_price > 0),
  drop constraint if exists trading_simulations_strategy_check,
  add constraint trading_simulations_strategy_check
    check (strategy is null or char_length(strategy) <= 120),
  drop constraint if exists trading_simulations_tags_check,
  add constraint trading_simulations_tags_check
    check (cardinality(tags) <= 20);

alter table public.trading_journal_entries
  add column if not exists simulation_id uuid references public.trading_simulations(id) on delete set null,
  add column if not exists setup text,
  add column if not exists catalyst text,
  add column if not exists entry_reasoning text,
  add column if not exists risk_plan text,
  add column if not exists strategy text,
  add column if not exists discipline_notes text,
  add column if not exists mistakes text;

alter table public.trading_journal_entries
  drop constraint if exists trading_journal_entries_setup_check,
  add constraint trading_journal_entries_setup_check check (setup is null or char_length(setup) <= 4000),
  drop constraint if exists trading_journal_entries_catalyst_check,
  add constraint trading_journal_entries_catalyst_check check (catalyst is null or char_length(catalyst) <= 4000),
  drop constraint if exists trading_journal_entries_entry_reasoning_check,
  add constraint trading_journal_entries_entry_reasoning_check check (entry_reasoning is null or char_length(entry_reasoning) <= 8000),
  drop constraint if exists trading_journal_entries_risk_plan_check,
  add constraint trading_journal_entries_risk_plan_check check (risk_plan is null or char_length(risk_plan) <= 8000),
  drop constraint if exists trading_journal_entries_strategy_check,
  add constraint trading_journal_entries_strategy_check check (strategy is null or char_length(strategy) <= 120),
  drop constraint if exists trading_journal_entries_discipline_notes_check,
  add constraint trading_journal_entries_discipline_notes_check check (discipline_notes is null or char_length(discipline_notes) <= 8000),
  drop constraint if exists trading_journal_entries_mistakes_check,
  add constraint trading_journal_entries_mistakes_check check (mistakes is null or char_length(mistakes) <= 8000);

create index if not exists trading_journal_entries_simulation_idx
  on public.trading_journal_entries (simulation_id)
  where simulation_id is not null;

drop policy if exists "trading journal insert own" on public.trading_journal_entries;
drop policy if exists "trading journal update own" on public.trading_journal_entries;

create policy "trading journal insert own" on public.trading_journal_entries
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (
      simulation_id is null
      or exists (
        select 1 from public.trading_simulations s
        where s.id = simulation_id and s.user_id = (select auth.uid())
      )
    )
  );

create policy "trading journal update own" on public.trading_journal_entries
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      simulation_id is null
      or exists (
        select 1 from public.trading_simulations s
        where s.id = simulation_id and s.user_id = (select auth.uid())
      )
    )
  );

revoke all on public.trading_watchlist_items from anon;
revoke all on public.trading_simulations from anon;
revoke all on public.trading_journal_entries from anon;

grant select, insert, update, delete on public.trading_watchlist_items to authenticated;
grant select, insert, update, delete on public.trading_simulations to authenticated;
grant select, insert, update, delete on public.trading_journal_entries to authenticated;
