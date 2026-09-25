-- Marketplace refund amount reconciliation.
-- Keep order workflow status separate from cumulative provider refund truth.
alter table public.marketplace_orders
  add column if not exists refunded_pence bigint not null default 0,
  add column if not exists refund_state text not null default 'none';

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname='marketplace_orders_refunded_pence_check'
      and conrelid='public.marketplace_orders'::regclass
  ) then
    alter table public.marketplace_orders
      add constraint marketplace_orders_refunded_pence_check
      check (refunded_pence >= 0 and refunded_pence <= sale_price_pence);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname='marketplace_orders_refund_state_check'
      and conrelid='public.marketplace_orders'::regclass
  ) then
    alter table public.marketplace_orders
      add constraint marketplace_orders_refund_state_check
      check (refund_state in ('none','partial','full'));
  end if;
end $$;

create table if not exists public.marketplace_refund_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.marketplace_orders(id) on delete cascade,
  stripe_event_id text not null unique,
  stripe_charge_id text not null,
  stripe_payment_intent_id text not null,
  cumulative_refunded_pence bigint not null check (cumulative_refunded_pence > 0),
  currency text not null check (currency='GBP'),
  refund_state text not null check (refund_state in ('partial','full')),
  livemode boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists marketplace_refund_events_order_idx
  on public.marketplace_refund_events(order_id, created_at desc);

alter table public.marketplace_refund_events enable row level security;
alter table public.marketplace_refund_events force row level security;
revoke all on public.marketplace_refund_events from anon, authenticated;
grant select on public.marketplace_refund_events to authenticated;
grant all on public.marketplace_refund_events to service_role;

drop policy if exists marketplace_refund_events_parties_read on public.marketplace_refund_events;
create policy marketplace_refund_events_parties_read
  on public.marketplace_refund_events for select to authenticated
  using (exists (
    select 1 from public.marketplace_orders o
    where o.id=order_id
      and (o.buyer_id=(select auth.uid()) or o.seller_id=(select auth.uid()))
  ));
