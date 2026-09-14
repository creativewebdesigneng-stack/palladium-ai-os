-- Blackstar Retail Operations Hub
-- Owner-scoped operational data for shops, salons, barbers, local services and small retailers.

create or replace function public.retail_set_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create table public.retail_workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_name text not null check (char_length(business_name) between 1 and 160),
  business_type text not null default 'retail_store' check (business_type in ('retail_store','barber','salon','beauty','convenience','boutique','service_shop','ecommerce','mixed','other')),
  currency text not null default 'GBP' check (char_length(currency) between 3 and 8),
  timezone text not null default 'Europe/London',
  phone text,
  email text,
  address jsonb not null default '{}'::jsonb,
  ai_preferences jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index retail_workspaces_user_updated_idx on public.retail_workspaces(user_id, updated_at desc);

create table public.retail_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 140),
  kind text not null default 'store' check (kind in ('store','salon','barber','warehouse','office','online','other')),
  address jsonb not null default '{}'::jsonb,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index retail_locations_workspace_idx on public.retail_locations(workspace_id, active);
create index retail_locations_user_idx on public.retail_locations(user_id, updated_at desc);

create table public.retail_suppliers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 180),
  contact_name text,
  email text,
  phone text,
  website text,
  lead_time_days integer not null default 0 check (lead_time_days between 0 and 3650),
  minimum_order_amount numeric(14,2) not null default 0 check (minimum_order_amount >= 0),
  currency text not null default 'GBP',
  status text not null default 'active' check (status in ('active','paused','blocked','archived')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index retail_suppliers_workspace_idx on public.retail_suppliers(workspace_id, status, name);
create index retail_suppliers_user_idx on public.retail_suppliers(user_id, updated_at desc);

create table public.retail_catalog_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  supplier_id uuid references public.retail_suppliers(id) on delete set null,
  name text not null check (char_length(name) between 1 and 180),
  item_type text not null default 'product' check (item_type in ('product','service','supply')),
  sku text,
  barcode text,
  category text,
  description text,
  cost_price numeric(14,2) not null default 0 check (cost_price >= 0),
  sale_price numeric(14,2) not null default 0 check (sale_price >= 0),
  currency text not null default 'GBP',
  tax_rate numeric(7,4) not null default 0 check (tax_rate >= 0 and tax_rate <= 100),
  track_inventory boolean not null default true,
  reorder_point numeric(14,3) not null default 0 check (reorder_point >= 0),
  reorder_quantity numeric(14,3) not null default 0 check (reorder_quantity >= 0),
  service_duration_minutes integer check (service_duration_minutes is null or service_duration_minutes between 5 and 1440),
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index retail_catalog_workspace_sku_uq on public.retail_catalog_items(workspace_id, sku) where sku is not null and sku <> '';
create index retail_catalog_workspace_idx on public.retail_catalog_items(workspace_id, item_type, active, name);
create index retail_catalog_supplier_fk_idx on public.retail_catalog_items(supplier_id);
create index retail_catalog_user_idx on public.retail_catalog_items(user_id, updated_at desc);

create table public.retail_inventory_levels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  location_id uuid references public.retail_locations(id) on delete cascade,
  item_id uuid not null references public.retail_catalog_items(id) on delete cascade,
  on_hand numeric(14,3) not null default 0,
  reserved numeric(14,3) not null default 0 check (reserved >= 0),
  updated_at timestamptz not null default now()
);
create unique index retail_inventory_item_location_uq on public.retail_inventory_levels(workspace_id, item_id, coalesce(location_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index retail_inventory_workspace_idx on public.retail_inventory_levels(workspace_id, item_id);
create index retail_inventory_location_fk_idx on public.retail_inventory_levels(location_id);
create index retail_inventory_user_idx on public.retail_inventory_levels(user_id, updated_at desc);

create table public.retail_inventory_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  location_id uuid references public.retail_locations(id) on delete set null,
  item_id uuid not null references public.retail_catalog_items(id) on delete cascade,
  movement_type text not null check (movement_type in ('stock_in','sale','return','adjustment','waste','transfer_in','transfer_out','reservation','release')),
  quantity numeric(14,3) not null check (quantity <> 0),
  reference_type text,
  reference_id text,
  note text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index retail_inventory_movements_item_idx on public.retail_inventory_movements(item_id, occurred_at desc);
create index retail_inventory_movements_workspace_idx on public.retail_inventory_movements(workspace_id, occurred_at desc);
create index retail_inventory_movements_user_idx on public.retail_inventory_movements(user_id, occurred_at desc);

create table public.retail_purchase_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  supplier_id uuid references public.retail_suppliers(id) on delete set null,
  po_number text not null,
  status text not null default 'draft' check (status in ('draft','ordered','part_received','received','cancelled')),
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  tax numeric(14,2) not null default 0 check (tax >= 0),
  shipping numeric(14,2) not null default 0 check (shipping >= 0),
  total numeric(14,2) not null default 0 check (total >= 0),
  currency text not null default 'GBP',
  ordered_at timestamptz,
  expected_at timestamptz,
  received_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index retail_purchase_orders_number_uq on public.retail_purchase_orders(workspace_id, po_number);
create index retail_purchase_orders_workspace_idx on public.retail_purchase_orders(workspace_id, status, expected_at);
create index retail_purchase_orders_supplier_fk_idx on public.retail_purchase_orders(supplier_id);
create index retail_purchase_orders_user_idx on public.retail_purchase_orders(user_id, updated_at desc);

create table public.retail_staff (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  role text,
  phone text,
  email text,
  services text[] not null default '{}'::text[],
  working_hours jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index retail_staff_workspace_idx on public.retail_staff(workspace_id, active, name);
create index retail_staff_user_idx on public.retail_staff(user_id, updated_at desc);

create table public.retail_appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  location_id uuid references public.retail_locations(id) on delete set null,
  service_item_id uuid references public.retail_catalog_items(id) on delete set null,
  staff_id uuid references public.retail_staff(id) on delete set null,
  customer_name text not null,
  customer_phone text,
  customer_email text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null default 'booked' check (status in ('requested','booked','confirmed','checked_in','completed','cancelled','no_show')),
  source text not null default 'manual' check (source in ('manual','phone','web','walk_in','ai','integration')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index retail_appointments_workspace_time_idx on public.retail_appointments(workspace_id, starts_at);
create index retail_appointments_staff_time_idx on public.retail_appointments(staff_id, starts_at);
create index retail_appointments_user_idx on public.retail_appointments(user_id, updated_at desc);

create table public.retail_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  location_id uuid references public.retail_locations(id) on delete set null,
  order_number text not null,
  customer_name text,
  customer_phone text,
  customer_email text,
  channel text not null default 'store' check (channel in ('store','online','phone','marketplace','social','other')),
  status text not null default 'open' check (status in ('draft','open','confirmed','completed','cancelled','refunded')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','authorised','paid','part_refunded','refunded','failed')),
  fulfilment_status text not null default 'unfulfilled' check (fulfilment_status in ('unfulfilled','picking','packed','shipped','ready_for_collection','collected','delivered','returned')),
  line_items jsonb not null default '[]'::jsonb,
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  tax numeric(14,2) not null default 0 check (tax >= 0),
  shipping numeric(14,2) not null default 0 check (shipping >= 0),
  total numeric(14,2) not null default 0 check (total >= 0),
  currency text not null default 'GBP',
  shipping_address jsonb not null default '{}'::jsonb,
  carrier text,
  tracking_number text,
  placed_at timestamptz not null default now(),
  fulfilled_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index retail_orders_number_uq on public.retail_orders(workspace_id, order_number);
create index retail_orders_workspace_idx on public.retail_orders(workspace_id, status, placed_at desc);
create index retail_orders_fulfilment_idx on public.retail_orders(workspace_id, fulfilment_status, placed_at desc);
create index retail_orders_user_idx on public.retail_orders(user_id, updated_at desc);

create table public.retail_call_inbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  direction text not null default 'inbound' check (direction in ('inbound','outbound')),
  customer_name text,
  phone text,
  reason text,
  summary text,
  outcome text,
  status text not null default 'new' check (status in ('new','handled','follow_up','closed')),
  needs_follow_up boolean not null default false,
  appointment_id uuid references public.retail_appointments(id) on delete set null,
  source text not null default 'manual' check (source in ('manual','voice_studio','phone_provider','ai','integration')),
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index retail_call_inbox_workspace_idx on public.retail_call_inbox(workspace_id, status, received_at desc);
create index retail_call_inbox_appointment_fk_idx on public.retail_call_inbox(appointment_id);
create index retail_call_inbox_user_idx on public.retail_call_inbox(user_id, updated_at desc);

-- RLS and API privileges.
do $$
declare t text;
begin
  foreach t in array array['retail_workspaces','retail_locations','retail_suppliers','retail_catalog_items','retail_inventory_levels','retail_inventory_movements','retail_purchase_orders','retail_staff','retail_appointments','retail_orders','retail_call_inbox']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
    execute format('create policy %I_select_own on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t, t);
    execute format('create policy %I_delete_own on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t, t);
    execute format('create policy %I_update_own on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t, t);
  end loop;
end $$;

-- Inserts are explicit so child rows cannot point at another user's workspace.
create policy retail_workspaces_insert_own on public.retail_workspaces for insert to authenticated with check ((select auth.uid()) = user_id);

create policy retail_locations_insert_own on public.retail_locations for insert to authenticated with check (
  (select auth.uid()) = user_id and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid()))
);
create policy retail_suppliers_insert_own on public.retail_suppliers for insert to authenticated with check (
  (select auth.uid()) = user_id and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid()))
);
create policy retail_catalog_items_insert_own on public.retail_catalog_items for insert to authenticated with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid()))
  and (supplier_id is null or exists (select 1 from public.retail_suppliers s where s.id = supplier_id and s.workspace_id = retail_catalog_items.workspace_id and s.user_id = (select auth.uid())))
);
create policy retail_inventory_levels_insert_own on public.retail_inventory_levels for insert to authenticated with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.retail_catalog_items i where i.id = item_id and i.workspace_id = retail_inventory_levels.workspace_id and i.user_id = (select auth.uid()))
  and (location_id is null or exists (select 1 from public.retail_locations l where l.id = location_id and l.workspace_id = retail_inventory_levels.workspace_id and l.user_id = (select auth.uid())))
);
create policy retail_inventory_movements_insert_own on public.retail_inventory_movements for insert to authenticated with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.retail_catalog_items i where i.id = item_id and i.workspace_id = retail_inventory_movements.workspace_id and i.user_id = (select auth.uid()))
  and (location_id is null or exists (select 1 from public.retail_locations l where l.id = location_id and l.workspace_id = retail_inventory_movements.workspace_id and l.user_id = (select auth.uid())))
);
create policy retail_purchase_orders_insert_own on public.retail_purchase_orders for insert to authenticated with check (
  (select auth.uid()) = user_id and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid()))
  and (supplier_id is null or exists (select 1 from public.retail_suppliers s where s.id = supplier_id and s.workspace_id = retail_purchase_orders.workspace_id and s.user_id = (select auth.uid())))
);
create policy retail_staff_insert_own on public.retail_staff for insert to authenticated with check (
  (select auth.uid()) = user_id and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid()))
);
create policy retail_appointments_insert_own on public.retail_appointments for insert to authenticated with check (
  (select auth.uid()) = user_id and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid()))
);
create policy retail_orders_insert_own on public.retail_orders for insert to authenticated with check (
  (select auth.uid()) = user_id and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid()))
);
create policy retail_call_inbox_insert_own on public.retail_call_inbox for insert to authenticated with check (
  (select auth.uid()) = user_id and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid()))
);

-- Keep the inventory ledger append-only for authenticated clients.
revoke update, delete on table public.retail_inventory_movements from authenticated;
drop policy retail_inventory_movements_update_own on public.retail_inventory_movements;
drop policy retail_inventory_movements_delete_own on public.retail_inventory_movements;

-- Updated-at triggers.
do $$
declare t text;
begin
  foreach t in array array['retail_workspaces','retail_locations','retail_suppliers','retail_catalog_items','retail_inventory_levels','retail_purchase_orders','retail_staff','retail_appointments','retail_orders','retail_call_inbox']
  loop
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.retail_set_updated_at()', t, t);
  end loop;
end $$;
