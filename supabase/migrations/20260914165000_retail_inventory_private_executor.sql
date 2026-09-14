-- Blackstar Retail Operations Hub: keep privileged stock mutation out of the exposed public API schema.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;

create or replace function private.retail_adjust_inventory_impl(
  p_workspace_id uuid,
  p_item_id uuid,
  p_location_id uuid default null,
  p_quantity numeric default 0,
  p_movement_type text default 'adjustment',
  p_note text default null,
  p_reference_type text default null,
  p_reference_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_level public.retail_inventory_levels%rowtype;
  v_stock_delta numeric := 0;
  v_reserved_delta numeric := 0;
  v_applied_quantity numeric := p_quantity;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_quantity = 0 then raise exception 'quantity_cannot_be_zero'; end if;
  if p_movement_type not in ('stock_in','sale','return','adjustment','waste','transfer_in','transfer_out','reservation','release') then raise exception 'invalid_movement_type'; end if;

  if not exists (
    select 1 from public.retail_catalog_items i
    where i.id = p_item_id
      and i.workspace_id = p_workspace_id
      and i.user_id = v_user_id
      and i.track_inventory = true
  ) then
    raise exception 'inventory_item_not_found';
  end if;

  if p_location_id is not null and not exists (
    select 1 from public.retail_locations l
    where l.id = p_location_id
      and l.workspace_id = p_workspace_id
      and l.user_id = v_user_id
  ) then
    raise exception 'inventory_location_not_found';
  end if;

  case p_movement_type
    when 'stock_in' then v_stock_delta := abs(p_quantity); v_applied_quantity := abs(p_quantity);
    when 'return' then v_stock_delta := abs(p_quantity); v_applied_quantity := abs(p_quantity);
    when 'transfer_in' then v_stock_delta := abs(p_quantity); v_applied_quantity := abs(p_quantity);
    when 'sale' then v_stock_delta := -abs(p_quantity); v_applied_quantity := -abs(p_quantity);
    when 'waste' then v_stock_delta := -abs(p_quantity); v_applied_quantity := -abs(p_quantity);
    when 'transfer_out' then v_stock_delta := -abs(p_quantity); v_applied_quantity := -abs(p_quantity);
    when 'reservation' then v_reserved_delta := abs(p_quantity); v_applied_quantity := abs(p_quantity);
    when 'release' then v_reserved_delta := -abs(p_quantity); v_applied_quantity := -abs(p_quantity);
    else v_stock_delta := p_quantity;
  end case;

  select * into v_level
  from public.retail_inventory_levels l
  where l.user_id = v_user_id
    and l.workspace_id = p_workspace_id
    and l.item_id = p_item_id
    and l.location_id is not distinct from p_location_id
  for update;

  if found then
    update public.retail_inventory_levels
       set on_hand = on_hand + v_stock_delta,
           reserved = greatest(0, reserved + v_reserved_delta),
           updated_at = now()
     where id = v_level.id
     returning * into v_level;
  else
    insert into public.retail_inventory_levels (
      user_id, workspace_id, location_id, item_id, on_hand, reserved
    ) values (
      v_user_id, p_workspace_id, p_location_id, p_item_id, v_stock_delta, greatest(0, v_reserved_delta)
    )
    returning * into v_level;
  end if;

  insert into public.retail_inventory_movements (
    user_id, workspace_id, location_id, item_id, movement_type, quantity, reference_type, reference_id, note
  ) values (
    v_user_id, p_workspace_id, p_location_id, p_item_id, p_movement_type, v_applied_quantity, p_reference_type, p_reference_id, p_note
  );

  return jsonb_build_object(
    'inventory_level_id', v_level.id,
    'on_hand', v_level.on_hand,
    'reserved', v_level.reserved,
    'available', v_level.on_hand - v_level.reserved,
    'applied_quantity', v_applied_quantity,
    'movement_type', p_movement_type
  );
end;
$$;

revoke all on function private.retail_adjust_inventory_impl(uuid,uuid,uuid,numeric,text,text,text,text) from public, anon;
grant execute on function private.retail_adjust_inventory_impl(uuid,uuid,uuid,numeric,text,text,text,text) to authenticated, service_role;

create or replace function public.retail_adjust_inventory(
  p_workspace_id uuid,
  p_item_id uuid,
  p_location_id uuid default null,
  p_quantity numeric default 0,
  p_movement_type text default 'adjustment',
  p_note text default null,
  p_reference_type text default null,
  p_reference_id text default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.retail_adjust_inventory_impl(
    p_workspace_id,
    p_item_id,
    p_location_id,
    p_quantity,
    p_movement_type,
    p_note,
    p_reference_type,
    p_reference_id
  );
$$;

revoke all on function public.retail_adjust_inventory(uuid,uuid,uuid,numeric,text,text,text,text) from public, anon;
grant execute on function public.retail_adjust_inventory(uuid,uuid,uuid,numeric,text,text,text,text) to authenticated, service_role;
