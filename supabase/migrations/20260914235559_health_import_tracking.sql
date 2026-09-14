-- Blackstar Health & Fitness Hub: lightweight import tracking for future connector syncs.
create table public.health_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('apple_health','google_fit','fitbit','garmin','oura','whoop','csv','fhir','other')),
  status text not null default 'received' check (status in ('received','processed','partially_processed','rejected')),
  imported_at timestamptz not null default now(),
  item_count integer not null default 0 check (item_count >= 0),
  accepted_count integer not null default 0 check (accepted_count >= 0),
  rejected_count integer not null default 0 check (rejected_count >= 0),
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index health_imports_user_time_idx on public.health_imports(user_id,imported_at desc);
alter table public.health_imports enable row level security;
alter table public.health_imports force row level security;
revoke all on table public.health_imports from anon, authenticated;
grant select,insert,update,delete on table public.health_imports to authenticated;
grant all on table public.health_imports to service_role;
create policy health_imports_select_own on public.health_imports for select to authenticated using ((select auth.uid())=user_id);
create policy health_imports_insert_own on public.health_imports for insert to authenticated with check ((select auth.uid())=user_id);
create policy health_imports_update_own on public.health_imports for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy health_imports_delete_own on public.health_imports for delete to authenticated using ((select auth.uid())=user_id);
