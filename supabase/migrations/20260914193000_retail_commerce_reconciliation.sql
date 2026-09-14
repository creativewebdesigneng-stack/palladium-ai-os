-- Blackstar Retail Hub: external commerce links, immutable tender ledger, and atomic till reconciliation.

create table public.retail_external_order_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  retail_order_id uuid not null references public.retail_orders(id) on delete cascade,
  provider text not null check (provider in ('shopify','square','stripe','other')),
  external_order_id text not null check (char_length(external_order_id) between 1 and 300),
  external_order_number text,
  external_updated_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index retail_external_order_links_provider_uq
  on public.retail_external_order_links(workspace_id, provider, external_order_id);
create index retail_external_order_links_order_fk_idx on public.retail_external_order_links(retail_order_id);
create index retail_external_order_links_user_idx on public.retail_external_order_links(user_id, updated_at desc);

create table public.retail_payment_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  order_id uuid references public.retail_orders(id) on delete set null,
  cash_session_id uuid references public.retail_cash_sessions(id) on delete set null,
  register_id uuid references public.retail_registers(id) on delete set null,
  provider text not null default 'manual' check (char_length(provider) between 1 and 80),
  external_payment_id text,
  event_type text not null check (event_type in ('sale','refund','chargeback','adjustment')),
  direction text not null check (direction in ('inflow','outflow')),
  method text not null check (method in ('cash','card','gift_card','store_credit','bank_transfer','wallet','online','other')),
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'GBP' check (char_length(currency) between 3 and 8),
  status text not null default 'captured' check (status in ('pending','authorised','captured','failed','voided')),
  reference text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (
    (event_type = 'sale' and direction = 'inflow') or
    (event_type in ('refund','chargeback') and direction = 'outflow') or
    event_type = 'adjustment'
  )
);
create index retail_payment_events_workspace_time_idx on public.retail_payment_events(workspace_id, occurred_at desc);
create index retail_payment_events_order_fk_idx on public.retail_payment_events(order_id);
create index retail_payment_events_session_fk_idx on public.retail_payment_events(cash_session_id);
create index retail_payment_events_register_fk_idx on public.retail_payment_events(register_id);
create index retail_payment_events_user_idx on public.retail_payment_events(user_id, occurred_at desc);
create unique index retail_payment_events_external_uq
  on public.retail_payment_events(workspace_id, provider, external_payment_id)
  where external_payment_id is not null and external_payment_id <> '';

create table public.retail_reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  cash_session_id uuid not null references public.retail_cash_sessions(id) on delete restrict,
  register_id uuid not null references public.retail_registers(id) on delete restrict,
  reconciled_by_staff_id uuid references public.retail_staff(id) on delete set null,
  opening_float numeric(14,2) not null,
  cash_sales numeric(14,2) not null default 0,
  cash_refunds numeric(14,2) not null default 0,
  cash_adjustments numeric(14,2) not null default 0,
  expected_cash numeric(14,2) not null,
  counted_cash numeric(14,2) not null,
  cash_variance numeric(14,2) not null,
  non_cash_captured numeric(14,2) not null default 0,
  tolerance numeric(14,2) not null default 0.01 check (tolerance >= 0),
  status text not null check (status in ('balanced','review')),
  details jsonb not null default '{}'::jsonb,
  reconciled_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index retail_reconciliation_runs_session_uq on public.retail_reconciliation_runs(cash_session_id);
create index retail_reconciliation_runs_workspace_idx on public.retail_reconciliation_runs(workspace_id, reconciled_at desc);
create index retail_reconciliation_runs_register_fk_idx on public.retail_reconciliation_runs(register_id);
create index retail_reconciliation_runs_staff_fk_idx on public.retail_reconciliation_runs(reconciled_by_staff_id);
create index retail_reconciliation_runs_user_idx on public.retail_reconciliation_runs(user_id, reconciled_at desc);

alter table public.retail_external_order_links enable row level security;
alter table public.retail_payment_events enable row level security;
alter table public.retail_reconciliation_runs enable row level security;

