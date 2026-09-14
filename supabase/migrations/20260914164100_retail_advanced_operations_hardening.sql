-- Blackstar Retail advanced-operation privilege hardening.

-- Public SECURITY INVOKER wrappers call private executors; private remains outside the exposed Data API schema.
grant usage on schema private to authenticated, service_role;

-- Transfer movement counts are executor-owned. Users can edit draft item identity/quantity/notes only.
revoke update on table public.retail_stock_transfer_items from authenticated;
grant update(item_id, quantity, notes, updated_at) on table public.retail_stock_transfer_items to authenticated;

drop policy if exists retail_stock_transfer_items_insert_own on public.retail_stock_transfer_items;
create policy retail_stock_transfer_items_insert_own on public.retail_stock_transfer_items for insert to authenticated with check (
  (select auth.uid()) = user_id
  and moved_quantity = 0
  and exists (
    select 1 from public.retail_stock_transfers t
    where t.id = transfer_id
      and t.workspace_id = workspace_id
      and t.user_id = (select auth.uid())
      and t.status not in ('completed','cancelled')
  )
  and exists (
    select 1 from public.retail_catalog_items i
    where i.id = item_id
      and i.workspace_id = workspace_id
      and i.user_id = (select auth.uid())
      and i.track_inventory
  )
);
