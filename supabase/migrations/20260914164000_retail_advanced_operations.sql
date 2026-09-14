-- Blackstar Retail advanced operations
-- Returns/refunds records, promotions, loyalty, reorder proposals, governed stock transfers,
-- demand-supporting data, and missing Retail FK covering indexes.

-- Close Retail FK-index gaps reported by the Supabase performance advisor.
create index if not exists retail_appointments_location_fk_idx on public.retail_appointments(location_id);
create index if not exists retail_appointments_service_item_fk_idx on public.retail_appointments(service_item_id);
create index if not exists retail_inventory_item_fk_idx on public.retail_inventory_levels(item_id);
create index if not exists retail_inventory_movements_location_fk_idx on public.retail_inventory_movements(location_id);
create index if not exists retail_orders_location_fk_idx on public.retail_orders(location_id);

create table public.retail_returns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  order_id uuid references public.retail_orders(id) on delete set null,
  return_number text not null check (char_length(return_number) between 1 and 120),
  customer_name text,
  status text not null default 'requested' check (status in ('requested','approved','received','refunded','rejected','cancelled')),
  reason text,
  items jsonb not null default '[]'::jsonb,
  refund_amount numeric(14,2) not null default 0 check (refund_amount >= 0),
  refund_method text check (refund_method is null or refund_method in ('original_payment','store_credit','cash','other')),
  restock boolean not null default false,
  requested_at timestamptz not null default now(),
  received_at timestamptz,
  refunded_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index retail_returns_number_uq on public.retail_returns(workspace_id, return_number);
create index retail_returns_workspace_status_idx on public.retail_returns(workspace_id, status, requested_at desc);
create index retail_returns_order_fk_idx on public.retail_returns(order_id);
create index retail_returns_user_idx on public.retail_returns(user_id, updated_at desc);

create table public.retail_promotions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 180),
  code text,
  promotion_type text not null default 'percentage' check (promotion_type in ('percentage','fixed_amount','buy_x_get_y','free_shipping','custom')),
  value numeric(14,4) not null default 0 check (value >= 0),
  minimum_spend numeric(14,2) not null default 0 check (minimum_spend >= 0),
  channel text not null default 'all' check (channel in ('all','store','online','service','marketplace','social')),
  applies_to jsonb not null default '{}'::jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer check (usage_limit is null or usage_limit >= 0),
  usage_count integer not null default 0 check (usage_count >= 0),
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create unique index retail_promotions_code_uq on public.retail_promotions(workspace_id, lower(code)) where code is not null and btrim(code) <> '';
create index retail_promotions_workspace_active_idx on public.retail_promotions(workspace_id, active, starts_at, ends_at);
create index retail_promotions_user_idx on public.retail_promotions(user_id, updated_at desc);

create table public.retail_loyalty_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  customer_name text not null check (char_length(customer_name) between 1 and 180),
  email text,
  phone text,
  points_balance integer not null default 0 check (points_balance >= 0),
  lifetime_points integer not null default 0 check (lifetime_points >= 0),
  lifetime_spend numeric(14,2) not null default 0 check (lifetime_spend >= 0),
  tier text not null default 'member' check (char_length(tier) between 1 and 80),
  joined_at timestamptz not null default now(),
  last_activity_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index retail_loyalty_email_uq on public.retail_loyalty_members(workspace_id, lower(email)) where email is not null and btrim(email) <> '';
create index retail_loyalty_workspace_idx on public.retail_loyalty_members(workspace_id, points_balance desc, updated_at desc);
create index retail_loyalty_user_idx on public.retail_loyalty_members(user_id, updated_at desc);

create table public.retail_loyalty_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  member_id uuid not null references public.retail_loyalty_members(id) on delete restrict,
  order_id uuid references public.retail_orders(id) on delete set null,
  event_type text not null check (event_type in ('earn','redeem','adjust','expire','refund')),
  points integer not null check (points <> 0),
  amount numeric(14,2) not null default 0 check (amount >= 0),
  note text,
  created_at timestamptz not null default now()
);
create index retail_loyalty_events_member_idx on public.retail_loyalty_events(member_id, created_at desc);
create index retail_loyalty_events_order_fk_idx on public.retail_loyalty_events(order_id);
create index retail_loyalty_events_workspace_idx on public.retail_loyalty_events(workspace_id, created_at desc);
create index retail_loyalty_events_user_idx on public.retail_loyalty_events(user_id, created_at desc);