revoke all on table public.retail_external_order_links from anon;
revoke all on table public.retail_payment_events from anon;
revoke all on table public.retail_reconciliation_runs from anon;

grant select, insert, update, delete on table public.retail_external_order_links to authenticated;
grant select, insert on table public.retail_payment_events to authenticated;
grant select on table public.retail_reconciliation_runs to authenticated;
grant all on table public.retail_external_order_links, public.retail_payment_events, public.retail_reconciliation_runs to service_role;

create policy retail_external_order_links_select_own on public.retail_external_order_links
  for select to authenticated using ((select auth.uid()) = user_id);
create policy retail_external_order_links_insert_own on public.retail_external_order_links
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid()))
    and exists (select 1 from public.retail_orders o where o.id = retail_order_id and o.workspace_id = workspace_id and o.user_id = (select auth.uid()))
  );
create policy retail_external_order_links_update_own on public.retail_external_order_links
  for update to authenticated using ((select auth.uid()) = user_id) with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid()))
    and exists (select 1 from public.retail_orders o where o.id = retail_order_id and o.workspace_id = workspace_id and o.user_id = (select auth.uid()))
  );
create policy retail_external_order_links_delete_own on public.retail_external_order_links
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy retail_payment_events_select_own on public.retail_payment_events
  for select to authenticated using ((select auth.uid()) = user_id);
create policy retail_payment_events_insert_own on public.retail_payment_events
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid()))
    and (order_id is null or exists (select 1 from public.retail_orders o where o.id = order_id and o.workspace_id = workspace_id and o.user_id = (select auth.uid())))
    and (cash_session_id is null or exists (select 1 from public.retail_cash_sessions cs where cs.id = cash_session_id and cs.workspace_id = workspace_id and cs.user_id = (select auth.uid())))
    and (register_id is null or exists (select 1 from public.retail_registers r where r.id = register_id and r.workspace_id = workspace_id and r.user_id = (select auth.uid())))
    and (cash_session_id is null or register_id is null or exists (select 1 from public.retail_cash_sessions cs where cs.id = cash_session_id and cs.register_id = register_id))
  );

create policy retail_reconciliation_runs_select_own on public.retail_reconciliation_runs
  for select to authenticated using ((select auth.uid()) = user_id);

create trigger retail_external_order_links_set_updated_at
  before update on public.retail_external_order_links
  for each row execute function public.retail_set_updated_at();

