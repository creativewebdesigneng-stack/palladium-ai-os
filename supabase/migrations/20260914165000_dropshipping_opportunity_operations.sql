-- Dropshipping-specific intelligence persistence.
-- Supplier masters, catalogue items, customer orders and purchase orders remain owned by Retail.

create table if not exists public.dropshipping_opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  commerce_workspace_id uuid null references public.commerce_workspaces(id) on delete set null,
  retail_workspace_id uuid null references public.retail_workspaces(id) on delete set null,
  website_project_id uuid null references public.website_studio_projects(id) on delete set null,
  promoted_catalog_item_id uuid null references public.retail_catalog_items(id) on delete set null,
  name text not null check (char_length(name) between 1 and 180),
  niche text null check (niche is null or char_length(niche) <= 240),
  target_market text null check (target_market is null or char_length(target_market) <= 160),
  status text not null default 'watching' check (status in ('watching','validating','test','shortlisted','approved','rejected','launched','archived')),
  channels text[] not null default '{}',
  opportunity_score integer null check (opportunity_score between 0 and 100),
  score_band text null check (score_band is null or char_length(score_band) <= 80),
  score_inputs jsonb not null default '{}'::jsonb,
  economics jsonb not null default '{}'::jsonb,
  compliance_status text not null default 'unknown' check (compliance_status in ('unknown','eligible','review','blocked')),
  evidence_status text not null default 'none' check (evidence_status in ('none','partial','ready')),
  research_summary text null check (research_summary is null or char_length(research_summary) <= 50000),
  notes text null check (notes is null or char_length(notes) <= 12000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dropshipping_opportunity_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  opportunity_id uuid not null references public.dropshipping_opportunities(id) on delete cascade,
  signal_type text not null check (signal_type in ('research','search','marketplace','supplier','social','competitor','price','fulfilment')),
  source_provider text null check (source_provider is null or char_length(source_provider) <= 120),
  source_ref text null check (source_ref is null or char_length(source_ref) <= 4000),
  metric_name text null check (metric_name is null or char_length(metric_name) <= 160),
  metric_value numeric null,
  confidence text not null default 'observed' check (confidence in ('observed','high','medium','low','inferred')),
  payload jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.dropshipping_opportunity_suppliers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  opportunity_id uuid not null references public.dropshipping_opportunities(id) on delete cascade,
  retail_supplier_id uuid null references public.retail_suppliers(id) on delete set null,
  provider text null check (provider is null or char_length(provider) <= 120),
  supplier_label text not null check (char_length(supplier_label) between 1 and 180),
  supplier_sku text null check (supplier_sku is null or char_length(supplier_sku) <= 240),
  source_ref text null check (source_ref is null or char_length(source_ref) <= 4000),
  role text not null default 'candidate' check (role in ('candidate','primary','backup','rejected')),
  currency text not null default 'GBP' check (char_length(currency) between 3 and 8),
  unit_cost numeric null check (unit_cost is null or unit_cost >= 0),
  shipping_cost numeric null check (shipping_cost is null or shipping_cost >= 0),
  estimated_delivery_days integer null check (estimated_delivery_days is null or estimated_delivery_days between 0 and 3650),
  supplier_score integer null check (supplier_score between 0 and 100),
  score_inputs jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  last_checked_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dropshipping_opportunity_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  opportunity_id uuid not null references public.dropshipping_opportunities(id) on delete cascade,
  opportunity_score integer null check (opportunity_score between 0 and 100),
  score_band text null check (score_band is null or char_length(score_band) <= 80),
  score_inputs jsonb not null default '{}'::jsonb,
  economics jsonb not null default '{}'::jsonb,
  supplier_summary jsonb not null default '{}'::jsonb,
  evidence_status text not null default 'none' check (evidence_status in ('none','partial','ready')),
  captured_at timestamptz not null default now()
);