create table public.retail_reorder_proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  item_id uuid not null references public.retail_catalog_items(id) on delete cascade,
  supplier_id uuid references public.retail_suppliers(id) on delete set null,
  location_id uuid references public.retail_locations(id) on delete set null,
  purchase_order_id uuid references public.retail_purchase_orders(id) on delete set null,
  recommended_quantity numeric(14,3) not null check (recommended_quantity > 0),
  available_quantity numeric(14,3) not null default 0,
  reorder_point numeric(14,3) not null default 0 check (reorder_point >= 0),
  avg_daily_demand numeric(14,4) not null default 0 check (avg_daily_demand >= 0),
  days_of_cover numeric(14,2),
  reason text,
  status text not null default 'suggested' check (status in ('suggested','approved','ordered','dismissed')),
  generated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index retail_reorder_current_uq on public.retail_reorder_proposals(workspace_id, item_id, coalesce(location_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index retail_reorder_workspace_status_idx on public.retail_reorder_proposals(workspace_id, status, generated_at desc);
create index retail_reorder_item_fk_idx on public.retail_reorder_proposals(item_id);
create index retail_reorder_supplier_fk_idx on public.retail_reorder_proposals(supplier_id);
create index retail_reorder_location_fk_idx on public.retail_reorder_proposals(location_id);
create index retail_reorder_po_fk_idx on public.retail_reorder_proposals(purchase_order_id);
create index retail_reorder_user_idx on public.retail_reorder_proposals(user_id, updated_at desc);

create table public.retail_stock_transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  transfer_number text not null check (char_length(transfer_number) between 1 and 120),
  from_location_id uuid not null references public.retail_locations(id) on delete restrict,
  to_location_id uuid not null references public.retail_locations(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft','approved','in_transit','completed','cancelled')),
  initiated_at timestamptz not null default now(),
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (from_location_id <> to_location_id)
);
create unique index retail_stock_transfers_number_uq on public.retail_stock_transfers(workspace_id, transfer_number);
create index retail_stock_transfers_workspace_idx on public.retail_stock_transfers(workspace_id, status, initiated_at desc);
create index retail_stock_transfers_from_fk_idx on public.retail_stock_transfers(from_location_id);
create index retail_stock_transfers_to_fk_idx on public.retail_stock_transfers(to_location_id);
create index retail_stock_transfers_user_idx on public.retail_stock_transfers(user_id, updated_at desc);

create table public.retail_stock_transfer_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  transfer_id uuid not null references public.retail_stock_transfers(id) on delete cascade,
  item_id uuid not null references public.retail_catalog_items(id) on delete restrict,
  quantity numeric(14,3) not null check (quantity > 0),
  moved_quantity numeric(14,3) not null default 0 check (moved_quantity >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index retail_stock_transfer_items_uq on public.retail_stock_transfer_items(transfer_id, item_id);
create index retail_stock_transfer_items_item_fk_idx on public.retail_stock_transfer_items(item_id);
create index retail_stock_transfer_items_workspace_idx on public.retail_stock_transfer_items(workspace_id, transfer_id);
create index retail_stock_transfer_items_user_idx on public.retail_stock_transfer_items(user_id, updated_at desc);

-- Updated-at triggers.
do $$
declare t text;
begin
  foreach t in array array['retail_returns','retail_promotions','retail_loyalty_members','retail_reorder_proposals','retail_stock_transfers','retail_stock_transfer_items']
  loop
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.retail_set_updated_at()', t, t);
  end loop;
end $$;

-- Standard owner-scoped RLS for mutable advanced tables.
do $$
declare t text;
begin
  foreach t in array array['retail_returns','retail_promotions','retail_reorder_proposals','retail_stock_transfers','retail_stock_transfer_items']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
    execute format('create policy %I_select_own on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t, t);
    execute format('create policy %I_delete_own on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t, t);
  end loop;
end $$;

-- Returns must remain attached to the user's workspace/order.
create policy retail_returns_insert_own on public.retail_returns for insert to authenticated with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid()))
  and (order_id is null or exists (select 1 from public.retail_orders o where o.id = order_id and o.workspace_id = workspace_id and o.user_id = (select auth.uid())))
);
create policy retail_returns_update_own on public.retail_returns for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid()))
    and (order_id is null or exists (select 1 from public.retail_orders o where o.id = order_id and o.workspace_id = workspace_id and o.user_id = (select auth.uid())))
  );