create or replace function private.retail_reconcile_cash_session_impl(
  p_cash_session_id uuid,
  p_counted_cash numeric,
  p_tolerance numeric default 0.01,
  p_closed_by_staff_id uuid default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_session public.retail_cash_sessions%rowtype;
  v_existing public.retail_reconciliation_runs%rowtype;
  v_cash_sales numeric := 0;
  v_cash_refunds numeric := 0;
  v_cash_adjustments numeric := 0;
  v_non_cash numeric := 0;
  v_expected numeric := 0;
  v_variance numeric := 0;
  v_status text;
  v_run public.retail_reconciliation_runs%rowtype;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_counted_cash < 0 then raise exception 'counted_cash_must_be_non_negative'; end if;
  if p_tolerance < 0 or p_tolerance > 1000000 then raise exception 'invalid_reconciliation_tolerance'; end if;

  select * into v_existing from public.retail_reconciliation_runs rr
   where rr.cash_session_id = p_cash_session_id and rr.user_id = v_user_id;
  if found then
    return jsonb_build_object(
      'reconciliation_id', v_existing.id,
      'cash_session_id', v_existing.cash_session_id,
      'status', v_existing.status,
      'expected_cash', v_existing.expected_cash,
      'counted_cash', v_existing.counted_cash,
      'cash_variance', v_existing.cash_variance,
      'non_cash_captured', v_existing.non_cash_captured,
      'idempotent', true
    );
  end if;

  select * into v_session
    from public.retail_cash_sessions cs
   where cs.id = p_cash_session_id and cs.user_id = v_user_id
   for update;
  if not found then raise exception 'cash_session_not_found'; end if;
  if v_session.status = 'closed' then raise exception 'cash_session_already_closed'; end if;

  if p_closed_by_staff_id is not null and not exists (
    select 1 from public.retail_staff s
     where s.id = p_closed_by_staff_id and s.workspace_id = v_session.workspace_id and s.user_id = v_user_id
  ) then raise exception 'closing_staff_not_found'; end if;

  select
    coalesce(sum(case when pe.method='cash' and pe.event_type='sale' and pe.direction='inflow' then pe.amount else 0 end),0),
    coalesce(sum(case when pe.method='cash' and pe.event_type in ('refund','chargeback') and pe.direction='outflow' then pe.amount else 0 end),0),
    coalesce(sum(case when pe.method='cash' and pe.event_type='adjustment' then case when pe.direction='inflow' then pe.amount else -pe.amount end else 0 end),0),
    coalesce(sum(case when pe.method<>'cash' then case when pe.direction='inflow' then pe.amount else -pe.amount end else 0 end),0)
  into v_cash_sales, v_cash_refunds, v_cash_adjustments, v_non_cash
  from public.retail_payment_events pe
  where pe.user_id = v_user_id
    and pe.workspace_id = v_session.workspace_id
    and pe.cash_session_id = v_session.id
    and pe.status = 'captured';

  v_expected := round((v_session.opening_float + v_cash_sales - v_cash_refunds + v_cash_adjustments)::numeric, 2);
  v_variance := round((p_counted_cash - v_expected)::numeric, 2);
  v_status := case when abs(v_variance) <= p_tolerance then 'balanced' else 'review' end;

  insert into public.retail_reconciliation_runs (
    user_id, workspace_id, cash_session_id, register_id, reconciled_by_staff_id,
    opening_float, cash_sales, cash_refunds, cash_adjustments, expected_cash,
    counted_cash, cash_variance, non_cash_captured, tolerance, status, details
  ) values (
    v_user_id, v_session.workspace_id, v_session.id, v_session.register_id, p_closed_by_staff_id,
    v_session.opening_float, v_cash_sales, v_cash_refunds, v_cash_adjustments, v_expected,
    p_counted_cash, v_variance, v_non_cash, p_tolerance, v_status,
    jsonb_build_object('note', p_note, 'source', 'retail_payment_events')
  ) returning * into v_run;

  update public.retail_cash_sessions
     set closed_by_staff_id = p_closed_by_staff_id,
         closed_at = now(),
         expected_cash = v_expected,
         counted_cash = p_counted_cash,
         cash_variance = v_variance,
         status = case when v_status='balanced' then 'closed' else 'investigate' end,
         notes = case when p_note is null or btrim(p_note)='' then notes else concat_ws(E'\n', notes, p_note) end,
         updated_at = now()
   where id = v_session.id;

  return jsonb_build_object(
    'reconciliation_id', v_run.id,
    'cash_session_id', v_session.id,
    'status', v_status,
    'expected_cash', v_expected,
    'counted_cash', p_counted_cash,
    'cash_variance', v_variance,
    'cash_sales', v_cash_sales,
    'cash_refunds', v_cash_refunds,
    'cash_adjustments', v_cash_adjustments,
    'non_cash_captured', v_non_cash,
    'idempotent', false
  );
end;
$$;
revoke all on function private.retail_reconcile_cash_session_impl(uuid,numeric,numeric,uuid,text) from public, anon;
grant execute on function private.retail_reconcile_cash_session_impl(uuid,numeric,numeric,uuid,text) to authenticated, service_role;

create or replace function public.retail_reconcile_cash_session(
  p_cash_session_id uuid,
  p_counted_cash numeric,
  p_tolerance numeric default 0.01,
  p_closed_by_staff_id uuid default null,
  p_note text default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.retail_reconcile_cash_session_impl(p_cash_session_id,p_counted_cash,p_tolerance,p_closed_by_staff_id,p_note);
$$;
revoke all on function public.retail_reconcile_cash_session(uuid,numeric,numeric,uuid,text) from public, anon;
grant execute on function public.retail_reconcile_cash_session(uuid,numeric,numeric,uuid,text) to authenticated, service_role;
