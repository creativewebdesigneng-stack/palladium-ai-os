update public.plans set stripe_price_id = 'pro_monthly', stripe_price_id_yearly = 'pro_yearly', updated_at = now() where code = 'builder';

create table if not exists public.billing_webhook_events (
  event_id text primary key,
  type text not null,
  environment text not null,
  received_at timestamptz not null default now()
);

grant all on public.billing_webhook_events to service_role;
alter table public.billing_webhook_events enable row level security;