create policy retail_promotions_insert_own on public.retail_promotions for insert to authenticated with check (
  (select auth.uid()) = user_id and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid()))
);
create policy retail_promotions_update_own on public.retail_promotions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid())));

-- Loyalty members: profile fields can be edited by clients, balances only by governed RPC.
alter table public.retail_loyalty_members enable row level security;
revoke all on table public.retail_loyalty_members from anon;
revoke all on table public.retail_loyalty_members from authenticated;
grant select, insert, delete on table public.retail_loyalty_members to authenticated;
grant update(customer_name, email, phone, tier, last_activity_at, notes, updated_at) on table public.retail_loyalty_members to authenticated;
grant all on table public.retail_loyalty_members to service_role;
create policy retail_loyalty_members_select_own on public.retail_loyalty_members for select to authenticated using ((select auth.uid()) = user_id);
create policy retail_loyalty_members_delete_own on public.retail_loyalty_members for delete to authenticated using ((select auth.uid()) = user_id);
create policy retail_loyalty_members_insert_own on public.retail_loyalty_members for insert to authenticated with check (
  (select auth.uid()) = user_id
  and points_balance = 0 and lifetime_points = 0 and lifetime_spend = 0
  and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid()))
);
create policy retail_loyalty_members_update_own on public.retail_loyalty_members for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid())));

-- Loyalty event ledger is append-only to ordinary clients and is written only by the private executor.
alter table public.retail_loyalty_events enable row level security;
revoke all on table public.retail_loyalty_events from anon;
revoke all on table public.retail_loyalty_events from authenticated;
grant select on table public.retail_loyalty_events to authenticated;
grant all on table public.retail_loyalty_events to service_role;
create policy retail_loyalty_events_select_own on public.retail_loyalty_events for select to authenticated using ((select auth.uid()) = user_id);

create policy retail_reorder_proposals_insert_own on public.retail_reorder_proposals for insert to authenticated with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid()))
  and exists (select 1 from public.retail_catalog_items i where i.id = item_id and i.workspace_id = workspace_id and i.user_id = (select auth.uid()))
  and (supplier_id is null or exists (select 1 from public.retail_suppliers s where s.id = supplier_id and s.workspace_id = workspace_id and s.user_id = (select auth.uid())))
  and (location_id is null or exists (select 1 from public.retail_locations l where l.id = location_id and l.workspace_id = workspace_id and l.user_id = (select auth.uid())))
  and (purchase_order_id is null or exists (select 1 from public.retail_purchase_orders p where p.id = purchase_order_id and p.workspace_id = workspace_id and p.user_id = (select auth.uid())))
);
create policy retail_reorder_proposals_update_own on public.retail_reorder_proposals for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid()))
    and exists (select 1 from public.retail_catalog_items i where i.id = item_id and i.workspace_id = workspace_id and i.user_id = (select auth.uid()))
    and (supplier_id is null or exists (select 1 from public.retail_suppliers s where s.id = supplier_id and s.workspace_id = workspace_id and s.user_id = (select auth.uid())))
    and (location_id is null or exists (select 1 from public.retail_locations l where l.id = location_id and l.workspace_id = workspace_id and l.user_id = (select auth.uid())))
    and (purchase_order_id is null or exists (select 1 from public.retail_purchase_orders p where p.id = purchase_order_id and p.workspace_id = workspace_id and p.user_id = (select auth.uid())))
  );

create policy retail_stock_transfers_insert_own on public.retail_stock_transfers for insert to authenticated with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid()))
  and exists (select 1 from public.retail_locations l where l.id = from_location_id and l.workspace_id = workspace_id and l.user_id = (select auth.uid()))
  and exists (select 1 from public.retail_locations l where l.id = to_location_id and l.workspace_id = workspace_id and l.user_id = (select auth.uid()))
);
create policy retail_stock_transfers_update_own on public.retail_stock_transfers for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid()))
    and exists (select 1 from public.retail_locations l where l.id = from_location_id and l.workspace_id = workspace_id and l.user_id = (select auth.uid()))
    and exists (select 1 from public.retail_locations l where l.id = to_location_id and l.workspace_id = workspace_id and l.user_id = (select auth.uid()))
  );

