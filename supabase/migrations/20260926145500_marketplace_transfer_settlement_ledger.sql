-- Marketplace destination-charge settlement truth.
-- A Stripe Transfer moves funds between Stripe accounts; it is NOT proof that
-- a connected seller's bank payout has completed.
create table if not exists public.marketplace_order_settlements (
  order_id uuid primary key references public.marketplace_orders(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete restrict,
  stripe_payment_intent_id text not null unique,
  stripe_charge_id text not null unique,
  stripe_connected_account_id text not null,
  stripe_transfer_id text unique,
  stripe_application_fee_id text unique,
  charge_pence bigint not null check (charge_pence > 0),
  transfer_pence bigint check (transfer_pence is null or transfer_pence > 0),
  transfer_reversed_pence bigint not null default 0 check (transfer_reversed_pence >= 0),
  application_fee_pence bigint check (application_fee_pence is null or application_fee_pence >= 0),
  application_fee_refunded_pence bigint not null default 0 check (application_fee_refunded_pence >= 0),
  currency text not null check (currency='GBP'),
  transfer_state text not null default 'pending'
    check (transfer_state in ('pending','transferred','partially_reversed','fully_reversed')),
  fee_state text not null default 'pending'
    check (fee_state in ('pending','collected','partially_refunded','refunded')),
  livemode boolean not null,
  last_event_id text not null,
  last_event_created_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketplace_settlement_events (
  stripe_event_id text primary key,
  event_type text not null,
  event_created_at timestamptz not null,
  order_id uuid not null references public.marketplace_orders(id) on delete cascade,
  stripe_charge_id text not null,
  stripe_transfer_id text,
  stripe_application_fee_id text,
  transfer_pence bigint,
  transfer_reversed_pence bigint,
  application_fee_pence bigint,
  application_fee_refunded_pence bigint,
  livemode boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists marketplace_settlement_events_order_idx
  on public.marketplace_settlement_events(order_id,event_created_at desc);

alter table public.marketplace_order_settlements enable row level security;
alter table public.marketplace_order_settlements force row level security;
alter table public.marketplace_settlement_events enable row level security;
alter table public.marketplace_settlement_events force row level security;
revoke all on public.marketplace_order_settlements,public.marketplace_settlement_events
  from anon,authenticated;
grant select on public.marketplace_order_settlements,public.marketplace_settlement_events
  to authenticated;
grant all on public.marketplace_order_settlements,public.marketplace_settlement_events
  to service_role;

create policy marketplace_order_settlements_parties_read
  on public.marketplace_order_settlements for select to authenticated
  using (exists (
    select 1 from public.marketplace_orders o
    where o.id=order_id
      and (o.buyer_id=(select auth.uid()) or o.seller_id=(select auth.uid()))
  ));
create policy marketplace_settlement_events_parties_read
  on public.marketplace_settlement_events for select to authenticated
  using (exists (
    select 1 from public.marketplace_orders o
    where o.id=order_id
      and (o.buyer_id=(select auth.uid()) or o.seller_id=(select auth.uid()))
  ));

create or replace function public.blackstar_reconcile_marketplace_settlement(
  p_event_id text,
  p_event_type text,
  p_event_created_at timestamptz,
  p_order_id uuid,
  p_seller_id uuid,
  p_payment_intent_id text,
  p_charge_id text,
  p_connected_account_id text,
  p_charge_pence bigint,
  p_transfer_id text,
  p_transfer_pence bigint,
  p_transfer_reversed_pence bigint,
  p_application_fee_id text,
  p_application_fee_pence bigint,
  p_application_fee_refunded_pence bigint,
  p_currency text,
  p_livemode boolean
) returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.marketplace_orders%rowtype;
  v_seller_account text;
  v_row public.marketplace_order_settlements%rowtype;
  v_transfer bigint;
  v_transfer_reversed bigint;
  v_fee bigint;
  v_fee_refunded bigint;
  v_transfer_state text;
  v_fee_state text;
begin
  if p_event_id is null or p_event_id !~ '^evt_[A-Za-z0-9]+$'
    or p_event_type not in (
      'charge.succeeded','transfer.created','transfer.updated','transfer.reversed',
      'application_fee.created','application_fee.refunded'
    )
    or p_event_created_at is null
    or p_payment_intent_id !~ '^pi_[A-Za-z0-9]+$'
    or p_charge_id !~ '^ch_[A-Za-z0-9]+$'
    or p_connected_account_id !~ '^acct_[A-Za-z0-9]+$'
    or p_charge_pence is null or p_charge_pence <= 0
    or p_currency <> 'GBP' or p_livemode is null
  then raise exception 'invalid marketplace settlement evidence'; end if;

  select * into v_order
  from public.marketplace_orders
  where id=p_order_id
  for update;
  if not found then raise exception 'marketplace settlement order not found'; end if;
  if v_order.seller_id<>p_seller_id
    or v_order.payment_provider<>'stripe'
    or v_order.stripe_payment_intent_id is distinct from p_payment_intent_id
    or v_order.sale_price_pence<>p_charge_pence
    or v_order.currency<>p_currency
  then raise exception 'marketplace settlement does not match authoritative order'; end if;

  select stripe_connected_account_id into v_seller_account
  from public.marketplace_seller_profiles
  where user_id=p_seller_id;
  if v_seller_account is null or v_seller_account<>p_connected_account_id
  then raise exception 'marketplace settlement connected account mismatch'; end if;

  if p_transfer_id is not null and p_transfer_id !~ '^tr_[A-Za-z0-9]+$'
    or p_application_fee_id is not null and p_application_fee_id !~ '^fee_[A-Za-z0-9]+$'
    or p_transfer_pence is not null and p_transfer_pence<>v_order.sale_price_pence
    or coalesce(p_transfer_reversed_pence,0)<0
    or p_transfer_pence is not null and coalesce(p_transfer_reversed_pence,0)>p_transfer_pence
    or p_application_fee_pence is not null and p_application_fee_pence<>v_order.platform_fee_pence
    or coalesce(p_application_fee_refunded_pence,0)<0
    or p_application_fee_pence is not null
       and coalesce(p_application_fee_refunded_pence,0)>p_application_fee_pence
  then raise exception 'marketplace settlement amounts or provider ids mismatch'; end if;

  select * into v_row
  from public.marketplace_order_settlements
  where order_id=p_order_id
  for update;

  if found then
    if v_row.seller_id<>p_seller_id
      or v_row.stripe_payment_intent_id<>p_payment_intent_id
      or v_row.stripe_charge_id<>p_charge_id
      or v_row.stripe_connected_account_id<>p_connected_account_id
      or v_row.charge_pence<>p_charge_pence
      or v_row.currency<>p_currency
      or v_row.livemode<>p_livemode
      or (v_row.stripe_transfer_id is not null and p_transfer_id is not null and v_row.stripe_transfer_id<>p_transfer_id)
      or (v_row.stripe_application_fee_id is not null and p_application_fee_id is not null and v_row.stripe_application_fee_id<>p_application_fee_id)
      or (v_row.transfer_pence is not null and p_transfer_pence is not null and v_row.transfer_pence<>p_transfer_pence)
      or (v_row.application_fee_pence is not null and p_application_fee_pence is not null and v_row.application_fee_pence<>p_application_fee_pence)
    then raise exception 'marketplace settlement identity conflict'; end if;

    v_transfer := coalesce(v_row.transfer_pence,p_transfer_pence);
    v_transfer_reversed := greatest(v_row.transfer_reversed_pence,coalesce(p_transfer_reversed_pence,0));
    v_fee := coalesce(v_row.application_fee_pence,p_application_fee_pence);
    v_fee_refunded := greatest(v_row.application_fee_refunded_pence,coalesce(p_application_fee_refunded_pence,0));

    if v_transfer is not null and v_transfer_reversed>v_transfer
      or v_fee is not null and v_fee_refunded>v_fee
    then raise exception 'marketplace settlement reversal exceeds provider amount'; end if;

    v_transfer_state := case
      when v_transfer is null then 'pending'
      when v_transfer_reversed=0 then 'transferred'
      when v_transfer_reversed<v_transfer then 'partially_reversed'
      else 'fully_reversed' end;
    v_fee_state := case
      when v_fee is null then 'pending'
      when v_fee_refunded=0 then 'collected'
      when v_fee_refunded<v_fee then 'partially_refunded'
      else 'refunded' end;

    update public.marketplace_order_settlements
      set stripe_transfer_id=coalesce(stripe_transfer_id,p_transfer_id),
          stripe_application_fee_id=coalesce(stripe_application_fee_id,p_application_fee_id),
          transfer_pence=v_transfer,
          transfer_reversed_pence=v_transfer_reversed,
          application_fee_pence=v_fee,
          application_fee_refunded_pence=v_fee_refunded,
          transfer_state=v_transfer_state,
          fee_state=v_fee_state,
          last_event_id=case when p_event_created_at>=last_event_created_at then p_event_id else last_event_id end,
          last_event_created_at=greatest(last_event_created_at,p_event_created_at),
          updated_at=now()
      where order_id=p_order_id;
  else
    v_transfer := p_transfer_pence;
    v_transfer_reversed := coalesce(p_transfer_reversed_pence,0);
    v_fee := p_application_fee_pence;
    v_fee_refunded := coalesce(p_application_fee_refunded_pence,0);
    v_transfer_state := case
      when v_transfer is null then 'pending'
      when v_transfer_reversed=0 then 'transferred'
      when v_transfer_reversed<v_transfer then 'partially_reversed'
      else 'fully_reversed' end;
    v_fee_state := case
      when v_fee is null then 'pending'
      when v_fee_refunded=0 then 'collected'
      when v_fee_refunded<v_fee then 'partially_refunded'
      else 'refunded' end;

    insert into public.marketplace_order_settlements(
      order_id,seller_id,stripe_payment_intent_id,stripe_charge_id,
      stripe_connected_account_id,stripe_transfer_id,stripe_application_fee_id,
      charge_pence,transfer_pence,transfer_reversed_pence,
      application_fee_pence,application_fee_refunded_pence,currency,
      transfer_state,fee_state,livemode,last_event_id,last_event_created_at
    ) values (
      p_order_id,p_seller_id,p_payment_intent_id,p_charge_id,
      p_connected_account_id,p_transfer_id,p_application_fee_id,
      p_charge_pence,v_transfer,v_transfer_reversed,
      v_fee,v_fee_refunded,p_currency,
      v_transfer_state,v_fee_state,p_livemode,p_event_id,p_event_created_at
    );
  end if;

  insert into public.marketplace_settlement_events(
    stripe_event_id,event_type,event_created_at,order_id,stripe_charge_id,
    stripe_transfer_id,stripe_application_fee_id,transfer_pence,
    transfer_reversed_pence,application_fee_pence,
    application_fee_refunded_pence,livemode
  ) values (
    p_event_id,p_event_type,p_event_created_at,p_order_id,p_charge_id,
    p_transfer_id,p_application_fee_id,p_transfer_pence,
    p_transfer_reversed_pence,p_application_fee_pence,
    p_application_fee_refunded_pence,p_livemode
  )
  on conflict (stripe_event_id) do nothing;

  return 'applied';
end;
$$;

revoke all on function public.blackstar_reconcile_marketplace_settlement(
  text,text,timestamptz,uuid,uuid,text,text,text,bigint,text,bigint,bigint,text,bigint,bigint,text,boolean
) from public,anon,authenticated;
grant execute on function public.blackstar_reconcile_marketplace_settlement(
  text,text,timestamptz,uuid,uuid,text,text,text,bigint,text,bigint,bigint,text,bigint,bigint,text,boolean
) to service_role;
