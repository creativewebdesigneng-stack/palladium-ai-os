-- Blackstar Retail Hub: store-floor operations, stocktakes, staff time and customer credit.

-- Cover Retail foreign keys identified by Supabase performance advisors.
create index if not exists retail_appointments_location_fk_idx on public.retail_appointments(location_id);
create index if not exists retail_appointments_service_item_fk_idx on public.retail_appointments(service_item_id);
create index if not exists retail_inventory_levels_item_fk_idx on public.retail_inventory_levels(item_id);
create index if not exists retail_inventory_movements_location_fk_idx on public.retail_inventory_movements(location_id);
create index if not exists retail_orders_location_fk_idx on public.retail_orders(location_id);

create table public.retail_registers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  location_id uuid references public.retail_locations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 140),
  status text not null default 'active' check (status in ('active','paused','retired')),
  external_provider text,
  external_register_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index retail_registers_workspace_idx on public.retail_registers(workspace_id, status, name);
create index retail_registers_location_fk_idx on public.retail_registers(location_id);
create index retail_registers_user_idx on public.retail_registers(user_id, updated_at desc);

create table public.retail_cash_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  register_id uuid not null references public.retail_registers(id) on delete cascade,
  opened_by_staff_id uuid references public.retail_staff(id) on delete set null,
  closed_by_staff_id uuid references public.retail_staff(id) on delete set null,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  opening_float numeric(14,2) not null default 0 check (opening_float >= 0),
  expected_cash numeric(14,2),
  counted_cash numeric(14,2),
  cash_variance numeric(14,2),
  status text not null default 'open' check (status in ('open','closed','investigate')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index retail_cash_sessions_workspace_idx on public.retail_cash_sessions(workspace_id, status, opened_at desc);
create index retail_cash_sessions_register_fk_idx on public.retail_cash_sessions(register_id);
create index retail_cash_sessions_opened_staff_fk_idx on public.retail_cash_sessions(opened_by_staff_id);
create index retail_cash_sessions_closed_staff_fk_idx on public.retail_cash_sessions(closed_by_staff_id);
create index retail_cash_sessions_user_idx on public.retail_cash_sessions(user_id, updated_at desc);
create unique index retail_cash_sessions_one_open_uq on public.retail_cash_sessions(register_id) where status = 'open';

create table public.retail_stocktakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  location_id uuid references public.retail_locations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 180),
  status text not null default 'draft' check (status in ('draft','counting','review','completed','cancelled')),
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index retail_stocktakes_workspace_idx on public.retail_stocktakes(workspace_id, status, created_at desc);
create index retail_stocktakes_location_fk_idx on public.retail_stocktakes(location_id);
create index retail_stocktakes_user_idx on public.retail_stocktakes(user_id, updated_at desc);

create table public.retail_stocktake_lines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  stocktake_id uuid not null references public.retail_stocktakes(id) on delete cascade,
  item_id uuid not null references public.retail_catalog_items(id) on delete restrict,
  expected_quantity numeric(14,3),
  counted_quantity numeric(14,3),
  variance numeric(14,3),
  counted_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index retail_stocktake_lines_item_uq on public.retail_stocktake_lines(stocktake_id, item_id);
create index retail_stocktake_lines_workspace_idx on public.retail_stocktake_lines(workspace_id, stocktake_id);
create index retail_stocktake_lines_item_fk_idx on public.retail_stocktake_lines(item_id);
create index retail_stocktake_lines_user_idx on public.retail_stocktake_lines(user_id, updated_at desc);

create table public.retail_gift_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  code text not null,
  customer_name text,
  customer_email text,
  original_value numeric(14,2) not null default 0 check (original_value >= 0),
  balance numeric(14,2) not null default 0 check (balance >= 0),
  currency text not null default 'GBP',
  status text not null default 'active' check (status in ('active','redeemed','expired','void')),
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index retail_gift_cards_code_uq on public.retail_gift_cards(workspace_id, code);
create index retail_gift_cards_workspace_idx on public.retail_gift_cards(workspace_id, status, issued_at desc);
create index retail_gift_cards_user_idx on public.retail_gift_cards(user_id, updated_at desc);

create table public.retail_staff_shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  staff_id uuid not null references public.retail_staff(id) on delete cascade,
  location_id uuid references public.retail_locations(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  role text,
  status text not null default 'scheduled' check (status in ('scheduled','confirmed','completed','cancelled','absence')),
  break_minutes integer not null default 0 check (break_minutes between 0 and 1440),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index retail_staff_shifts_workspace_time_idx on public.retail_staff_shifts(workspace_id, starts_at);
create index retail_staff_shifts_staff_time_idx on public.retail_staff_shifts(staff_id, starts_at);
create index retail_staff_shifts_location_fk_idx on public.retail_staff_shifts(location_id);
create index retail_staff_shifts_user_idx on public.retail_staff_shifts(user_id, updated_at desc);

create table public.retail_time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  staff_id uuid not null references public.retail_staff(id) on delete cascade,
  shift_id uuid references public.retail_staff_shifts(id) on delete set null,
  location_id uuid references public.retail_locations(id) on delete set null,
  clock_in_at timestamptz not null,
  clock_out_at timestamptz,
  break_minutes integer not null default 0 check (break_minutes between 0 and 1440),
  status text not null default 'open' check (status in ('open','closed','adjusted','void')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (clock_out_at is null or clock_out_at >= clock_in_at)
);
create index retail_time_entries_workspace_time_idx on public.retail_time_entries(workspace_id, clock_in_at desc);
create index retail_time_entries_staff_time_idx on public.retail_time_entries(staff_id, clock_in_at desc);
create index retail_time_entries_shift_fk_idx on public.retail_time_entries(shift_id);
create index retail_time_entries_location_fk_idx on public.retail_time_entries(location_id);
create index retail_time_entries_user_idx on public.retail_time_entries(user_id, updated_at desc);
create unique index retail_time_entries_one_open_uq on public.retail_time_entries(staff_id) where status = 'open';

create table public.retail_booking_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  appointment_id uuid not null references public.retail_appointments(id) on delete cascade,
  channel text not null default 'sms' check (channel in ('sms','email','voice','whatsapp','in_app')),
  scheduled_for timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','sent','cancelled','failed','skipped')),
  template_key text,
  provider_message_id text,
  last_error text,
  sent_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index retail_booking_reminders_workspace_idx on public.retail_booking_reminders(workspace_id, status, scheduled_for);
create index retail_booking_reminders_appointment_fk_idx on public.retail_booking_reminders(appointment_id);
create index retail_booking_reminders_user_idx on public.retail_booking_reminders(user_id, updated_at desc);

-- RLS: owner scoped with workspace ownership enforced on inserts and updates.
do $$
declare t text;
begin
  foreach t in array array['retail_registers','retail_cash_sessions','retail_stocktakes','retail_stocktake_lines','retail_gift_cards','retail_staff_shifts','retail_time_entries','retail_booking_reminders']
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

-- Keep updated_at consistent.
do $$
declare t text;
begin
  foreach t in array array['retail_registers','retail_cash_sessions','retail_stocktakes','retail_stocktake_lines','retail_gift_cards','retail_staff_shifts','retail_time_entries','retail_booking_reminders']
  loop
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.retail_set_updated_at()', t, t);
  end loop;
end $$;
