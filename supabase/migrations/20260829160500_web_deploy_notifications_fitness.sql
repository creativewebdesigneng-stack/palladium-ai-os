-- Native foundations for Firecrawl/Crawlee, Coolify, ntfy and openGym-inspired capabilities.
-- Provider secrets stay server-side in environment configuration; only user-owned
-- job/target/topic/workout data is persisted here.

create table if not exists public.web_crawl_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  provider text not null check (provider in ('firecrawl','crawlee')),
  operation text not null check (operation in ('search','scrape','crawl')),
  source text not null,
  status text not null default 'queued' check (status in ('queued','running','completed','failed')),
  provider_job_id text,
  result jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.web_crawl_jobs enable row level security;
drop policy if exists "web crawl jobs owner access" on public.web_crawl_jobs;
create policy "web crawl jobs owner access" on public.web_crawl_jobs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists web_crawl_jobs_user_created_idx on public.web_crawl_jobs(user_id, created_at desc);

grant select, insert, update, delete on public.web_crawl_jobs to authenticated;

create table if not exists public.deployment_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  provider text not null default 'coolify' check (provider in ('coolify')),
  resource_kind text not null default 'application' check (resource_kind in ('application','service','database')),
  resource_uuid text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, provider, resource_uuid)
);
alter table public.deployment_targets enable row level security;
drop policy if exists "deployment targets owner access" on public.deployment_targets;
create policy "deployment targets owner access" on public.deployment_targets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.deployment_targets to authenticated;

create table if not exists public.notification_endpoints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  provider text not null default 'ntfy' check (provider in ('ntfy')),
  label text not null,
  topic text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, provider, topic)
);
alter table public.notification_endpoints enable row level security;
drop policy if exists "notification endpoints owner access" on public.notification_endpoints;
create policy "notification endpoints owner access" on public.notification_endpoints for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.notification_endpoints to authenticated;

create table if not exists public.fitness_profiles (
  user_id uuid primary key default auth.uid(),
  goal text,
  units text not null default 'metric' check (units in ('metric','imperial')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.fitness_profiles enable row level security;
drop policy if exists "fitness profiles owner access" on public.fitness_profiles;
create policy "fitness profiles owner access" on public.fitness_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.fitness_profiles to authenticated;

create table if not exists public.fitness_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  scheduled_for date,
  notes text,
  exercises jsonb not null default '[]'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.fitness_workouts enable row level security;
drop policy if exists "fitness workouts owner access" on public.fitness_workouts;
create policy "fitness workouts owner access" on public.fitness_workouts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists fitness_workouts_user_schedule_idx on public.fitness_workouts(user_id, scheduled_for desc);
grant select, insert, update, delete on public.fitness_workouts to authenticated;

create table if not exists public.fitness_weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  weight numeric(8,2) not null check (weight > 0),
  recorded_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique(user_id, recorded_on)
);
alter table public.fitness_weight_entries enable row level security;
drop policy if exists "fitness weight owner access" on public.fitness_weight_entries;
create policy "fitness weight owner access" on public.fitness_weight_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.fitness_weight_entries to authenticated;
