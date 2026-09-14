-- Harden the owner-scoped integrated platform tables using current Supabase RLS guidance.
-- The original 20260829003000 migration used a PUBLIC FOR ALL policy and inherited anon grants.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'quant_strategies',
    'quant_backtest_runs',
    'sync_connections',
    'commerce_workspaces',
    'remote_developer_sessions',
    'media_timeline_tracks',
    'media_timeline_keyframes',
    'web_intelligence_snapshots'
  ] LOOP
    EXECUTE format('alter table public.%I enable row level security', t);
    EXECUTE format('revoke all on table public.%I from anon, authenticated', t);
    EXECUTE format('grant select, insert, update, delete on table public.%I to authenticated', t);
    EXECUTE format('grant select, insert, update, delete on table public.%I to service_role', t);

    EXECUTE format('drop policy if exists %I on public.%I', t || '_owner_all', t);
    EXECUTE format('drop policy if exists %I on public.%I', t || '_owner_select', t);
    EXECUTE format('drop policy if exists %I on public.%I', t || '_owner_insert', t);
    EXECUTE format('drop policy if exists %I on public.%I', t || '_owner_update', t);
    EXECUTE format('drop policy if exists %I on public.%I', t || '_owner_delete', t);

    EXECUTE format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t || '_owner_select', t);
    EXECUTE format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t || '_owner_insert', t);
    EXECUTE format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t || '_owner_update', t);
    EXECUTE format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t || '_owner_delete', t);
  END LOOP;
END $$;
