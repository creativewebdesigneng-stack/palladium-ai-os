drop policy if exists "trading watchlists select own" on public.trading_watchlists;
drop policy if exists "trading watchlists insert own" on public.trading_watchlists;
drop policy if exists "trading watchlists update own" on public.trading_watchlists;
drop policy if exists "trading watchlists delete own" on public.trading_watchlists;

create policy "trading watchlists select own" on public.trading_watchlists
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "trading watchlists insert own" on public.trading_watchlists
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "trading watchlists update own" on public.trading_watchlists
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "trading watchlists delete own" on public.trading_watchlists
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "trading watchlist items select own" on public.trading_watchlist_items;
drop policy if exists "trading watchlist items insert own" on public.trading_watchlist_items;
drop policy if exists "trading watchlist items update own" on public.trading_watchlist_items;
drop policy if exists "trading watchlist items delete own" on public.trading_watchlist_items;

create policy "trading watchlist items select own" on public.trading_watchlist_items
  for select to authenticated using (
    (select auth.uid()) = user_id and exists (
      select 1 from public.trading_watchlists w where w.id = watchlist_id and w.user_id = (select auth.uid())
    )
  );
create policy "trading watchlist items insert own" on public.trading_watchlist_items
  for insert to authenticated with check (
    (select auth.uid()) = user_id and exists (
      select 1 from public.trading_watchlists w where w.id = watchlist_id and w.user_id = (select auth.uid())
    )
  );
create policy "trading watchlist items update own" on public.trading_watchlist_items
  for update to authenticated using (
    (select auth.uid()) = user_id and exists (
      select 1 from public.trading_watchlists w where w.id = watchlist_id and w.user_id = (select auth.uid())
    )
  ) with check (
    (select auth.uid()) = user_id and exists (
      select 1 from public.trading_watchlists w where w.id = watchlist_id and w.user_id = (select auth.uid())
    )
  );
create policy "trading watchlist items delete own" on public.trading_watchlist_items
  for delete to authenticated using (
    (select auth.uid()) = user_id and exists (
      select 1 from public.trading_watchlists w where w.id = watchlist_id and w.user_id = (select auth.uid())
    )
  );

drop policy if exists "trading journal select own" on public.trading_journal_entries;
drop policy if exists "trading journal insert own" on public.trading_journal_entries;
drop policy if exists "trading journal update own" on public.trading_journal_entries;
drop policy if exists "trading journal delete own" on public.trading_journal_entries;

create policy "trading journal select own" on public.trading_journal_entries
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "trading journal insert own" on public.trading_journal_entries
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "trading journal update own" on public.trading_journal_entries
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "trading journal delete own" on public.trading_journal_entries
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "trading simulations select own" on public.trading_simulations;
drop policy if exists "trading simulations insert own" on public.trading_simulations;
drop policy if exists "trading simulations update own" on public.trading_simulations;
drop policy if exists "trading simulations delete own" on public.trading_simulations;

create policy "trading simulations select own" on public.trading_simulations
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "trading simulations insert own" on public.trading_simulations
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "trading simulations update own" on public.trading_simulations
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "trading simulations delete own" on public.trading_simulations
  for delete to authenticated using ((select auth.uid()) = user_id);
