-- Blackstar Health & Fitness Hub foundation.
-- Personal health data is owner-scoped, RLS-enforced and never exposed to anonymous users.

create table public.health_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  goal text,
  units text not null default 'metric' check (units in ('metric','imperial')),
  activity_level text not null default 'moderate' check (activity_level in ('sedentary','light','moderate','active','very_active')),
  date_of_birth date,
  height_cm numeric(6,2) check (height_cm is null or (height_cm >= 50 and height_cm <= 280)),
  dietary_preferences jsonb not null default '[]'::jsonb,
  allergies jsonb not null default '[]'::jsonb,
  conditions jsonb not null default '[]'::jsonb,
  accessibility_notes text,
  coach_preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.health_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('fitness','strength','cardio','mobility','nutrition','sleep','recovery','weight','habit','general_health')),
  title text not null check (char_length(title) between 1 and 160),
  target_value numeric,
  target_unit text,
  target_date date,
  status text not null default 'active' check (status in ('active','paused','completed','cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index health_goals_user_status_idx on public.health_goals(user_id,status,updated_at desc);

create table public.health_metric_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  metric_type text not null check (metric_type in ('weight','resting_heart_rate','heart_rate','hrv','steps','blood_pressure_systolic','blood_pressure_diastolic','blood_glucose','body_fat','waist','temperature','oxygen_saturation','hydration','mood','energy','pain','other')),
  value numeric not null,
  unit text not null check (char_length(unit) between 1 and 32),
  recorded_at timestamptz not null default now(),
  source text not null default 'manual' check (source in ('manual','wearable','import','integration')),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index health_metric_entries_user_type_time_idx on public.health_metric_entries(user_id,metric_type,recorded_at desc);

create table public.health_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  workout_type text not null default 'strength' check (workout_type in ('strength','cardio','mobility','sport','recovery','mixed','other')),
  scheduled_for date,
  started_at timestamptz,
  completed_at timestamptz,
  duration_minutes integer check (duration_minutes is null or (duration_minutes >= 0 and duration_minutes <= 1440)),
  perceived_exertion numeric(3,1) check (perceived_exertion is null or (perceived_exertion >= 0 and perceived_exertion <= 10)),
  notes text,
  exercises jsonb not null default '[]'::jsonb,
  source text not null default 'manual' check (source in ('manual','ai_plan','import','integration')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index health_workouts_user_scheduled_idx on public.health_workouts(user_id,scheduled_for desc);
create index health_workouts_user_completed_idx on public.health_workouts(user_id,completed_at desc);

create table public.health_nutrition_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  eaten_at timestamptz not null default now(),
  meal_type text not null default 'meal' check (meal_type in ('breakfast','lunch','dinner','snack','drink','meal')),
  name text not null check (char_length(name) between 1 and 240),
  calories numeric check (calories is null or (calories >= 0 and calories <= 20000)),
  protein_g numeric check (protein_g is null or protein_g >= 0),
  carbs_g numeric check (carbs_g is null or carbs_g >= 0),
  fat_g numeric check (fat_g is null or fat_g >= 0),
  fibre_g numeric check (fibre_g is null or fibre_g >= 0),
  water_ml numeric check (water_ml is null or water_ml >= 0),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index health_nutrition_entries_user_time_idx on public.health_nutrition_entries(user_id,eaten_at desc);

create table public.health_sleep_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sleep_start timestamptz not null,
  sleep_end timestamptz not null,
  quality numeric(3,1) check (quality is null or (quality >= 0 and quality <= 10)),
  awake_minutes integer check (awake_minutes is null or awake_minutes >= 0),
  source text not null default 'manual' check (source in ('manual','wearable','import','integration')),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (sleep_end > sleep_start)
);
create index health_sleep_entries_user_time_idx on public.health_sleep_entries(user_id,sleep_end desc);

create table public.health_medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 240),
  dose text,
  schedule text,
  purpose text,
  prescribed_by text,
  started_on date,
  ended_on date,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index health_medications_user_active_idx on public.health_medications(user_id,active,updated_at desc);

do $$
declare t text;
begin
  foreach t in array array['health_profiles','health_goals','health_metric_entries','health_workouts','health_nutrition_entries','health_sleep_entries','health_medications']
  loop
    execute format('alter table public.%I enable row level security',t);
    execute format('alter table public.%I force row level security',t);
    execute format('revoke all on table public.%I from anon, authenticated',t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated',t);
    execute format('grant all on table public.%I to service_role',t);
  end loop;
end $$;

create policy health_profiles_select_own on public.health_profiles for select to authenticated using ((select auth.uid())=user_id);
create policy health_profiles_insert_own on public.health_profiles for insert to authenticated with check ((select auth.uid())=user_id);
create policy health_profiles_update_own on public.health_profiles for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy health_profiles_delete_own on public.health_profiles for delete to authenticated using ((select auth.uid())=user_id);

create policy health_goals_select_own on public.health_goals for select to authenticated using ((select auth.uid())=user_id);
create policy health_goals_insert_own on public.health_goals for insert to authenticated with check ((select auth.uid())=user_id);
create policy health_goals_update_own on public.health_goals for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy health_goals_delete_own on public.health_goals for delete to authenticated using ((select auth.uid())=user_id);

create policy health_metric_entries_select_own on public.health_metric_entries for select to authenticated using ((select auth.uid())=user_id);
create policy health_metric_entries_insert_own on public.health_metric_entries for insert to authenticated with check ((select auth.uid())=user_id);
create policy health_metric_entries_update_own on public.health_metric_entries for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy health_metric_entries_delete_own on public.health_metric_entries for delete to authenticated using ((select auth.uid())=user_id);

create policy health_workouts_select_own on public.health_workouts for select to authenticated using ((select auth.uid())=user_id);
create policy health_workouts_insert_own on public.health_workouts for insert to authenticated with check ((select auth.uid())=user_id);
create policy health_workouts_update_own on public.health_workouts for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy health_workouts_delete_own on public.health_workouts for delete to authenticated using ((select auth.uid())=user_id);

create policy health_nutrition_entries_select_own on public.health_nutrition_entries for select to authenticated using ((select auth.uid())=user_id);
create policy health_nutrition_entries_insert_own on public.health_nutrition_entries for insert to authenticated with check ((select auth.uid())=user_id);
create policy health_nutrition_entries_update_own on public.health_nutrition_entries for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy health_nutrition_entries_delete_own on public.health_nutrition_entries for delete to authenticated using ((select auth.uid())=user_id);

create policy health_sleep_entries_select_own on public.health_sleep_entries for select to authenticated using ((select auth.uid())=user_id);
create policy health_sleep_entries_insert_own on public.health_sleep_entries for insert to authenticated with check ((select auth.uid())=user_id);
create policy health_sleep_entries_update_own on public.health_sleep_entries for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy health_sleep_entries_delete_own on public.health_sleep_entries for delete to authenticated using ((select auth.uid())=user_id);

create policy health_medications_select_own on public.health_medications for select to authenticated using ((select auth.uid())=user_id);
create policy health_medications_insert_own on public.health_medications for insert to authenticated with check ((select auth.uid())=user_id);
create policy health_medications_update_own on public.health_medications for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy health_medications_delete_own on public.health_medications for delete to authenticated using ((select auth.uid())=user_id);
