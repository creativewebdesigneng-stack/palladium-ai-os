-- Govern Blackstar's own buyer/seller support-dispute lifecycle transactionally.
-- Provider chargebacks remain in marketplace_provider_disputes and always win
-- over support workflow restoration.
alter table public.marketplace_disputes
  add column if not exists pre_dispute_status text,
  add column if not exists seller_response text,
  add column if not exists seller_responded_at timestamptz,
  add column if not exists resolved_by uuid references auth.users(id) on delete set null,
  add column if not exists resolved_at timestamptz;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname='marketplace_disputes_pre_status_check'
      and conrelid='public.marketplace_disputes'::regclass
  ) then
    alter table public.marketplace_disputes
      add constraint marketplace_disputes_pre_status_check
      check (pre_dispute_status is null or pre_dispute_status in ('paid','fulfilled'));
  end if;
end $$;

create unique index if not exists marketplace_disputes_one_active_per_order_idx
  on public.marketplace_disputes(order_id)
  where status in ('open','seller_response','under_review');

-- Stop browser clients bypassing order/dispute synchronization.
revoke insert, update on public.marketplace_disputes from authenticated;
drop policy if exists marketplace_disputes_buyer_insert on public.marketplace_disputes;
drop policy if exists marketplace_disputes_parties_update on public.marketplace_disputes;
drop policy if exists marketplace_disputes_admin_update on public.marketplace_disputes;

create or replace function public.blackstar_open_marketplace_support_dispute(
  p_order_id uuid,
  p_reason text,
  p_details text
) returns public.marketplace_disputes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_order public.marketplace_orders%rowtype;
  v_existing public.marketplace_disputes%rowtype;
  v_pre text;
  v_result public.marketplace_disputes%rowtype;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if p_reason not in ('not_received','not_as_described','access_issue','license_issue','refund_request','fraud','other')
    or p_details is null or char_length(btrim(p_details)) not between 10 and 5000
  then raise exception 'invalid marketplace dispute input'; end if;

  select * into v_order
  from public.marketplace_orders
  where id=p_order_id and buyer_id=v_user
  for update;
  if not found then raise exception 'marketplace order not found for buyer'; end if;

  if v_order.status not in ('paid','fulfilled','disputed') then
    raise exception 'marketplace order cannot enter support dispute';
  end if;

  select * into v_existing
  from public.marketplace_disputes
  where order_id=p_order_id and status in ('open','seller_response','under_review')
  limit 1;
  if found then raise exception 'marketplace order already has an active support dispute'; end if;

  v_pre := case
    when v_order.status in ('paid','fulfilled') then v_order.status
    when v_order.fulfilled_at is not null then 'fulfilled'
    when v_order.paid_at is not null then 'paid'
    else null
  end;
  if v_pre is null then raise exception 'marketplace dispute has no verified paid state'; end if;

  insert into public.marketplace_disputes(
    order_id,opened_by,reason,details,status,pre_dispute_status
  ) values (
    p_order_id,v_user,p_reason,btrim(p_details),'open',v_pre
  ) returning * into v_result;

  if v_order.status in ('paid','fulfilled') then
    update public.marketplace_orders
      set status='disputed'
      where id=p_order_id and status=v_order.status;
    if not found then raise exception 'marketplace order changed during dispute creation'; end if;
  end if;

  return v_result;
end;
$$;

create or replace function public.blackstar_respond_marketplace_support_dispute(
  p_dispute_id uuid,
  p_response text
) returns public.marketplace_disputes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_result public.marketplace_disputes%rowtype;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if p_response is null or char_length(btrim(p_response)) not between 10 and 5000
  then raise exception 'invalid seller dispute response'; end if;

  update public.marketplace_disputes d
    set seller_response=btrim(p_response),
        seller_responded_at=now(),
        status='seller_response',
        updated_at=now()
    where d.id=p_dispute_id
      and d.status in ('open','seller_response')
      and exists (
        select 1 from public.marketplace_orders o
        where o.id=d.order_id and o.seller_id=v_user
      )
    returning d.* into v_result;
  if not found then raise exception 'active marketplace dispute not found for seller'; end if;

  return v_result;
end;
$$;

create or replace function public.blackstar_resolve_marketplace_support_dispute(
  p_dispute_id uuid,
  p_decision text,
  p_notes text
) returns public.marketplace_disputes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_dispute public.marketplace_disputes%rowtype;
  v_order public.marketplace_orders%rowtype;
  v_target text;
  v_provider_active boolean;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if not exists (
    select 1 from public.marketplace_admins a where a.user_id=v_user
  ) then raise exception 'marketplace administrator access required'; end if;
  if p_decision not in ('resolved_buyer','resolved_seller','closed')
    or p_notes is null or char_length(btrim(p_notes)) not between 3 and 5000
  then raise exception 'invalid marketplace dispute resolution'; end if;

  select * into v_dispute
  from public.marketplace_disputes
  where id=p_dispute_id and status in ('open','seller_response','under_review')
  for update;
  if not found then raise exception 'active marketplace dispute not found'; end if;

  select * into v_order
  from public.marketplace_orders
  where id=v_dispute.order_id
  for update;
  if not found then raise exception 'marketplace order not found'; end if;

  select exists(
    select 1 from public.marketplace_provider_disputes pd
    where pd.order_id=v_order.id
      and pd.provider_status in (
        'warning_needs_response','warning_under_review','needs_response','under_review'
      )
  ) into v_provider_active;

  -- Financial provider truth dominates local support workflow.
  if v_order.refund_state='full' or v_order.status='refunded' then
    v_target := 'refunded';
  elsif v_order.status='charged_back' then
    v_target := 'charged_back';
  elsif v_provider_active then
    v_target := 'disputed';
  elsif p_decision='resolved_buyer' then
    -- A buyer-favourable support decision is not itself proof of a Stripe
    -- refund. Keep it disputed until the signed provider refund arrives.
    v_target := 'disputed';
  elsif v_order.status='disputed' then
    v_target := coalesce(
      v_dispute.pre_dispute_status,
      case when v_order.fulfilled_at is not null then 'fulfilled'
           when v_order.paid_at is not null then 'paid'
           else null end
    );
    if v_target is null then
      raise exception 'marketplace dispute cannot restore an unverified order state';
    end if;
  else
    v_target := v_order.status;
  end if;

  update public.marketplace_disputes
    set status=p_decision,
        resolution_notes=btrim(p_notes),
        resolved_by=v_user,
        resolved_at=now(),
        updated_at=now()
    where id=v_dispute.id
    returning * into v_dispute;

  if v_target is distinct from v_order.status then
    update public.marketplace_orders
      set status=v_target
      where id=v_order.id and status=v_order.status;
    if not found then raise exception 'marketplace order changed during dispute resolution'; end if;
  end if;

  return v_dispute;
end;
$$;

revoke all on function public.blackstar_open_marketplace_support_dispute(uuid,text,text)
  from public, anon, authenticated;
revoke all on function public.blackstar_respond_marketplace_support_dispute(uuid,text)
  from public, anon, authenticated;
revoke all on function public.blackstar_resolve_marketplace_support_dispute(uuid,text,text)
  from public, anon, authenticated;

grant execute on function public.blackstar_open_marketplace_support_dispute(uuid,text,text)
  to authenticated, service_role;
grant execute on function public.blackstar_respond_marketplace_support_dispute(uuid,text)
  to authenticated, service_role;
grant execute on function public.blackstar_resolve_marketplace_support_dispute(uuid,text,text)
  to authenticated, service_role;
