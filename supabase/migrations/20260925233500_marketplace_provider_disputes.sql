-- Atomic Stripe provider dispute/chargeback reconciliation for Marketplace orders.
-- User-opened Marketplace support disputes remain a separate workflow.
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
  last_event_id text not null,
  last_event_type text not null,
  last_event_created_at timestamptz not null,
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
  stripe_event_id text not null unique,
  stripe_event_type text not null,
  stripe_event_created_at timestamptz not null,
  provider_status text not null,
  disputed_pence bigint not null check (disputed_pence > 0),
  currency text not null check (currency='GBP'),
  livemode boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists marketplace_provider_dispute_events_order_idx
  on public.marketplace_provider_dispute_events(order_id, created_at desc);
create index if not exists marketplace_provider_dispute_events_dispute_idx
  on public.marketplace_provider_dispute_events(stripe_dispute_id, stripe_event_created_at desc);

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

create or replace function public.blackstar_reconcile_marketplace_provider_dispute(
  p_stripe_event_id text,
  p_stripe_event_type text,
  p_stripe_event_created_at timestamptz,
  p_stripe_dispute_id text,
  p_stripe_charge_id text,
  p_stripe_payment_intent_id text,
  p_disputed_pence bigint,
  p_currency text,
  p_provider_status text,
  p_reason text,
  p_livemode boolean,
  p_evidence_due_at timestamptz
) returns table(order_id uuid, order_status text, dispute_status text, ignored_stale boolean)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.marketplace_orders%rowtype;
  v_existing public.marketplace_provider_disputes%rowtype;
  v_event public.marketplace_provider_dispute_events%rowtype;
  v_pre_status text;
  v_target_status text;
  v_stale boolean := false;
  v_existing_terminal boolean := false;
  v_incoming_terminal boolean := false;
