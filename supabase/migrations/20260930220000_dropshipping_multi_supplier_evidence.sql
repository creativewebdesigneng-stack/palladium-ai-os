-- Extend the current Dropshipping Opportunity Watchlist with multi-supplier evidence.
-- Retail remains the supplier master. This deliberately does not restore the stale
-- dropshipping_opportunity_signals or parallel opportunity schema from PR #531.

create table if not exists public.dropshipping_opportunity_suppliers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid not null references public.dropshipping_opportunities(id) on delete cascade,
  retail_supplier_id uuid not null references public.retail_suppliers(id) on delete cascade,
  supplier_sku text null check (supplier_sku is null or char_length(supplier_sku) <= 240),
  role text not null default 'candidate' check (role in ('candidate','primary','backup','rejected')),
  currency text not null default 'GBP' check (char_length(currency) between 3 and 8),
  unit_cost numeric(14,4) null check (unit_cost is null or (unit_cost >= 0 and unit_cost <= 1000000000)),
  shipping_cost numeric(14,4) null check (shipping_cost is null or (shipping_cost >= 0 and shipping_cost <= 1000000000)),
  minimum_order_quantity integer null check (minimum_order_quantity is null or minimum_order_quantity between 0 and 1000000000),
  estimated_delivery_days integer null check (estimated_delivery_days is null or estimated_delivery_days between 0 and 3650),
  stock_status text not null default 'unknown' check (stock_status in ('unknown','in_stock','low_stock','out_of_stock','backorder')),
  supplier_score numeric(6,2) null check (supplier_score is null or supplier_score between 0 and 100),
  evidence_urls jsonb not null default '[]'::jsonb
    check (jsonb_typeof(evidence_urls) = 'array')
    check (evidence_urls::text !~* '(api[_-]?key|apikey|access[_-]?token|refresh[_-]?token|secret|password|credential|authorization)[^"]{0,40}='),
  evidence_note text null
    check (evidence_note is null or char_length(evidence_note) <= 4000)
    check (
      evidence_note is null
      or evidence_note !~* '(api[_ -]?key|apikey|access[_ -]?token|refresh[_ -]?token|secret|password|credential|authorization)[[:space:]]*[:=]'
    ),
  observed_at timestamptz not null default now(),
  last_checked_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists dropshipping_opportunity_suppliers_offer_unique_idx
  on public.dropshipping_opportunity_suppliers(opportunity_id, retail_supplier_id);

create unique index if not exists dropshipping_opportunity_suppliers_primary_unique_idx
  on public.dropshipping_opportunity_suppliers(opportunity_id)
  where role = 'primary';

create index if not exists dropshipping_opportunity_suppliers_owner_updated_idx
  on public.dropshipping_opportunity_suppliers(user_id, updated_at desc);

create index if not exists dropshipping_opportunity_suppliers_retail_supplier_fk_idx
  on public.dropshipping_opportunity_suppliers(retail_supplier_id);

alter table public.dropshipping_opportunity_suppliers enable row level security;

drop policy if exists "dropshipping_opportunity_suppliers_select_own" on public.dropshipping_opportunity_suppliers;
create policy "dropshipping_opportunity_suppliers_select_own"
  on public.dropshipping_opportunity_suppliers for select
  to authenticated
  using (
    (select auth.uid()) is not null
    and user_id = (select auth.uid())
  );

drop policy if exists "dropshipping_opportunity_suppliers_insert_own" on public.dropshipping_opportunity_suppliers;
create policy "dropshipping_opportunity_suppliers_insert_own"
  on public.dropshipping_opportunity_suppliers for insert
  to authenticated
  with check (
    (select auth.uid()) is not null
    and user_id = (select auth.uid())
    and exists (
      select 1
      from public.dropshipping_opportunities opportunity
      join public.retail_suppliers supplier on supplier.id = dropshipping_opportunity_suppliers.retail_supplier_id
      where opportunity.id = dropshipping_opportunity_suppliers.opportunity_id
        and opportunity.user_id = (select auth.uid())
        and supplier.user_id = (select auth.uid())
        and (opportunity.workspace_id is null or supplier.workspace_id = opportunity.workspace_id)
    )
  );

drop policy if exists "dropshipping_opportunity_suppliers_update_own" on public.dropshipping_opportunity_suppliers;
create policy "dropshipping_opportunity_suppliers_update_own"
  on public.dropshipping_opportunity_suppliers for update
  to authenticated
  using (
    (select auth.uid()) is not null
    and user_id = (select auth.uid())
  )
  with check (
    (select auth.uid()) is not null
    and user_id = (select auth.uid())
    and exists (
      select 1
      from public.dropshipping_opportunities opportunity
      join public.retail_suppliers supplier on supplier.id = dropshipping_opportunity_suppliers.retail_supplier_id
      where opportunity.id = dropshipping_opportunity_suppliers.opportunity_id
        and opportunity.user_id = (select auth.uid())
        and supplier.user_id = (select auth.uid())
        and (opportunity.workspace_id is null or supplier.workspace_id = opportunity.workspace_id)
    )
  );

drop policy if exists "dropshipping_opportunity_suppliers_delete_own" on public.dropshipping_opportunity_suppliers;
create policy "dropshipping_opportunity_suppliers_delete_own"
  on public.dropshipping_opportunity_suppliers for delete
  to authenticated
  using (
    (select auth.uid()) is not null
    and user_id = (select auth.uid())
  );

revoke all on public.dropshipping_opportunity_suppliers from anon;
revoke all on public.dropshipping_opportunity_suppliers from authenticated;
grant select, insert, update, delete on public.dropshipping_opportunity_suppliers to authenticated;
grant all on public.dropshipping_opportunity_suppliers to service_role;

alter table public.dropshipping_opportunity_snapshots
  add column if not exists supplier_summary jsonb not null default '[]'::jsonb;

alter table public.dropshipping_opportunity_snapshots
  drop constraint if exists dropshipping_opportunity_snapshots_supplier_summary_check;
alter table public.dropshipping_opportunity_snapshots
  add constraint dropshipping_opportunity_snapshots_supplier_summary_check
  check (jsonb_typeof(supplier_summary) = 'array');