create index if not exists dropshipping_opportunities_user_updated_idx on public.dropshipping_opportunities(user_id, updated_at desc);
create index if not exists dropshipping_opportunities_commerce_fk_idx on public.dropshipping_opportunities(commerce_workspace_id);
create index if not exists dropshipping_opportunities_retail_fk_idx on public.dropshipping_opportunities(retail_workspace_id);
create index if not exists dropshipping_opportunities_website_fk_idx on public.dropshipping_opportunities(website_project_id);
create index if not exists dropshipping_opportunities_catalog_fk_idx on public.dropshipping_opportunities(promoted_catalog_item_id);
create index if not exists dropshipping_signals_user_idx on public.dropshipping_opportunity_signals(user_id);
create index if not exists dropshipping_signals_opportunity_observed_idx on public.dropshipping_opportunity_signals(opportunity_id, observed_at desc);
create index if not exists dropshipping_supplier_offers_user_idx on public.dropshipping_opportunity_suppliers(user_id);
create index if not exists dropshipping_supplier_offers_opportunity_idx on public.dropshipping_opportunity_suppliers(opportunity_id, updated_at desc);
create index if not exists dropshipping_supplier_offers_retail_supplier_fk_idx on public.dropshipping_opportunity_suppliers(retail_supplier_id);
create index if not exists dropshipping_snapshots_user_idx on public.dropshipping_opportunity_snapshots(user_id);
create index if not exists dropshipping_snapshots_opportunity_captured_idx on public.dropshipping_opportunity_snapshots(opportunity_id, captured_at desc);

alter table public.dropshipping_opportunities enable row level security;
alter table public.dropshipping_opportunity_signals enable row level security;
alter table public.dropshipping_opportunity_suppliers enable row level security;
alter table public.dropshipping_opportunity_snapshots enable row level security;

revoke all on table public.dropshipping_opportunities from anon, authenticated;
revoke all on table public.dropshipping_opportunity_signals from anon, authenticated;
revoke all on table public.dropshipping_opportunity_suppliers from anon, authenticated;
revoke all on table public.dropshipping_opportunity_snapshots from anon, authenticated;
grant select, insert, update, delete on table public.dropshipping_opportunities to authenticated;
grant select, insert, update, delete on table public.dropshipping_opportunity_signals to authenticated;
grant select, insert, update, delete on table public.dropshipping_opportunity_suppliers to authenticated;
grant select, insert, update, delete on table public.dropshipping_opportunity_snapshots to authenticated;
grant select, insert, update, delete on table public.dropshipping_opportunities to service_role;
grant select, insert, update, delete on table public.dropshipping_opportunity_signals to service_role;
grant select, insert, update, delete on table public.dropshipping_opportunity_suppliers to service_role;
grant select, insert, update, delete on table public.dropshipping_opportunity_snapshots to service_role;

create policy dropshipping_opportunities_owner_select on public.dropshipping_opportunities for select to authenticated using ((select auth.uid()) = user_id);
create policy dropshipping_opportunities_owner_insert on public.dropshipping_opportunities for insert to authenticated with check ((select auth.uid()) = user_id);
create policy dropshipping_opportunities_owner_update on public.dropshipping_opportunities for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy dropshipping_opportunities_owner_delete on public.dropshipping_opportunities for delete to authenticated using ((select auth.uid()) = user_id);

create policy dropshipping_signals_owner_select on public.dropshipping_opportunity_signals for select to authenticated using ((select auth.uid()) = user_id);
create policy dropshipping_signals_owner_insert on public.dropshipping_opportunity_signals for insert to authenticated with check ((select auth.uid()) = user_id);
create policy dropshipping_signals_owner_update on public.dropshipping_opportunity_signals for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy dropshipping_signals_owner_delete on public.dropshipping_opportunity_signals for delete to authenticated using ((select auth.uid()) = user_id);

create policy dropshipping_supplier_offers_owner_select on public.dropshipping_opportunity_suppliers for select to authenticated using ((select auth.uid()) = user_id);
create policy dropshipping_supplier_offers_owner_insert on public.dropshipping_opportunity_suppliers for insert to authenticated with check ((select auth.uid()) = user_id);
create policy dropshipping_supplier_offers_owner_update on public.dropshipping_opportunity_suppliers for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy dropshipping_supplier_offers_owner_delete on public.dropshipping_opportunity_suppliers for delete to authenticated using ((select auth.uid()) = user_id);

create policy dropshipping_snapshots_owner_select on public.dropshipping_opportunity_snapshots for select to authenticated using ((select auth.uid()) = user_id);
create policy dropshipping_snapshots_owner_insert on public.dropshipping_opportunity_snapshots for insert to authenticated with check ((select auth.uid()) = user_id);
create policy dropshipping_snapshots_owner_update on public.dropshipping_opportunity_snapshots for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy dropshipping_snapshots_owner_delete on public.dropshipping_opportunity_snapshots for delete to authenticated using ((select auth.uid()) = user_id);
