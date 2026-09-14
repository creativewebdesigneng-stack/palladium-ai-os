-- Blackstar Retail: remove Supabase default table privileges that exceed the Retail API contract.
-- RLS remains the row-level authorization layer; this migration also removes table-level TRUNCATE,
-- REFERENCES and TRIGGER privileges from authenticated clients.

-- Mutable owner-scoped Retail tables need normal CRUD only.
do $$
declare t text;
begin
  foreach t in array array[
    'retail_workspaces','retail_locations','retail_suppliers','retail_catalog_items',
    'retail_purchase_orders','retail_staff','retail_appointments','retail_orders','retail_call_inbox',
    'retail_returns','retail_promotions','retail_reorder_proposals','retail_stock_transfers'
  ]
  loop
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
  end loop;
end $$;

-- Inventory ledgers/balances and loyalty events are written only by governed RPC/private executors.
revoke all on table public.retail_inventory_levels from anon, authenticated;
grant select on table public.retail_inventory_levels to authenticated;

revoke all on table public.retail_inventory_movements from anon, authenticated;
grant select on table public.retail_inventory_movements to authenticated;

revoke all on table public.retail_loyalty_events from anon, authenticated;
grant select on table public.retail_loyalty_events to authenticated;

-- Loyalty profile fields are editable, but balances remain executor-owned.
revoke all on table public.retail_loyalty_members from anon, authenticated;
grant select, insert, delete on table public.retail_loyalty_members to authenticated;
grant update(customer_name, email, phone, tier, last_activity_at, notes, updated_at)
  on table public.retail_loyalty_members to authenticated;

-- Draft transfer contents are client-editable, but moved_quantity is executor-owned.
revoke all on table public.retail_stock_transfer_items from anon, authenticated;
grant select, insert, delete on table public.retail_stock_transfer_items to authenticated;
grant update(item_id, quantity, notes, updated_at)
  on table public.retail_stock_transfer_items to authenticated;

-- Preserve full service-role access for trusted server/worker paths.
do $$
declare t text;
begin
  foreach t in array array[
    'retail_workspaces','retail_locations','retail_suppliers','retail_catalog_items',
    'retail_inventory_levels','retail_inventory_movements','retail_purchase_orders','retail_staff',
    'retail_appointments','retail_orders','retail_call_inbox','retail_returns','retail_promotions',
    'retail_loyalty_members','retail_loyalty_events','retail_reorder_proposals',
    'retail_stock_transfers','retail_stock_transfer_items'
  ]
  loop
    execute format('grant all on table public.%I to service_role', t);
  end loop;
end $$;
