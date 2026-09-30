-- Owner-scoped current outcomes for Blackstar U01-U24 operational acceptance gates.
-- A saved row records an outcome; it does not manufacture provider/device/transaction/professional evidence.

create table if not exists public.operational_acceptance_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  status text not null,
  evidence_kind text not null,
  evidence_reference text,
  notes text,
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint operational_acceptance_results_user_item_key unique (user_id, item_id),
  constraint operational_acceptance_results_item_id_check
    check (item_id ~ '^U(0[1-9]|1[0-9]|2[0-4])$'),
  constraint operational_acceptance_results_status_check
    check (status in ('verified', 'failed', 'declined', 'waiting')),
  constraint operational_acceptance_results_evidence_kind_check
    check (evidence_kind in ('owner', 'provider', 'device', 'transaction', 'professional', 'independent', 'conditional', 'system')),
  constraint operational_acceptance_results_verified_evidence_check
    check (
      status <> 'verified'
      or (
        length(trim(coalesce(evidence_reference, ''))) >= 3
        and length(trim(coalesce(notes, ''))) >= 10
      )
    ),
  constraint operational_acceptance_results_failed_note_check
    check (
      status <> 'failed'
      or length(trim(coalesce(notes, ''))) >= 10
    )
);

alter table public.operational_acceptance_results enable row level security;

revoke all on table public.operational_acceptance_results from anon;
grant select, insert, update on table public.operational_acceptance_results to authenticated;

drop policy if exists "Users can view own operational acceptance results" on public.operational_acceptance_results;
create policy "Users can view own operational acceptance results"
on public.operational_acceptance_results
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own operational acceptance results" on public.operational_acceptance_results;
create policy "Users can create own operational acceptance results"
on public.operational_acceptance_results
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own operational acceptance results" on public.operational_acceptance_results;
create policy "Users can update own operational acceptance results"
on public.operational_acceptance_results
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

comment on table public.operational_acceptance_results is
  'Owner-scoped current outcomes for Blackstar U01-U24 operational acceptance gates. A saved row records an outcome; it does not manufacture provider/device/transaction/professional evidence.';
