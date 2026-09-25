-- Stripe provider dispute/chargeback reconciliation for Marketplace orders.
create table if not exists public.marketplace_provider_disputes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.marketplace_orders(id) on delete cascade,
  stripe_dispute_id text not null unique,
  stripe_charge_id text not null,
  stripe_payment_intent_id text not null,
  amount_pence bigint not null check (amount_pence > 0),
  currency text not null check (currency='GBP'),
  status text not null check (status in (
    'warning_needs_response','warning_under_review','warning_closed',
    'needs_response','under_review','won','lost','prevented'
  )),
  reason text,
  livemode boolean not null,
  original_order_status text not null check (original_order_status in (
    'pending','paid','fulfilled','refunded','disputed','cancelled'
  )),
  evidence_due_at timestamptz,
  last_stripe_event_id text not null,
  provider_created_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists marketplace_provider_disputes_order_idx
  on public.marketplace_provider_disputes(order_id, updated_at desc);

alter table public.marketplace_provider_disputes enable row level security;
alter table public.marketplace_provider_disputes force row level security;
revoke all on public.marketplace_provider_disputes from anon, authenticated;
grant select on public.marketplace_provider_disputes to authenticated;
grant all on public.marketplace_provider_disputes to service_role;

drop policy if exists marketplace_provider_disputes_parties_read on public.marketplace_provider_disputes;
create policy marketplace_provider_disputes_parties_read
  on public.marketplace_provider_disputes for select to authenticated
  using (exists (
    select 1 from public.marketplace_orders o
    where o.id=order_id
      and (o.buyer_id=(select auth.uid()) or o.seller_id=(select auth.uid()))
  ));

create or replace function public.blackstar_reconcile_marketplace_provider_dispute(
  p_stripe_event_id text,
  p_stripe_dispute_id text,
  p_stripe_charge_id text,
  p_stripe_payment_intent_id text,
  p_amount_pence bigint,
  p_currency text,
  p_status text,
  p_reason text,
  p_livemode boolean,
  p_evidence_due_at timestamptz,
  p_provider_created_at timestamptz
) returns table(order_id uuid, order_status text, dispute_status text, ignored_stale boolean)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.marketplace_orders%rowtype;
  v_existing public.marketplace_provider_disputes%rowtype;
  v_original_status text;
  v_next_status text;
  v_terminal_existing boolean;
  v_terminal_incoming boolean;
begin
  if p_stripe_event_id is null or p_stripe_event_id !~ '^evt_[A-Za-z0-9]+$'
    or p_stripe_dispute_id is null or p_stripe_dispute_id !~ '^(du|dp)_[A-Za-z0-9]+$'
    or p_stripe_charge_id is null or p_stripe_charge_id !~ '^ch_[A-Za-z0-9]+$'
    or p_stripe_payment_intent_id is null or p_stripe_payment_intent_id !~ '^pi_[A-Za-z0-9]+$'
    or p_amount_pence is null or p_amount_pence <= 0
    or p_currency <> 'GBP'
    or p_status not in (
      'warning_needs_response','warning_under_review','warning_closed',
      'needs_response','under_review','won','lost','prevented'
    )
  then raise exception 'invalid provider dispute evidence'; end if;

  select * into v_order
  from public.marketplace_orders
  where stripe_payment_intent_id=p_stripe_payment_intent_id
  for update;
  if not found then return; end if;
  if v_order.payment_provider is distinct from 'stripe'
    or v_order.sale_price_pence < p_amount_pence
  then raise exception 'provider dispute does not match Marketplace order'; end if;

  select * into v_existing
  from public.marketplace_provider_disputes
  where stripe_dispute_id=p_stripe_dispute_id
  for update;

  if found then
    if v_existing.order_id<>v_order.id
      or v_existing.stripe_charge_id<>p_stripe_charge_id
      or v_existing.stripe_payment_intent_id<>p_stripe_payment_intent_id
      or v_existing.amount_pence<>p_amount_pence
      or v_existing.currency<>p_currency
      or v_existing.livemode<>p_livemode
    then raise exception 'provider dispute identity conflict'; end if;
    v_original_status := v_existing.original_order_status;
    v_terminal_existing := v_existing.status in ('warning_closed','won','lost','prevented');
    v_terminal_incoming := p_status in ('warning_closed','won','lost','prevented');
    if v_terminal_existing and not v_terminal_incoming then
      return query select v_order.id,v_order.status,v_existing.status,true;
      return;
    end if;
    if v_terminal_existing and v_terminal_incoming and v_existing.status<>p_status then
      raise exception 'provider dispute terminal status conflict';
    end if;
  else
    v_original_status := v_order.status;
  end if;

  insert into public.marketplace_provider_disputes (
    order_id,stripe_dispute_id,stripe_charge_id,stripe_payment_intent_id,
    amount_pence,currency,status,reason,livemode,original_order_status,
    evidence_due_at,last_stripe_event_id,provider_created_at,updated_at
  ) values (
    v_order.id,p_stripe_dispute_id,p_stripe_charge_id,p_stripe_payment_intent_id,
    p_amount_pence,p_currency,p_status,nullif(p_reason,''),p_livemode,v_original_status,
    p_evidence_due_at,p_stripe_event_id,p_provider_created_at,now()
  )
  on conflict (stripe_dispute_id) do update set
    status=excluded.status,
    reason=excluded.reason,
    evidence_due_at=excluded.evidence_due_at,
    last_stripe_event_id=excluded.last_stripe_event_id,
    provider_created_at=coalesce(public.marketplace_provider_disputes.provider_created_at,excluded.provider_created_at),
    updated_at=now();

  v_next_status := v_order.status;
  if p_status in ('needs_response','under_review','lost')
    and v_order.status in ('paid','fulfilled')
  then
    v_next_status := 'disputed';
  elsif p_status in ('won','prevented','warning_closed')
    and v_order.status='disputed'
    and v_original_status in ('paid','fulfilled')
  then
    v_next_status := case
      when coalesce(v_order.refund_state,'none')='full' then 'refunded'
      else v_original_status
    end;
  end if;

  if v_next_status<>v_order.status then
    update public.marketplace_orders
      set status=v_next_status
      where id=v_order.id and status=v_order.status;
    if not found then raise exception 'Marketplace order dispute state changed concurrently'; end if;
  end if;

  return query select v_order.id,v_next_status,p_status,false;
end;
$$;

revoke all on function public.blackstar_reconcile_marketplace_provider_dispute(
  text,text,text,text,bigint,text,text,text,boolean,timestamptz,timestamptz
) from public, anon, authenticated;
grant execute on function public.blackstar_reconcile_marketplace_provider_dispute(
  text,text,text,text,bigint,text,text,text,boolean,timestamptz,timestamptz
) to service_role;
