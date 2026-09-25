-- Govern buyer-opened Marketplace support disputes independently from
-- Stripe/card-network provider disputes. Financial order state remains provider-led.
alter table public.marketplace_disputes
  add column if not exists seller_response text,
  add column if not exists seller_responded_at timestamptz,
  add column if not exists resolved_by uuid references auth.users(id) on delete set null,
  add column if not exists resolved_at timestamptz,
  add column if not exists refund_provider_id text,
  add column if not exists refund_requested_at timestamptz;

create unique index if not exists marketplace_disputes_one_active_per_order_idx
  on public.marketplace_disputes(order_id)
  where status in ('open','seller_response','under_review');

create or replace function public.blackstar_open_marketplace_dispute(
  p_order_id uuid,
  p_reason text,
  p_details text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_order public.marketplace_orders%rowtype;
  v_existing uuid;
  v_id uuid;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if p_reason not in (
    'not_received','not_as_described','access_issue','license_issue',
    'refund_request','fraud','other'
  ) then raise exception 'invalid Marketplace dispute reason'; end if;
  if p_details is null or char_length(btrim(p_details)) not between 10 and 5000
  then raise exception 'Marketplace dispute details must be 10 to 5000 characters'; end if;

  select * into v_order
  from public.marketplace_orders
  where id=p_order_id
  for update;
  if not found or v_order.buyer_id<>v_user
  then raise exception 'Marketplace order is not available to this buyer'; end if;
  if v_order.status not in ('paid','fulfilled','disputed')
  then raise exception 'Marketplace order is not eligible for a support dispute'; end if;

  select id into v_existing
  from public.marketplace_disputes
  where order_id=p_order_id
    and status in ('open','seller_response','under_review')
  limit 1;
  if v_existing is not null
  then raise exception 'An active Marketplace support dispute already exists for this order'; end if;

  insert into public.marketplace_disputes(order_id,opened_by,reason,details,status)
  values(p_order_id,v_user,p_reason,btrim(p_details),'open')
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.blackstar_respond_marketplace_dispute(
  p_dispute_id uuid,
  p_response text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_case public.marketplace_disputes%rowtype;
  v_order public.marketplace_orders%rowtype;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if p_response is null or char_length(btrim(p_response)) not between 3 and 5000
  then raise exception 'Seller response must be 3 to 5000 characters'; end if;

  select * into v_case
  from public.marketplace_disputes
  where id=p_dispute_id
  for update;
  if not found or v_case.status not in ('open','seller_response')
  then raise exception 'Marketplace support dispute is not open for seller response'; end if;

  select * into v_order
  from public.marketplace_orders
  where id=v_case.order_id;
  if not found or v_order.seller_id<>v_user
  then raise exception 'Marketplace support dispute is not available to this seller'; end if;

  update public.marketplace_disputes
  set status='seller_response',
      seller_response=btrim(p_response),
      seller_responded_at=now(),
      updated_at=now()
  where id=p_dispute_id;
  return p_dispute_id;
end;
$$;

create or replace function public.blackstar_resolve_marketplace_dispute(
  p_dispute_id uuid,
  p_decision text,
  p_notes text,
  p_reviewed_by uuid,
  p_refund_provider_id text default null
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_case public.marketplace_disputes%rowtype;
begin
  if p_decision not in ('resolved_buyer','resolved_seller','closed')
  then raise exception 'invalid Marketplace support dispute decision'; end if;
  if p_notes is null or char_length(btrim(p_notes)) not between 3 and 5000
  then raise exception 'resolution notes must be 3 to 5000 characters'; end if;
  if p_reviewed_by is null or not exists(
    select 1 from public.marketplace_admins where user_id=p_reviewed_by
  ) then raise exception 'Marketplace administrator access required'; end if;
  if p_decision='resolved_buyer' then
    if p_refund_provider_id is null or p_refund_provider_id !~ '^re_[A-Za-z0-9]+$'
    then raise exception 'buyer resolution requires a verified provider refund request'; end if;
  elsif p_refund_provider_id is not null then
    raise exception 'refund provider reference is only valid for buyer resolution';
  end if;

  select * into v_case
  from public.marketplace_disputes
  where id=p_dispute_id
  for update;
  if not found or v_case.status not in ('open','seller_response','under_review')
  then raise exception 'Marketplace support dispute is no longer open'; end if;

  update public.marketplace_disputes
  set status=p_decision,
      resolution_notes=btrim(p_notes),
      resolved_by=p_reviewed_by,
      resolved_at=now(),
      refund_provider_id=case when p_decision='resolved_buyer' then p_refund_provider_id else null end,
      refund_requested_at=case when p_decision='resolved_buyer' then now() else null end,
      updated_at=now()
  where id=p_dispute_id;
  return p_dispute_id;
end;
$$;

revoke all on function public.blackstar_open_marketplace_dispute(uuid,text,text)
  from public, anon;
grant execute on function public.blackstar_open_marketplace_dispute(uuid,text,text)
  to authenticated, service_role;

revoke all on function public.blackstar_respond_marketplace_dispute(uuid,text)
  from public, anon;
grant execute on function public.blackstar_respond_marketplace_dispute(uuid,text)
  to authenticated, service_role;

revoke all on function public.blackstar_resolve_marketplace_dispute(uuid,text,text,uuid,text)
  from public, anon, authenticated;
grant execute on function public.blackstar_resolve_marketplace_dispute(uuid,text,text,uuid,text)
  to service_role;
