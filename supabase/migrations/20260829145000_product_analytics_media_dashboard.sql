-- Native integration foundation for Talivia/OpenPanel-style product analytics,
-- Auto-Editor-backed media jobs, and Dashy-style personal dashboard widgets.
-- Existing PalladiumAI auth, RLS, audit, billing, files and model/runtime systems remain authoritative.

create table if not exists public.product_analytics_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid,
  name text not null check (char_length(name) between 1 and 160),
  domain text,
  write_key uuid not null default gen_random_uuid() unique,
  currency text not null default 'USD' check (char_length(currency) = 3),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_analytics_projects_user_idx
  on public.product_analytics_projects(user_id, created_at desc);

create table if not exists public.product_analytics_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.product_analytics_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  visitor_id text,
  session_id text,
  event_name text not null check (char_length(event_name) between 1 and 160),
  path text,
  referrer text,
  properties jsonb not null default '{}'::jsonb,
  revenue_cents bigint not null default 0 check (revenue_cents >= 0),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists product_analytics_events_project_time_idx
  on public.product_analytics_events(project_id, occurred_at desc);
create index if not exists product_analytics_events_user_time_idx
  on public.product_analytics_events(user_id, occurred_at desc);
create index if not exists product_analytics_events_name_idx
  on public.product_analytics_events(project_id, event_name, occurred_at desc);
create index if not exists product_analytics_events_properties_idx
  on public.product_analytics_events using gin(properties);

create table if not exists public.product_analytics_funnels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.product_analytics_projects(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  steps jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists product_analytics_funnels_project_idx
  on public.product_analytics_funnels(project_id, created_at desc);

create table if not exists public.product_analytics_experiments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.product_analytics_projects(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  status text not null default 'draft' check (status in ('draft','running','paused','completed')),
  variants jsonb not null default '[]'::jsonb,
  goal_event text not null check (char_length(goal_event) between 1 and 160),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists product_analytics_experiments_project_idx
  on public.product_analytics_experiments(project_id, created_at desc);

create table if not exists public.media_edit_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  input_name text not null check (char_length(input_name) between 1 and 240),
  source_url text not null,
  mode text not null check (mode in ('silence','motion')),
  threshold numeric not null default 0.04 check (threshold >= 0 and threshold <= 1),
  margin_before_ms integer not null default 100 check (margin_before_ms >= 0 and margin_before_ms <= 60000),
  margin_after_ms integer not null default 100 check (margin_after_ms >= 0 and margin_after_ms <= 60000),
  output_format text not null default 'mp4' check (output_format in ('mp4','mov','premiere','resolve','final-cut-pro','shotcut','kdenlive','clip-sequence')),
  status text not null default 'queued' check (status in ('queued','running','completed','failed')),
  worker_job_id text,
  output_url text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists media_edit_jobs_user_idx
  on public.media_edit_jobs(user_id, created_at desc);

create table if not exists public.dashboard_widgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  kind text not null check (kind in ('link','status','metric','note')),
  target_url text,
  config jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists dashboard_widgets_user_idx
  on public.dashboard_widgets(user_id, sort_order asc, created_at asc);

grant select, insert, update, delete on public.product_analytics_projects to authenticated;
grant select, insert, update, delete on public.product_analytics_events to authenticated;
grant select, insert, update, delete on public.product_analytics_funnels to authenticated;
grant select, insert, update, delete on public.product_analytics_experiments to authenticated;
grant select, insert, update, delete on public.media_edit_jobs to authenticated;
grant select, insert, update, delete on public.dashboard_widgets to authenticated;

grant all on public.product_analytics_projects to service_role;
grant all on public.product_analytics_events to service_role;
grant all on public.product_analytics_funnels to service_role;
grant all on public.product_analytics_experiments to service_role;
grant all on public.media_edit_jobs to service_role;
grant all on public.dashboard_widgets to service_role;

alter table public.product_analytics_projects enable row level security;
alter table public.product_analytics_events enable row level security;
alter table public.product_analytics_funnels enable row level security;
alter table public.product_analytics_experiments enable row level security;
alter table public.media_edit_jobs enable row level security;
alter table public.dashboard_widgets enable row level security;

create policy "product_analytics_projects_owner" on public.product_analytics_projects
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "product_analytics_events_owner" on public.product_analytics_events
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "product_analytics_funnels_owner" on public.product_analytics_funnels
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "product_analytics_experiments_owner" on public.product_analytics_experiments
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "media_edit_jobs_owner" on public.media_edit_jobs
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "dashboard_widgets_owner" on public.dashboard_widgets
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
