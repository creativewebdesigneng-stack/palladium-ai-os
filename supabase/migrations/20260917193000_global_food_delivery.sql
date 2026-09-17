-- Blackstar Global Food Delivery webhook reconciliation boundary.
--
-- Food Delivery reuses Blackstar's existing provider connection, approval/runtime,
-- audit and retail external-order persistence. Do not create parallel connection
-- or operation stores here.
--
-- Webhook receipts are server-only infrastructure. They contain no raw webhook
-- bodies or provider credentials and are intentionally inaccessible to browser
-- roles. Failed reconciliation remains retryable; a receipt is only permanently
-- deduplicated after processed_at is set.

create table if not exists public.food_delivery_webhook_receipts (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null,
  environment text not null check (environment in ('sandbox','production')),
  dedupe_key text not null unique,
  event_type text not null,
  resource_id text,
  merchant_id text,
  occurred_at timestamptz,
  processing_started_at timestamptz,
  processed_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.food_delivery_webhook_receipts enable row level security;

-- Webhook verification/reconciliation runs server-side only. No anon or
-- authenticated policies are created, and Data API privileges are revoked.
revoke all on public.food_delivery_webhook_receipts from anon, authenticated;

grant select, insert, update, delete on public.food_delivery_webhook_receipts to service_role;

create index if not exists food_delivery_webhook_resource_idx
  on public.food_delivery_webhook_receipts(provider_id, resource_id, created_at desc);

create index if not exists food_delivery_webhook_retry_idx
  on public.food_delivery_webhook_receipts(provider_id, environment, processed_at, processing_started_at)
  where processed_at is null;
