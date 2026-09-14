-- Blackstar Retail Operations Hub: performance indexes and advanced operations depth.

create index if not exists retail_appointments_location_fk_idx on public.retail_appointments(location_id);
create index if not exists retail_appointments_service_item_fk_idx on public.retail_appointments(service_item_id);
create index if not exists retail_inventory_levels_item_fk_idx on public.retail_inventory_levels(item_id);
create index if not exists retail_inventory_movements_location_fk_idx on public.retail_inventory_movements(location_id);
create index if not exists retail_orders_location_fk_idx on public.retail_orders(location_id);

create table if not exists public.retail_returns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  order_id uuid references public.retail_orders(id) on delete set null,
  return_number text not null,
  reason text,
  status text not null default 'requested' check (status in ('requested','approved','received','refunded','exchanged','rejected','cancelled')),
  resolution text check (resolution is null or resolution in ('refund','exchange','store_credit','repair','none')),
  line_items jsonb not null default '[]'::jsonb,
  refund_amount numeric(14,2) not null default 0 check (refund_amount >= 0),
  currency text not null default 'GBP',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists retail_returns_number_uq on public.retail_returns(workspace_id, return_number);
create index if not exists retail_returns_workspace_idx on public.retail_returns(workspace_id, status, created_at desc);
create index if not exists retail_returns_order_fk_idx on public.retail_returns(order_id);
create index if not exists retail_returns_user_idx on public.retail_returns(user_id, updated_at desc);

create table if not exists public.retail_promotions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  name text not null,
  code text,
  promotion_type text not null default 'percentage' check (promotion_type in ('percentage','fixed_amount','buy_x_get_y','bundle','loyalty','other')),
  value numeric(14,4) not null default 0 check (value >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true,
  conditions jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists retail_promotions_workspace_idx on public.retail_promotions(workspace_id, active, starts_at, ends_at);
create unique index if not exists retail_promotions_code_uq on public.retail_promotions(workspace_id, code) where code is not null and code <> '';
create index if not exists retail_promotions_user_idx on public.retail_promotions(user_id, updated_at desc);

create table if not exists public.retail_loyalty_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  customer_name text not null,
  customer_email text,
  customer_phone text,
  points_balance numeric(14,2) not null default 0 check (points_balance >= 0),
  lifetime_points numeric(14,2) not null default 0 check (lifetime_points >= 0),
  tier text not null default 'standard',
  status text not null default 'active' check (status in ('active','paused','closed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists retail_loyalty_workspace_idx on public.retail_loyalty_accounts(workspace_id, status, updated_at desc);
create index if not exists retail_loyalty_user_idx on public.retail_loyalty_accounts(user_id, updated_at desc);

create table if not exists public.retail_stock_transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  item_id uuid not null references public.retail_catalog_items(id) on delete restrict,
  from_location_id uuid references public.retail_locations(id) on delete restrict,
  to_location_id uuid references public.retail_locations(id) on delete restrict,
  quantity numeric(14,3) not null check (quantity > 0),
  status text not null default 'requested' check (status in ('requested','approved','in_transit','received','cancelled')),
  requested_at timestamptz not null default now(),
  received_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (from_location_id is distinct from to_location_id)
);
create index if not exists retail_stock_transfers_workspace_idx on public.retail_stock_transfers(workspace_id, status, requested_at desc);
create index if not exists retail_stock_transfers_item_fk_idx on public.retail_stock_transfers(item_id);
create index if not exists retail_stock_transfers_from_location_fk_idx on public.retail_stock_transfers(from_location_id);
create index if not exists retail_stock_transfers_to_location_fk_idx on public.retail_stock_transfers(to_location_id);
create index if not exists retail_stock_transfers_user_idx on public.retail_stock_transfers(user_id, updated_at desc);

create table if not exists public.retail_reorder_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  item_id uuid not null references public.retail_catalog_items(id) on delete cascade,
  supplier_id uuid references public.retail_suppliers(id) on delete set null,
  location_id uuid references public.retail_locations(id) on delete cascade,
  enabled boolean not null default true,
  min_available numeric(14,3) not null default 0 check (min_available >= 0),
  target_available numeric(14,3) not null default 0 check (target_available >= 0),
  max_order_quantity numeric(14,3) check (max_order_quantity is null or max_order_quantity > 0),
  lead_time_days integer not null default 0 check (lead_time_days between 0 and 3650),
  approval_required boolean not null default true,
  last_suggested_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists retail_reorder_rules_scope_uq on public.retail_reorder_rules(workspace_id, item_id, coalesce(location_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index if not exists retail_reorder_rules_supplier_fk_idx on public.retail_reorder_rules(supplier_id);
create index if not exists retail_reorder_rules_user_idx on public.retail_reorder_rules(user_id, updated_at desc);

create table if not exists public.retail_forecasts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  item_id uuid references public.retail_catalog_items(id) on delete cascade,
  forecast_type text not null default 'demand' check (forecast_type in ('demand','revenue','bookings','staffing','inventory')),
  horizon_days integer not null default 30 check (horizon_days between 1 and 730),
  predicted_value numeric(18,4) not null default 0,
  confidence numeric(6,5) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  basis jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists retail_forecasts_workspace_idx on public.retail_forecasts(workspace_id, forecast_type, generated_at desc);
create index if not exists retail_forecasts_item_fk_idx on public.retail_forecasts(item_id);
create index if not exists retail_forecasts_user_idx on public.retail_forecasts(user_id, generated_at desc);

do $$
declare t text;
begin
  foreach t in array array['retail_returns','retail_promotions','retail_loyalty_accounts','retail_stock_transfers','retail_reorder_rules','retail_forecasts']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
    execute format('create policy %I_select_own on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t, t);
    execute format('create policy %I_insert_own on public.%I for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid())))', t, t);
    execute format('create policy %I_update_own on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid())))', t, t);
    execute format('create policy %I_delete_own on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t, t);
  end loop;
end $$;

do $$
declare t text;
begin
  foreach t in array array['retail_returns','retail_promotions','retail_loyalty_accounts','retail_stock_transfers','retail_reorder_rules']
  loop
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.retail_set_updated_at()', t, t);
  end loop;
end $$;
