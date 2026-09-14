-- Blackstar Retail Hub: atomic stocktake completion and auditable gift/store-credit transactions.

create table public.retail_gift_card_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  gift_card_id uuid not null references public.retail_gift_cards(id) on delete restrict,
  event_type text not null check (event_type in ('issue','redeem','refund','adjust','void','expire')),
  amount numeric(14,2) not null check (amount <> 0),
  balance_after numeric(14,2) not null check (balance_after >= 0),
  order_id uuid references public.retail_orders(id) on delete set null,
  return_id uuid references public.retail_returns(id) on delete set null,
  reference text,
  note text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index retail_gift_card_events_card_idx on public.retail_gift_card_events(gift_card_id, occurred_at desc);
create index retail_gift_card_events_workspace_idx on public.retail_gift_card_events(workspace_id, occurred_at desc);
create index retail_gift_card_events_order_fk_idx on public.retail_gift_card_events(order_id);
create index retail_gift_card_events_return_fk_idx on public.retail_gift_card_events(return_id);
create index retail_gift_card_events_user_idx on public.retail_gift_card_events(user_id, occurred_at desc);

alter table public.retail_gift_card_events enable row level security;
revoke all on table public.retail_gift_card_events from anon;
grant select on table public.retail_gift_card_events to authenticated;
grant all on table public.retail_gift_card_events to service_role;
create policy retail_gift_card_events_select_own on public.retail_gift_card_events for select to authenticated using ((select auth.uid()) = user_id);

-- Gift-card balances are transaction-controlled. Authenticated clients can create cards and
-- edit descriptive/status fields, but cannot directly rewrite monetary balances.
revoke update on table public.retail_gift_cards from authenticated;
grant update (customer_name, customer_email, status, expires_at, notes, updated_at) on table public.retail_gift_cards to authenticated;

