-- Blackstar Health & Fitness Hub: structured plans and longitudinal personal records.

create table public.health_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_type text not null check (plan_type in ('training','nutrition','sleep','recovery','habit')),
  title text not null check (char_length(title) between 1 and 180),
  status text not null default 'draft' check (status in ('draft','active','completed','archived')),
  plan jsonb not null default '{}'::jsonb,
  source text not null default 'manual' check (source in ('manual','ai')),
  ai_provider text,
  ai_model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index health_plans_user_status_idx on public.health_plans(user_id,status,updated_at desc);

create table public.health_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  record_type text not null check (record_type in ('lab','appointment','vaccination','procedure','diagnosis_record','note','document')),
  title text not null check (char_length(title) between 1 and 240),
  recorded_on date,
  provider text,
  summary text,
  values jsonb not null default '{}'::jsonb,
  source text not null default 'manual' check (source in ('manual','import','integration')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index health_records_user_date_idx on public.health_records(user_id,recorded_on desc,created_at desc);

alter table public.health_plans enable row level security;
alter table public.health_plans force row level security;
alter table public.health_records enable row level security;
alter table public.health_records force row level security;
revoke all on table public.health_plans, public.health_records from anon, authenticated;
grant select,insert,update,delete on table public.health_plans, public.health_records to authenticated;
grant all on table public.health_plans, public.health_records to service_role;

create policy health_plans_select_own on public.health_plans for select to authenticated using ((select auth.uid())=user_id);
create policy health_plans_insert_own on public.health_plans for insert to authenticated with check ((select auth.uid())=user_id);
create policy health_plans_update_own on public.health_plans for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy health_plans_delete_own on public.health_plans for delete to authenticated using ((select auth.uid())=user_id);

create policy health_records_select_own on public.health_records for select to authenticated using ((select auth.uid())=user_id);
create policy health_records_insert_own on public.health_records for insert to authenticated with check ((select auth.uid())=user_id);
create policy health_records_update_own on public.health_records for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy health_records_delete_own on public.health_records for delete to authenticated using ((select auth.uid())=user_id);
