-- Stripe provider dispute / chargeback truth for Marketplace purchases.
-- User-opened Marketplace support disputes stay in marketplace_disputes; this
-- ledger is only for signed payment-provider disputes.
alter table public.marketplace_orders
  drop constraint if exists marketplace_orders_status_check;
alter table public.marketplace_orders
  add constraint marketplace_orders_status_check
  check (status in ('pending','paid','fulfilled','refunded','disputed','charged_back','cancelled'));

create table if not exists public.marketplace_provider_disputes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.marketplace_orders(id) on delete cascade,
  stripe_dispute_id text not null unique,
  stripe_charge_id text not null,
  stripe_payment_intent_id text not null,
  disputed_pence bigint not null check (disputed_pence > 0),
  currency text not null check (currency='GBP'),
  provider_status text not null check (provider_status in (
    'warning_needs_response','warning_under_review','warning_closed',
    'needs_response','under_review','won','lost','prevented'
  )),
  reason text,
  evidence_due_at timestamptz,
  pre_dispute_status text check (pre_dispute_status in ('paid','fulfilled')),
  livemode boolean not null,
  last_event_id text not null,\n  last_event_created_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists marketplace_provider_disputes_event_idx
  on public.marketplace_provider_disputes(last_event_id);
create index if not exists marketplace_provider_disputes_order_idx
  on public.marketplace_provider_disputes(order_id, updated_at desc);

create table if not exists public.marketplace_provider_dispute_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.marketplace_orders(id) on delete cascade,
  stripe_dispute_id text not null,
  stripe_event_id text not null unique,\n  stripe_event_created_at timestamptz not null,
  provider_status text not null,
  disputed_pence bigint not null check (disputed_pence > 0),
  currency text not null check (currency='GBP'),
  livemode boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists marketplace_provider_dispute_events_order_idx
  on public.marketplace_provider_dispute_events(order_id, created_at desc);
create index if not exists marketplace_provider_dispute_events_dispute_idx
  on public.marketplace_provider_dispute_events(stripe_dispute_id, created_at desc);

alter table public.marketplace_provider_disputes enable row level security;
alter table public.marketplace_provider_disputes force row level security;
alter table public.marketplace_provider_dispute_events enable row level security;
alter table public.marketplace_provider_dispute_events force row level security;

revoke all on public.marketplace_provider_disputes, public.marketplace_provider_dispute_events
  from anon, authenticated;
grant select on public.marketplace_provider_disputes, public.marketplace_provider_dispute_events
  to authenticated;
grant all on public.marketplace_provider_disputes, public.marketplace_provider_dispute_events
  to service_role;

drop policy if exists marketplace_provider_disputes_parties_read on public.marketplace_provider_disputes;
create policy marketplace_provider_disputes_parties_read
  on public.marketplace_provider_disputes for select to authenticated
  using (exists (
    select 1 from public.marketplace_orders o
    where o.id=order_id
      and (o.buyer_id=(select auth.uid()) or o.seller_id=(select auth.uid()))
  ));

drop policy if exists marketplace_provider_dispute_events_parties_read on public.marketplace_provider_dispute_events;
create policy marketplace_provider_dispute_events_parties_read
  on public.marketplace_provider_dispute_events for select to authenticated
  using (exists (
    select 1 from public.marketplace_orders o
    where o.id=order_id
      and (o.buyer_id=(select auth.uid()) or o.seller_id=(select auth.uid()))
  ));
