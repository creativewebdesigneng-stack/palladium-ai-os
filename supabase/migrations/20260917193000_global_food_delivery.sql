-- Blackstar Global Food Delivery persistence boundary.
-- Provider credentials are never stored here: credential_ref points at Blackstar's
-- existing integration/secret-management layer.

create table if not exists public.food_delivery_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_id text not null,
  environment text not null check (environment in ('sandbox','production')),
  status text not null check (status in ('available','connected','needs_access','unavailable')),
  credential_ref text,
  merchant_location_id text,
  granted_capabilities text[] not null default '{}',
  capability_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider_id, environment, merchant_location_id)
);

create table if not exists public.food_delivery_operations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null references public.food_delivery_connections(id) on delete cascade,
  request_id text not null,
  capability text not null,
  status text not null check (status in ('pending_approval','approved','executing','succeeded','failed','cancelled')),
  approval_request_id uuid,
  provider_resource_id text,
  input_fingerprint text not null,
  result_metadata jsonb not null default '{}'::jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, request_id)
);

create table if not exists public.food_delivery_webhook_receipts (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null,
  environment text not null check (environment in ('sandbox','production')),
  dedupe_key text not null unique,
  event_type text not null,
  resource_id text,
  merchant_id text,
  occurred_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.food_delivery_connections enable row level security;
alter table public.food_delivery_operations enable row level security;
alter table public.food_delivery_webhook_receipts enable row level security;

create policy "food_delivery_connections_select_own"
  on public.food_delivery_connections for select to authenticated
  using (auth.uid() = user_id);
create policy "food_delivery_connections_insert_own"
  on public.food_delivery_connections for insert to authenticated
  with check (auth.uid() = user_id);
create policy "food_delivery_connections_update_own"
  on public.food_delivery_connections for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "food_delivery_connections_delete_own"
  on public.food_delivery_connections for delete to authenticated
  using (auth.uid() = user_id);

create policy "food_delivery_operations_select_own"
  on public.food_delivery_operations for select to authenticated
  using (auth.uid() = user_id);
create policy "food_delivery_operations_insert_own"
  on public.food_delivery_operations for insert to authenticated
  with check (
    auth.uid() = user_id and exists (
      select 1 from public.food_delivery_connections c
      where c.id = connection_id and c.user_id = auth.uid()
    )
  );
create policy "food_delivery_operations_update_own"
  on public.food_delivery_operations for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Webhook receipts are intentionally service-role only. No authenticated/anon policy.
revoke all on public.food_delivery_webhook_receipts from anon, authenticated;

grant select, insert, update, delete on public.food_delivery_connections to authenticated;
grant select, insert, update on public.food_delivery_operations to authenticated;

create index if not exists food_delivery_connections_user_idx
  on public.food_delivery_connections(user_id, provider_id);
create index if not exists food_delivery_operations_connection_idx
  on public.food_delivery_operations(connection_id, created_at desc);
create index if not exists food_delivery_operations_approval_idx
  on public.food_delivery_operations(approval_request_id) where approval_request_id is not null;
create index if not exists food_delivery_webhook_resource_idx
  on public.food_delivery_webhook_receipts(provider_id, resource_id, created_at desc);
