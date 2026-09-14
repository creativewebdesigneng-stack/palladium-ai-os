create table if not exists public.dropshipping_opportunity_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid not null references public.dropshipping_opportunities(id) on delete cascade,
  reason text not null default 'manual' check (reason in ('manual','ai_recheck','promotion','status_change')),
  opportunity_score numeric(6,2) null check (opportunity_score between 0 and 100),
  demand_score numeric(6,2) null check (demand_score between 0 and 100),
  search_momentum numeric(6,2) null check (search_momentum between 0 and 100),
  competition_score numeric(6,2) null check (competition_score between 0 and 100),
  margin_score numeric(6,2) null check (margin_score between 0 and 100),
  supplier_score numeric(6,2) null check (supplier_score between 0 and 100),
  compliance_risk numeric(6,2) null check (compliance_risk between 0 and 100),
  evidence_urls jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence_urls)='array'),
  source_count integer not null default 0 check (source_count between 0 and 100),
  research_report text null check (research_report is null or char_length(research_report)<=30000),
  checked_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists dropshipping_opportunity_snapshots_owner_opportunity_idx
  on public.dropshipping_opportunity_snapshots(user_id, opportunity_id, checked_at desc);

alter table public.dropshipping_opportunity_snapshots enable row level security;

drop policy if exists "dropshipping_opportunity_snapshots_select_own" on public.dropshipping_opportunity_snapshots;
create policy "dropshipping_opportunity_snapshots_select_own"
  on public.dropshipping_opportunity_snapshots for select
  to authenticated
  using (user_id=(select auth.uid()));

drop policy if exists "dropshipping_opportunity_snapshots_insert_own" on public.dropshipping_opportunity_snapshots;
create policy "dropshipping_opportunity_snapshots_insert_own"
  on public.dropshipping_opportunity_snapshots for insert
  to authenticated
  with check (
    user_id=(select auth.uid())
    and exists (
      select 1 from public.dropshipping_opportunities opportunity
      where opportunity.id=opportunity_id
        and opportunity.user_id=(select auth.uid())
    )
  );

revoke all on public.dropshipping_opportunity_snapshots from anon;
revoke update, delete on public.dropshipping_opportunity_snapshots from authenticated;
grant select, insert on public.dropshipping_opportunity_snapshots to authenticated;
grant all on public.dropshipping_opportunity_snapshots to service_role;