create or replace function private.retail_adjust_gift_card_impl(
  p_gift_card_id uuid,
  p_amount numeric,
  p_event_type text,
  p_order_id uuid default null,
  p_return_id uuid default null,
  p_reference text default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_card public.retail_gift_cards%rowtype;
  v_new_balance numeric;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_amount = 0 then raise exception 'amount_cannot_be_zero'; end if;
  if p_event_type not in ('issue','redeem','refund','adjust','void','expire') then raise exception 'invalid_gift_card_event_type'; end if;

  select * into v_card
  from public.retail_gift_cards c
  where c.id = p_gift_card_id and c.user_id = v_user_id
  for update;
  if not found then raise exception 'gift_card_not_found'; end if;

  if p_order_id is not null and not exists (
    select 1 from public.retail_orders o where o.id = p_order_id and o.user_id = v_user_id and o.workspace_id = v_card.workspace_id
  ) then raise exception 'order_not_found'; end if;
  if p_return_id is not null and not exists (
    select 1 from public.retail_returns r where r.id = p_return_id and r.user_id = v_user_id and r.workspace_id = v_card.workspace_id
  ) then raise exception 'return_not_found'; end if;

  if p_event_type in ('redeem','void','expire') then
    v_new_balance := v_card.balance - abs(p_amount);
  elsif p_event_type in ('issue','refund') then
    v_new_balance := v_card.balance + abs(p_amount);
  else
    v_new_balance := v_card.balance + p_amount;
  end if;

  if v_new_balance < 0 then raise exception 'insufficient_gift_card_balance'; end if;

  update public.retail_gift_cards
     set balance = v_new_balance,
         status = case
           when p_event_type = 'void' then 'void'
           when p_event_type = 'expire' then 'expired'
           when v_new_balance = 0 then 'redeemed'
           when status in ('redeemed','expired') and v_new_balance > 0 then 'active'
           else status
         end,
         updated_at = now()
   where id = v_card.id
   returning * into v_card;

  insert into public.retail_gift_card_events (
    user_id, workspace_id, gift_card_id, event_type, amount, balance_after,
    order_id, return_id, reference, note
  ) values (
    v_user_id, v_card.workspace_id, v_card.id, p_event_type,
    case when p_event_type in ('redeem','void','expire') then -abs(p_amount)
         when p_event_type in ('issue','refund') then abs(p_amount)
         else p_amount end,
    v_new_balance, p_order_id, p_return_id, p_reference, p_note
  );

  return jsonb_build_object('gift_card_id', v_card.id, 'balance', v_new_balance, 'status', v_card.status);
end;
$$;
revoke all on function private.retail_adjust_gift_card_impl(uuid,numeric,text,uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function private.retail_adjust_gift_card_impl(uuid,numeric,text,uuid,uuid,text,text) to service_role;

create or replace function public.retail_adjust_gift_card(
  p_gift_card_id uuid,
  p_amount numeric,
  p_event_type text,
  p_order_id uuid default null,
  p_return_id uuid default null,
  p_reference text default null,
  p_note text default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.retail_adjust_gift_card_impl(p_gift_card_id,p_amount,p_event_type,p_order_id,p_return_id,p_reference,p_note);
$$;
revoke all on function public.retail_adjust_gift_card(uuid,numeric,text,uuid,uuid,text,text) from public, anon;
grant execute on function public.retail_adjust_gift_card(uuid,numeric,text,uuid,uuid,text,text) to authenticated, service_role;

-- Complete an entire stocktake atomically and post each variance through the existing
-- immutable inventory movement executor. The stocktake location controls the affected level.
create or replace function private.retail_complete_stocktake_impl(p_stocktake_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_take public.retail_stocktakes%rowtype;
  v_line public.retail_stocktake_lines%rowtype;
  v_variance numeric;
  v_posted integer := 0;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;

  select * into v_take
  from public.retail_stocktakes st
  where st.id = p_stocktake_id and st.user_id = v_user_id
  for update;
  if not found then raise exception 'stocktake_not_found'; end if;
  if v_take.status in ('completed','cancelled') then raise exception 'stocktake_not_open'; end if;

  if not exists (select 1 from public.retail_stocktake_lines l where l.stocktake_id = v_take.id and l.user_id = v_user_id) then
    raise exception 'stocktake_has_no_lines';
  end if;
  if exists (select 1 from public.retail_stocktake_lines l where l.stocktake_id = v_take.id and l.user_id = v_user_id and l.counted_quantity is null) then
    raise exception 'stocktake_has_uncounted_lines';
  end if;

  for v_line in
    select * from public.retail_stocktake_lines l
    where l.stocktake_id = v_take.id and l.user_id = v_user_id
    order by l.id
    for update
  loop
    if v_line.expected_quantity is null then
      select coalesce(sum(il.on_hand),0) into v_line.expected_quantity
      from public.retail_inventory_levels il
      where il.user_id = v_user_id
        and il.workspace_id = v_take.workspace_id
        and il.item_id = v_line.item_id
        and il.location_id is not distinct from v_take.location_id;
    end if;
    v_variance := v_line.counted_quantity - v_line.expected_quantity;

    update public.retail_stocktake_lines
       set expected_quantity = v_line.expected_quantity,
           variance = v_variance,
           counted_at = coalesce(counted_at, now()),
           updated_at = now()
     where id = v_line.id;

    if v_variance <> 0 then
      perform private.retail_adjust_inventory_impl(
        v_take.workspace_id,
        v_line.item_id,
        v_take.location_id,
        v_variance,
        'adjustment',
        coalesce(v_line.notes, 'Stocktake variance adjustment'),
        'stocktake',
        v_take.id::text
      );
      v_posted := v_posted + 1;
    end if;
  end loop;

  update public.retail_stocktakes
     set status = 'completed', completed_at = now(), updated_at = now()
   where id = v_take.id;

  return jsonb_build_object('stocktake_id', v_take.id, 'status', 'completed', 'adjustments_posted', v_posted);
end;
$$;
revoke all on function private.retail_complete_stocktake_impl(uuid) from public, anon, authenticated;
grant execute on function private.retail_complete_stocktake_impl(uuid) to service_role;

create or replace function public.retail_complete_stocktake(p_stocktake_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select private.retail_complete_stocktake_impl(p_stocktake_id); $$;
revoke all on function public.retail_complete_stocktake(uuid) from public, anon;
grant execute on function public.retail_complete_stocktake(uuid) to authenticated, service_role;
