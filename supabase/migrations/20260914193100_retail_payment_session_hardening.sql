-- Once a cash session is reconciled, its tender population is frozen.
drop policy if exists retail_payment_events_insert_own on public.retail_payment_events;
create policy retail_payment_events_insert_own on public.retail_payment_events
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid()))
    and (order_id is null or exists (select 1 from public.retail_orders o where o.id = order_id and o.workspace_id = workspace_id and o.user_id = (select auth.uid())))
    and (
      cash_session_id is null
      or exists (
        select 1 from public.retail_cash_sessions cs
        where cs.id = cash_session_id
          and cs.workspace_id = workspace_id
          and cs.user_id = (select auth.uid())
          and cs.status = 'open'
          and not exists (select 1 from public.retail_reconciliation_runs rr where rr.cash_session_id = cs.id)
      )
    )
    and (register_id is null or exists (select 1 from public.retail_registers r where r.id = register_id and r.workspace_id = workspace_id and r.user_id = (select auth.uid())))
    and (cash_session_id is null or register_id is null or exists (select 1 from public.retail_cash_sessions cs where cs.id = cash_session_id and cs.register_id = register_id))
  );