begin
  if p_stripe_event_id is null or p_stripe_event_id !~ '^evt_[A-Za-z0-9]+$'
    or p_stripe_event_type not in (
      'charge.dispute.created','charge.dispute.updated','charge.dispute.closed',
      'charge.dispute.funds_withdrawn','charge.dispute.funds_reinstated'
    )
    or p_stripe_event_created_at is null
    or p_stripe_dispute_id is null or p_stripe_dispute_id !~ '^(du|dp)_[A-Za-z0-9]+$'
    or p_stripe_charge_id is null or p_stripe_charge_id !~ '^ch_[A-Za-z0-9]+$'
    or p_stripe_payment_intent_id is null or p_stripe_payment_intent_id !~ '^pi_[A-Za-z0-9]+$'
    or p_disputed_pence is null or p_disputed_pence <= 0
    or p_currency <> 'GBP'
    or p_provider_status not in (
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
    or v_order.currency is distinct from p_currency
    or v_order.sale_price_pence < p_disputed_pence
  then raise exception 'provider dispute does not match Marketplace order'; end if;

  select * into v_existing
  from public.marketplace_provider_disputes
  where stripe_dispute_id=p_stripe_dispute_id
  for update;

  if found then
    if v_existing.order_id<>v_order.id
      or v_existing.stripe_charge_id<>p_stripe_charge_id
      or v_existing.stripe_payment_intent_id<>p_stripe_payment_intent_id
      or v_existing.disputed_pence<>p_disputed_pence
      or v_existing.currency<>p_currency
      or v_existing.livemode<>p_livemode
    then raise exception 'provider dispute identity conflict'; end if;
    v_pre_status := v_existing.pre_dispute_status;
    v_existing_terminal := v_existing.provider_status in ('warning_closed','won','lost','prevented');
    v_incoming_terminal := p_provider_status in ('warning_closed','won','lost','prevented');

    if p_stripe_event_created_at < v_existing.last_event_created_at then
      v_stale := true;
    elsif p_stripe_event_created_at = v_existing.last_event_created_at
      and p_stripe_event_id <> v_existing.last_event_id
    then
      if v_existing_terminal and not v_incoming_terminal then
        v_stale := true;
      elsif v_existing_terminal and v_incoming_terminal
        and v_existing.provider_status<>p_provider_status
      then
        raise exception 'provider dispute terminal status conflict';
      elsif v_existing.provider_status=p_provider_status then
        v_stale := true;
      elsif not v_existing_terminal and v_incoming_terminal then
        v_stale := false;
      else
        -- Stripe event timestamps have one-second resolution. Use a stable
        -- tie-break only for two non-terminal events in the same second.
        v_stale := p_stripe_event_id < v_existing.last_event_id;
      end if;
    end if;
  else
    v_pre_status := case
      when v_order.status in ('paid','fulfilled') then v_order.status
      when v_order.fulfilled_at is not null then 'fulfilled'
      when v_order.paid_at is not null then 'paid'
      else null
    end;
  end if;

  insert into public.marketplace_provider_dispute_events (
    order_id,stripe_dispute_id,stripe_event_id,stripe_event_type,
    stripe_event_created_at,provider_status,disputed_pence,currency,livemode
  ) values (
    v_order.id,p_stripe_dispute_id,p_stripe_event_id,p_stripe_event_type,
    p_stripe_event_created_at,p_provider_status,p_disputed_pence,p_currency,p_livemode
  )
  on conflict (stripe_event_id) do nothing;

  if not found then
    select * into v_event from public.marketplace_provider_dispute_events
      where stripe_event_id=p_stripe_event_id;
    if not found
      or v_event.order_id<>v_order.id
      or v_event.stripe_dispute_id<>p_stripe_dispute_id
      or v_event.stripe_event_type<>p_stripe_event_type
      or v_event.provider_status<>p_provider_status
      or v_event.disputed_pence<>p_disputed_pence
      or v_event.currency<>p_currency
      or v_event.livemode<>p_livemode
    then raise exception 'provider dispute event identity conflict'; end if;
  end if;

  if v_stale then
    return query select v_order.id,v_order.status,v_existing.provider_status,true;
    return;
  end if;

  insert into public.marketplace_provider_disputes (
    order_id,stripe_dispute_id,stripe_charge_id,stripe_payment_intent_id,
    disputed_pence,currency,provider_status,reason,evidence_due_at,
    pre_dispute_status,livemode,last_event_id,last_event_type,last_event_created_at,updated_at
  ) values (
    v_order.id,p_stripe_dispute_id,p_stripe_charge_id,p_stripe_payment_intent_id,
    p_disputed_pence,p_currency,p_provider_status,nullif(p_reason,''),p_evidence_due_at,
    v_pre_status,p_livemode,p_stripe_event_id,p_stripe_event_type,p_stripe_event_created_at,now()
  )
  on conflict (stripe_dispute_id) do update set
    provider_status=excluded.provider_status,
    reason=excluded.reason,
    evidence_due_at=excluded.evidence_due_at,
    last_event_id=excluded.last_event_id,
    last_event_type=excluded.last_event_type,
    last_event_created_at=excluded.last_event_created_at,
    updated_at=now();

  v_target_status := v_order.status;
  if p_provider_status in (
    'warning_needs_response','warning_under_review','needs_response','under_review'
  ) then
    if v_order.status in ('paid','fulfilled') then
      v_target_status := 'disputed';
    elsif v_order.status not in ('disputed','refunded','charged_back') then
      raise exception 'Marketplace order cannot enter provider dispute from current state';
    end if;
  elsif p_provider_status='lost' then
    if coalesce(v_order.refund_state,'none')='full' or v_order.status='refunded' then
      v_target_status := 'refunded';
    elsif v_order.status in ('paid','fulfilled','disputed','charged_back') then
      v_target_status := 'charged_back';
    else
      raise exception 'Marketplace order cannot record lost provider dispute from current state';
    end if;
  else
    if coalesce(v_order.refund_state,'none')='full' or v_order.status='refunded' then
      v_target_status := 'refunded';
    elsif v_order.status='disputed' then
      if v_pre_status not in ('paid','fulfilled') then
        raise exception 'provider dispute cannot restore order without pre-dispute state';
      end if;
      v_target_status := v_pre_status;
    elsif v_order.status not in ('paid','fulfilled','charged_back') then
      raise exception 'Marketplace order cannot close provider dispute from current state';
    end if;
  end if;

  if v_target_status<>v_order.status then
    update public.marketplace_orders
      set status=v_target_status
      where id=v_order.id and status=v_order.status;
    if not found then raise exception 'Marketplace order dispute state changed concurrently'; end if;
  end if;

  return query select v_order.id,v_target_status,p_provider_status,false;
end;
$$;

revoke all on function public.blackstar_reconcile_marketplace_provider_dispute(
  text,text,timestamptz,text,text,text,bigint,text,text,text,boolean,timestamptz
) from public, anon, authenticated;
grant execute on function public.blackstar_reconcile_marketplace_provider_dispute(
  text,text,timestamptz,text,text,text,bigint,text,text,text,boolean,timestamptz
) to service_role;
