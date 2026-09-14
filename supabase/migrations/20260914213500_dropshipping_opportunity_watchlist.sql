create table if not exists public.dropshipping_opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid null references public.retail_workspaces(id) on delete set null,
  kind text not null default 'product' check (kind in ('product','keyword')),
  status text not null default 'watching' check (status in ('watching','testing','winner','paused','rejected')),
  title text not null check (char_length(title) between 1 and 200),
  niche text null check (niche is null or char_length(niche) <= 200),
  market text null check (market is null or char_length(market) <= 160),
  channel text null check (channel is null or char_length(channel) <= 80),
  opportunity_score numeric(6,2) null check (opportunity_score between 0 and 100),
  demand_score numeric(6,2) null check (demand_score between 0 and 100),
  search_momentum numeric(6,2) null check (search_momentum between 0 and 100),
  competition_score numeric(6,2) null check (competition_score between 0 and 100),
  margin_score numeric(6,2) null check (margin_score between 0 and 100),
  supplier_score numeric(6,2) null check (supplier_score between 0 and 100),
  compliance_risk numeric(6,2) null check (compliance_risk between 0 and 100),
  evidence_urls jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence_urls) = 'array'),
  notes text null check (notes is null or char_length(notes) <= 12000),
  last_checked_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dropshipping_opportunities_user_updated_idx
  on public.dropshipping_opportunities(user_id, updated_at desc);
create index if not exists dropshipping_opportunities_workspace_idx
  on public.dropshipping_opportunities(workspace_id, updated_at desc)
  where workspace_id is not null;

alter table public.dropshipping_opportunities enable row level security;

drop policy if exists "dropshipping_opportunities_select_own" on public.dropshipping_opportunities;
create policy "dropshipping_opportunities_select_own"
  on public.dropshipping_opportunities for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "dropshipping_opportunities_insert_own" on public.dropshipping_opportunities;
create policy "dropshipping_opportunities_insert_own"
  on public.dropshipping_opportunities for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and (workspace_id is null or exists (
      select 1 from public.retail_workspaces rw
      where rw.id = workspace_id and rw.user_id = (select auth.uid())
    ))
  );

drop policy if exists "dropshipping_opportunities_update_own" on public.dropshipping_opportunities;
create policy "dropshipping_opportunities_update_own"
  on public.dropshipping_opportunities for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (workspace_id is null or exists (
      select 1 from public.retail_workspaces rw
      where rw.id = workspace_id and rw.user_id = (select auth.uid())
    ))
  );

drop policy if exists "dropshipping_opportunities_delete_own" on public.dropshipping_opportunities;
create policy "dropshipping_opportunities_delete_own"
  on public.dropshipping_opportunities for delete
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.dropshipping_opportunities from anon;
grant select, insert, update, delete on public.dropshipping_opportunities to authenticated;
grant all on public.dropshipping_opportunities to service_role;
