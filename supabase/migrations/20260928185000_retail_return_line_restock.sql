-- Blackstar Retail: structured return inspection lines and atomic sellable-stock restocking.
-- Reuses the existing retail_returns, inventory levels and immutable inventory movement ledger.

create table public.retail_return_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  return_id uuid not null references public.retail_returns(id) on delete cascade,
  item_id uuid not null references public.retail_catalog_items(id) on delete restrict,
  location_id uuid references public.retail_locations(id) on delete restrict,
  quantity numeric(14,3) not null check (quantity > 0),
  condition text not null default 'sellable' check (condition in ('sellable','opened','damaged','defective','unknown')),
  disposition text not null default 'restock' check (disposition in ('restock','quarantine','discard','return_to_supplier','inspect')),
  processed_quantity numeric(14,3) not null default 0 check (processed_quantity >= 0 and processed_quantity <= quantity),
  processed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index retail_return_items_return_item_location_uq
  on public.retail_return_items(return_id, item_id, coalesce(location_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index retail_return_items_workspace_idx on public.retail_return_items(workspace_id, return_id);
create index retail_return_items_item_fk_idx on public.retail_return_items(item_id);
create index retail_return_items_location_fk_idx on public.retail_return_items(location_id);
create index retail_return_items_user_idx on public.retail_return_items(user_id, updated_at desc);

create trigger retail_return_items_set_updated_at
before update on public.retail_return_items
for each row execute function public.retail_set_updated_at();

alter table public.retail_return_items enable row level security;
alter table public.retail_return_items force row level security;
revoke all on table public.retail_return_items from anon, authenticated;
grant select, insert, delete on table public.retail_return_items to authenticated;
grant update(item_id, location_id, quantity, condition, disposition, notes, updated_at)
  on table public.retail_return_items to authenticated;
grant all on table public.retail_return_items to service_role;

create policy retail_return_items_select_own on public.retail_return_items
for select to authenticated
using ((select auth.uid()) = user_id);

create policy retail_return_items_insert_own on public.retail_return_items
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and processed_quantity = 0
  and processed_at is null
  and exists (
    select 1 from public.retail_returns r
    where r.id = return_id and r.workspace_id = workspace_id and r.user_id = (select auth.uid())
  )
  and exists (
    select 1 from public.retail_catalog_items i
    where i.id = item_id and i.workspace_id = workspace_id and i.user_id = (select auth.uid()) and i.track_inventory
  )
  and (
    location_id is null
    or exists (
      select 1 from public.retail_locations l
      where l.id = location_id and l.workspace_id = workspace_id and l.user_id = (select auth.uid()) and l.active
    )
  )
);

create policy retail_return_items_update_own on public.retail_return_items
for update to authenticated
using ((select auth.uid()) = user_id and processed_quantity = 0)
with check (
  (select auth.uid()) = user_id
  and processed_quantity = 0
  and processed_at is null
  and exists (
    select 1 from public.retail_returns r
    where r.id = return_id and r.workspace_id = workspace_id and r.user_id = (select auth.uid())
  )
  and exists (
    select 1 from public.retail_catalog_items i
    where i.id = item_id and i.workspace_id = workspace_id and i.user_id = (select auth.uid()) and i.track_inventory
  )
  and (
    location_id is null
    or exists (
      select 1 from public.retail_locations l
      where l.id = location_id and l.workspace_id = workspace_id and l.user_id = (select auth.uid()) and l.active
    )
  )
);

create policy retail_return_items_delete_own on public.retail_return_items
for delete to authenticated
using ((select auth.uid()) = user_id and processed_quantity = 0);

create or replace function private.retail_process_return_restock_impl(p_return_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_return public.retail_returns%rowtype;
  v_line public.retail_return_items%rowtype;
  v_quantity numeric;
  v_processed_lines integer := 0;
  v_processed_quantity numeric := 0;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;

  select * into v_return
  from public.retail_returns
  where id = p_return_id and user_id = v_uid
  for update;
  if not found then raise exception 'return_not_found'; end if;
  if not v_return.restock then raise exception 'return_not_marked_for_restock'; end if;
  if v_return.status not in ('received','refunded') then raise exception 'return_must_be_received_before_restock'; end if;

  for v_line in
    select ri.*
    from public.retail_return_items ri
    where ri.return_id = p_return_id
      and ri.user_id = v_uid
      and ri.workspace_id = v_return.workspace_id
      and ri.disposition = 'restock'
      and ri.condition = 'sellable'
      and ri.processed_quantity < ri.quantity
    order by ri.item_id, ri.location_id nulls last
    for update
  loop
    if v_line.location_id is null then
      raise exception 'restock_location_required_for_item:%', v_line.item_id;
    end if;
    if not exists (
      select 1 from public.retail_catalog_items i
      where i.id = v_line.item_id
        and i.workspace_id = v_return.workspace_id
        and i.user_id = v_uid
        and i.track_inventory
        and i.active
    ) then
      raise exception 'restock_item_not_available:%', v_line.item_id;
    end if;
    if not exists (
      select 1 from public.retail_locations l
      where l.id = v_line.location_id
        and l.workspace_id = v_return.workspace_id
        and l.user_id = v_uid
        and l.active
    ) then
      raise exception 'restock_location_not_available:%', v_line.location_id;
    end if;

    v_quantity := v_line.quantity - v_line.processed_quantity;

    insert into public.retail_inventory_levels(
      user_id, workspace_id, location_id, item_id, on_hand, reserved, updated_at
    )
    values (
      v_uid, v_return.workspace_id, v_line.location_id, v_line.item_id, v_quantity, 0, now()
    )
    on conflict (workspace_id, item_id, (coalesce(location_id, '00000000-0000-0000-0000-000000000000'::uuid)))
    do update set
      on_hand = public.retail_inventory_levels.on_hand + excluded.on_hand,
      updated_at = now();

    insert into public.retail_inventory_movements(
      user_id, workspace_id, location_id, item_id, movement_type, quantity,
      reference_type, reference_id, note
    )
    values (
      v_uid, v_return.workspace_id, v_line.location_id, v_line.item_id, 'return', v_quantity,
      'return', p_return_id::text, coalesce(v_line.notes, v_return.notes)
    );

    update public.retail_return_items
    set processed_quantity = quantity,
        processed_at = now(),
        updated_at = now()
    where id = v_line.id;

    v_processed_lines := v_processed_lines + 1;
    v_processed_quantity := v_processed_quantity + v_quantity;
  end loop;

  if v_processed_lines = 0 then raise exception 'no_eligible_sellable_return_lines'; end if;

  return jsonb_build_object(
    'return_id', p_return_id,
    'status', 'processed',
    'processed_lines', v_processed_lines,
    'processed_quantity', v_processed_quantity
  );
end;
$$;

revoke all on function private.retail_process_return_restock_impl(uuid) from public, anon;
grant execute on function private.retail_process_return_restock_impl(uuid) to authenticated, service_role;

create or replace function public.retail_process_return_restock(p_return_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.retail_process_return_restock_impl(p_return_id);
$$;

revoke all on function public.retail_process_return_restock(uuid) from public, anon;
grant execute on function public.retail_process_return_restock(uuid) to authenticated, service_role;
