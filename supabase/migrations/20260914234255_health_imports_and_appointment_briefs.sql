-- Blackstar Health & Fitness Hub: import provenance and appointment-preparation briefs.

create table public.health_import_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('csv','json','apple_health_export','health_connect_export','fitbit_export','garmin_export','oura_export','other')),
  status text not null default 'validated' check (status in ('validated','imported','failed','cancelled')),
  filename text,
  imported_rows integer not null default 0 check (imported_rows >= 0),
  rejected_rows integer not null default 0 check (rejected_rows >= 0),
  summary jsonb not null default '{}'::jsonb,
  error_details jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index health_import_batches_user_time_idx on public.health_import_batches(user_id,created_at desc);

create table public.health_appointment_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  appointment_date date,
  clinician_or_service text,
  questions jsonb not null default '[]'::jsonb,
  brief jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','ready','archived')),
  ai_provider text,
  ai_model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index health_appointment_briefs_user_time_idx on public.health_appointment_briefs(user_id,appointment_date desc,updated_at desc);

alter table public.health_import_batches enable row level security;
alter table public.health_import_batches force row level security;
alter table public.health_appointment_briefs enable row level security;
alter table public.health_appointment_briefs force row level security;
revoke all on table public.health_import_batches, public.health_appointment_briefs from anon, authenticated;
grant select,insert,update,delete on table public.health_import_batches, public.health_appointment_briefs to authenticated;
grant all on table public.health_import_batches, public.health_appointment_briefs to service_role;

create policy health_import_batches_select_own on public.health_import_batches for select to authenticated using ((select auth.uid())=user_id);
create policy health_import_batches_insert_own on public.health_import_batches for insert to authenticated with check ((select auth.uid())=user_id);
create policy health_import_batches_update_own on public.health_import_batches for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy health_import_batches_delete_own on public.health_import_batches for delete to authenticated using ((select auth.uid())=user_id);

create policy health_appointment_briefs_select_own on public.health_appointment_briefs for select to authenticated using ((select auth.uid())=user_id);
create policy health_appointment_briefs_insert_own on public.health_appointment_briefs for insert to authenticated with check ((select auth.uid())=user_id);
create policy health_appointment_briefs_update_own on public.health_appointment_briefs for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy health_appointment_briefs_delete_own on public.health_appointment_briefs for delete to authenticated using ((select auth.uid())=user_id);