create policy retail_stock_transfer_items_insert_own on public.retail_stock_transfer_items for insert to authenticated with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.retail_stock_transfers t where t.id = transfer_id and t.workspace_id = workspace_id and t.user_id = (select auth.uid()) and t.status not in ('completed','cancelled'))
  and exists (select 1 from public.retail_catalog_items i where i.id = item_id and i.workspace_id = workspace_id and i.user_id = (select auth.uid()) and i.track_inventory)
);
create policy retail_stock_transfer_items_update_own on public.retail_stock_transfer_items for update to authenticated
  using ((select auth.uid()) = user_id and exists (select 1 from public.retail_stock_transfers t where t.id = transfer_id and t.user_id = (select auth.uid()) and t.status not in ('completed','cancelled')))
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.retail_stock_transfers t where t.id = transfer_id and t.workspace_id = workspace_id and t.user_id = (select auth.uid()) and t.status not in ('completed','cancelled'))
    and exists (select 1 from public.retail_catalog_items i where i.id = item_id and i.workspace_id = workspace_id and i.user_id = (select auth.uid()) and i.track_inventory)
  );
drop policy retail_stock_transfer_items_delete_own on public.retail_stock_transfer_items;
create policy retail_stock_transfer_items_delete_own on public.retail_stock_transfer_items for delete to authenticated
  using ((select auth.uid()) = user_id and exists (select 1 from public.retail_stock_transfers t where t.id = transfer_id and t.user_id = (select auth.uid()) and t.status not in ('completed','cancelled')));

-- Prevent a client from marking a transfer completed without running the atomic stock movement executor.
create or replace function private.retail_guard_transfer_completion()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.status = 'completed' and (
    new.status is distinct from old.status
    or new.from_location_id is distinct from old.from_location_id
    or new.to_location_id is distinct from old.to_location_id
    or new.workspace_id is distinct from old.workspace_id
  ) then
    raise exception 'Completed stock transfers are immutable';
  end if;

  if new.status = 'completed' and old.status <> 'completed'
    and coalesce(current_setting('app.retail_transfer_executor', true), '') <> 'on' then
    raise exception 'Complete stock transfers through the governed Retail transfer operation';
  end if;
  return new;
end;
$$;
create trigger retail_stock_transfers_guard_completion
before update on public.retail_stock_transfers
for each row execute function private.retail_guard_transfer_completion();

-- Atomic loyalty balance + immutable event ledger executor.
create or replace function private.retail_adjust_loyalty_impl(
  p_member_id uuid,
  p_points integer,
  p_event_type text,
  p_order_id uuid default null,
  p_amount numeric default 0,
  p_note text default null
)
returns public.retail_loyalty_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_member public.retail_loyalty_members%rowtype;
  v_new_balance integer;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_points = 0 then raise exception 'Points cannot be zero'; end if;
  if p_event_type not in ('earn','redeem','adjust','expire','refund') then raise exception 'Invalid loyalty event type'; end if;
  if coalesce(p_amount, 0) < 0 then raise exception 'Amount cannot be negative'; end if;

  select * into v_member from public.retail_loyalty_members
  where id = p_member_id and user_id = v_uid
  for update;
  if not found then raise exception 'Loyalty member not found'; end if;

  if p_order_id is not null and not exists (
    select 1 from public.retail_orders o
    where o.id = p_order_id and o.user_id = v_uid and o.workspace_id = v_member.workspace_id
  ) then raise exception 'Order does not belong to this Retail workspace'; end if;

  v_new_balance := v_member.points_balance + p_points;
  if v_new_balance < 0 then raise exception 'Insufficient loyalty points'; end if;

  update public.retail_loyalty_members
  set points_balance = v_new_balance,
      lifetime_points = lifetime_points + greatest(p_points, 0),
      lifetime_spend = lifetime_spend + case when p_event_type = 'earn' then coalesce(p_amount, 0) else 0 end,
      last_activity_at = now(),
      updated_at = now()
  where id = p_member_id
  returning * into v_member;

  insert into public.retail_loyalty_events(user_id, workspace_id, member_id, order_id, event_type, points, amount, note)
  values (v_uid, v_member.workspace_id, p_member_id, p_order_id, p_event_type, p_points, coalesce(p_amount, 0), p_note);

  return v_member;
end;
$$;

create or replace function public.retail_adjust_loyalty(
  p_member_id uuid,
  p_points integer,
  p_event_type text,
  p_order_id uuid default null,
  p_amount numeric default 0,
  p_note text default null
)
returns public.retail_loyalty_members
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.retail_adjust_loyalty_impl(p_member_id, p_points, p_event_type, p_order_id, p_amount, p_note);
end;
$$;

