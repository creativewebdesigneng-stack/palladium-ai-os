-- Seller-controlled, transactional Marketplace fulfilment.
-- Direct authenticated settlement-table writes remain revoked; this narrowly
-- scoped function verifies auth.uid(), paid provider evidence and row ownership.
create or replace function public.marketplace_fulfil_paid_order(
  p_order_id uuid,
  p_delivery_reference text default null,
  p_instructions text default null
) returns table(
  order_id uuid,
  order_status text,
  delivery_status text,
  delivered_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_order public.marketplace_orders%rowtype;
  v_delivery public.marketplace_deliveries%rowtype;
  v_reference text := nullif(btrim(coalesce(p_delivery_reference,'')),'');
  v_instructions text := nullif(btrim(coalesce(p_instructions,'')),'');
  v_now timestamptz := now();
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_order_id is null then raise exception 'order id required'; end if;
  if v_reference is null and v_instructions is null then
    raise exception 'delivery evidence required';
  end if;
  if length(coalesce(v_reference,'')) > 2000 or length(coalesce(v_instructions,'')) > 10000 then
    raise exception 'delivery evidence exceeds allowed length';
  end if;

  select * into v_order
  from public.marketplace_orders
  where id=p_order_id and seller_id=v_user_id
  for update;
  if not found then raise exception 'seller-owned Marketplace order not found'; end if;

  select * into v_delivery
  from public.marketplace_deliveries
  where order_id=v_order.id
    and seller_id=v_user_id
    and buyer_id=v_order.buyer_id
  for update;
  if not found then raise exception 'paid Marketplace order has no delivery record'; end if;

  if v_order.status='fulfilled' then
    if v_delivery.status<>'delivered' or v_delivery.delivered_at is null then
      raise exception 'fulfilled order has inconsistent delivery state';
    end if;
    return query select v_order.id,v_order.status,v_delivery.status,v_delivery.delivered_at;
    return;
  end if;

  if v_order.status<>'paid'
    or v_order.paid_at is null
    or v_order.payment_provider is distinct from 'stripe'
    or v_order.stripe_payment_intent_id is null
    or v_order.stripe_payment_intent_id !~ '^pi_[A-Za-z0-9]+$'
  then
    raise exception 'order is not eligible for verified seller fulfilment';
  end if;

  if coalesce(v_order.refunded_pence,0)>0
    or coalesce(v_order.refund_state,'none')<>'none'
  then
    raise exception 'refunded Marketplace order cannot be fulfilled';
  end if;

  if v_delivery.status not in ('pending','ready') then
    raise exception 'delivery is not awaiting seller fulfilment';
  end if;

  update public.marketplace_deliveries
  set delivery_reference=v_reference,
      instructions=v_instructions,
      status='delivered',
      delivered_at=v_now
  where id=v_delivery.id
    and order_id=v_order.id
    and seller_id=v_user_id
    and status in ('pending','ready');

  if not found then raise exception 'delivery state changed before fulfilment'; end if;

  update public.marketplace_orders
  set status='fulfilled',fulfilled_at=v_now
  where id=v_order.id
    and seller_id=v_user_id
    and status='paid';

  if not found then raise exception 'order state changed before fulfilment'; end if;

  return query select v_order.id,'fulfilled'::text,'delivered'::text,v_now;
end;
$$;

revoke all on function public.marketplace_fulfil_paid_order(uuid,text,text)
  from public, anon;
grant execute on function public.marketplace_fulfil_paid_order(uuid,text,text)
  to authenticated, service_role;
