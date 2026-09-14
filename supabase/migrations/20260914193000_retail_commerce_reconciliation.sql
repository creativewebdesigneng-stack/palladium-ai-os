-- Blackstar Retail Hub: external commerce links, immutable tender ledger, and atomic till reconciliation.

create table public.retail_external_order_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  retail_order_id uuid not null references public.retail_orders(id) on delete cascade,
  provider text not null check (provider in ('shopify','square','stripe','other')),
  external_order_id text not null check (char_length(external_order_id) between 1 and 300),
  external_order_number text,
  external_updated_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index retail_external_order_links_provider_uq
  on public.retail_external_order_links(workspace_id, provider, external_order_id);
create index retail_external_order_links_order_fk_idx on public.retail_external_order_links(retail_order_id);
create index retail_external_order_links_user_idx on public.retail_external_order_links(user_id, updated_at desc);

create table public.retail_payment_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  order_id uuid references public.retail_orders(id) on delete set null,
  cash_session_id uuid references public.retail_cash_sessions(id) on delete set null,
  register_id uuid references public.retail_registers(id) on delete set null,
  provider text not null default 'manual' check (char_length(provider) between 1 and 80),
  external_payment_id text,
  event_type text not null check (event_type in ('sale','refund','chargeback','adjustment')),
  method text not null check (method in ('cash','card','gift_card','store_credit','bank_transfer','wallet','online','other')),
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'GBP' check (char_length(currency) between 3 and 8),
  status text not null default 'captured' check (status in ('pending','authorised','captured','failed','voided')),
  reference text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index retail_payment_events_workspace_time_idx on public.retail_payment_events(workspace_id, occurred_at desc);
create index retail_payment_events_order_fk_idx on public.retail_payment_events(order_id);
create index retail_payment_events_session_fk_idx on public.retail_payment_events(cash_session_id);
create index retail_payment_events_register_fk_idx on public.retail_payment_events(register_id);
create index retail_payment_events_user_idx on public.retail_payment_events(user_id, occurred_at desc);
create unique index retail_payment_events_external_uq
  on public.retail_payment_events(workspace_id, provider, external_payment_id)
  where external_payment_id is not null and external_payment_id <> '';

create table public.retail_reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  cash_session_id uuid not null references public.retail_cash_sessions(id) on delete restrict,
  register_id uuid not null references public.retail_registers(id) on delete restrict,
  reconciled_by_staff_id uuid references public.retail_staff(id) on delete set null,
  opening_float numeric(14,2) not null,
  cash_sales numeric(14,2) not null default 0,
  cash_refunds numeric(14,2) not null default 0,
  cash_adjustments numeric(14,2) not null default 0,
  expected_cash numeric(14,2) not null,
  counted_cash numeric(14,2) not null,
  cash_variance numeric(14,2) not null,
  non_cash_captured numeric(14,2) not null default 0,
  tolerance numeric(14,2) not null default 0.01 check (tolerance >= 0),
  status text not null check (status in ('balanced','review')),
  details jsonb not null default '{}'::jsonb,
  reconciled_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index retail_reconciliation_runs_session_uq on public.retail_reconciliation_runs(cash_session_id);
create index retail_reconciliation_runs_workspace_idx on public.retail_reconciliation_runs(workspace_id, reconciled_at desc);
create index retail_reconciliation_runs_register_fk_idx on public.retail_reconciliation_runs(register_id);
create index retail_reconciliation_runs_staff_fk_idx on public.retail_reconciliation_runs(reconciled_by_staff_id);
create index retail_reconciliation_runs_user_idx on public.retail_reconciliation_runs(user_id, reconciled_at desc);

-- Owner-scoped data. Payment/reconciliation histories are immutable to authenticated clients.
foreach_not_supported_here:
-- placeholder label is removed below by the DO block; kept out of executable SQL.