revoke all on function private.retail_adjust_loyalty_impl(uuid,integer,text,uuid,numeric,text) from public, anon;
grant execute on function private.retail_adjust_loyalty_impl(uuid,integer,text,uuid,numeric,text) to authenticated, service_role;
revoke all on function public.retail_adjust_loyalty(uuid,integer,text,uuid,numeric,text) from public, anon;
grant execute on function public.retail_adjust_loyalty(uuid,integer,text,uuid,numeric,text) to authenticated, service_role;

-- Atomic stock transfer executor. One RPC call either moves every item and writes both ledger sides, or moves none.
create or replace function private.retail_complete_stock_transfer_impl(p_transfer_id uuid)
returns public.retail_stock_transfers
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_transfer public.retail_stock_transfers%rowtype;
  v_item record;
  v_source public.retail_inventory_levels%rowtype;
  v_available numeric;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;

  select * into v_transfer from public.retail_stock_transfers
  where id = p_transfer_id and user_id = v_uid
  for update;
  if not found then raise exception 'Stock transfer not found'; end if;
  if v_transfer.status in ('completed','cancelled') then raise exception 'Stock transfer is already final'; end if;
  if v_transfer.from_location_id = v_transfer.to_location_id then raise exception 'Transfer locations must be different'; end if;
  if not exists (select 1 from public.retail_stock_transfer_items ti where ti.transfer_id = p_transfer_id and ti.user_id = v_uid) then
    raise exception 'Stock transfer has no items';
  end if;

  for v_item in
    select ti.* from public.retail_stock_transfer_items ti
    where ti.transfer_id = p_transfer_id and ti.user_id = v_uid
    order by ti.item_id
  loop
    select * into v_source from public.retail_inventory_levels il
    where il.user_id = v_uid and il.workspace_id = v_transfer.workspace_id
      and il.location_id = v_transfer.from_location_id and il.item_id = v_item.item_id
    for update;

    if not found then raise exception 'Insufficient stock for transfer item %', v_item.item_id; end if;
    v_available := coalesce(v_source.on_hand, 0) - coalesce(v_source.reserved, 0);
    if v_available < v_item.quantity then raise exception 'Insufficient available stock for transfer item %', v_item.item_id; end if;

    update public.retail_inventory_levels
    set on_hand = on_hand - v_item.quantity, updated_at = now()
    where id = v_source.id;

    insert into public.retail_inventory_levels(user_id, workspace_id, location_id, item_id, on_hand, reserved, updated_at)
    values (v_uid, v_transfer.workspace_id, v_transfer.to_location_id, v_item.item_id, v_item.quantity, 0, now())
    on conflict (workspace_id, item_id, coalesce(location_id, '00000000-0000-0000-0000-000000000000'::uuid))
    do update set on_hand = public.retail_inventory_levels.on_hand + excluded.on_hand, updated_at = now();

    insert into public.retail_inventory_movements(user_id, workspace_id, location_id, item_id, movement_type, quantity, reference_type, reference_id, note)
    values
      (v_uid, v_transfer.workspace_id, v_transfer.from_location_id, v_item.item_id, 'transfer_out', -v_item.quantity, 'stock_transfer', p_transfer_id::text, v_transfer.notes),
      (v_uid, v_transfer.workspace_id, v_transfer.to_location_id, v_item.item_id, 'transfer_in', v_item.quantity, 'stock_transfer', p_transfer_id::text, v_transfer.notes);

    update public.retail_stock_transfer_items
    set moved_quantity = v_item.quantity, updated_at = now()
    where id = v_item.id;
  end loop;

  perform pg_catalog.set_config('app.retail_transfer_executor', 'on', true);
  update public.retail_stock_transfers
  set status = 'completed', completed_at = now(), updated_at = now()
  where id = p_transfer_id
  returning * into v_transfer;
  return v_transfer;
end;
$$;

create or replace function public.retail_complete_stock_transfer(p_transfer_id uuid)
returns public.retail_stock_transfers
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.retail_complete_stock_transfer_impl(p_transfer_id);
end;
$$;

revoke all on function private.retail_complete_stock_transfer_impl(uuid) from public, anon;
grant execute on function private.retail_complete_stock_transfer_impl(uuid) to authenticated, service_role;
revoke all on function public.retail_complete_stock_transfer(uuid) from public, anon;
grant execute on function public.retail_complete_stock_transfer(uuid) to authenticated, service_role;
