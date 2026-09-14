-- Blackstar Retail Operations Hub: enforce ledger-only stock mutation.
-- Authenticated users may read inventory state/history but all mutations must pass
-- through retail_adjust_inventory so stock state and the immutable ledger remain atomic.

revoke all on table public.retail_inventory_levels from authenticated;
grant select on table public.retail_inventory_levels to authenticated;

revoke all on table public.retail_inventory_movements from authenticated;
grant select on table public.retail_inventory_movements to authenticated;

-- Preserve historical inventory movements when a catalogue item has recorded stock history.
alter table public.retail_inventory_movements
  drop constraint if exists retail_inventory_movements_item_id_fkey;
alter table public.retail_inventory_movements
  add constraint retail_inventory_movements_item_id_fkey
  foreign key (item_id) references public.retail_catalog_items(id) on delete restrict;

-- The operation performs explicit auth.uid() and workspace/item/location ownership checks.
-- SECURITY DEFINER is required only because direct inventory table mutation is revoked.
alter function public.retail_adjust_inventory(uuid,uuid,uuid,numeric,text,text,text,text) security definer;
revoke all on function public.retail_adjust_inventory(uuid,uuid,uuid,numeric,text,text,text,text) from public, anon;
grant execute on function public.retail_adjust_inventory(uuid,uuid,uuid,numeric,text,text,text,text) to authenticated, service_role;
