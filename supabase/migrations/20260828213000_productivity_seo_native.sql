-- Native capability transfer from Super Productivity (MIT) and OpenSEO (MIT).
-- n8n is Sustainable Use licensed; no n8n source is copied. Workflow interoperability
-- is implemented separately against PalladiumAI's existing workflow model.

create table if not exists public.task_focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  task_source text null check (task_source is null or task_source in ('personal_tasks','agent_tasks')),
  task_id uuid null,
  label text not null default 'Focus session',
  started_at timestamptz not null default now(),
  ended_at timestamptz null,
  duration_seconds integer null check (duration_seconds is null or duration_seconds >= 0),
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists task_focus_sessions_user_started_idx on public.task_focus_sessions(user_id, started_at desc);
alter table public.task_focus_sessions enable row level security;
drop policy if exists "task_focus_owner_select" on public.task_focus_sessions;
create policy "task_focus_owner_select" on public.task_focus_sessions for select using (auth.uid() = user_id);
drop policy if exists "task_focus_owner_insert" on public.task_focus_sessions;
create policy "task_focus_owner_insert" on public.task_focus_sessions for insert with check (auth.uid() = user_id);
drop policy if exists "task_focus_owner_update" on public.task_focus_sessions;
create policy "task_focus_owner_update" on public.task_focus_sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "task_focus_owner_delete" on public.task_focus_sessions;
create policy "task_focus_owner_delete" on public.task_focus_sessions for delete using (auth.uid() = user_id);

create table if not exists public.seo_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  org_id uuid null,
  name text not null,
  domain text not null,
  provider text not null default 'provider-neutral',
  location_code text null,
  language_code text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists seo_projects_user_domain_idx on public.seo_projects(user_id, domain);
alter table public.seo_projects enable row level security;
drop policy if exists "seo_projects_owner_select" on public.seo_projects;
create policy "seo_projects_owner_select" on public.seo_projects for select using (auth.uid() = user_id);
drop policy if exists "seo_projects_owner_insert" on public.seo_projects;
create policy "seo_projects_owner_insert" on public.seo_projects for insert with check (auth.uid() = user_id);
drop policy if exists "seo_projects_owner_update" on public.seo_projects;
create policy "seo_projects_owner_update" on public.seo_projects for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "seo_projects_owner_delete" on public.seo_projects;
create policy "seo_projects_owner_delete" on public.seo_projects for delete using (auth.uid() = user_id);

create table if not exists public.seo_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  project_id uuid not null references public.seo_projects(id) on delete cascade,
  kind text not null check (kind in ('keyword','rank','backlink','audit')),
  subject text not null,
  metrics jsonb not null default '{}'::jsonb,
  notes text not null default '',
  source text not null default 'manual',
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists seo_snapshots_project_observed_idx on public.seo_snapshots(user_id, project_id, observed_at desc);
create index if not exists seo_snapshots_kind_idx on public.seo_snapshots(user_id, kind, observed_at desc);
alter table public.seo_snapshots enable row level security;
drop policy if exists "seo_snapshots_owner_select" on public.seo_snapshots;
create policy "seo_snapshots_owner_select" on public.seo_snapshots for select using (auth.uid() = user_id);
drop policy if exists "seo_snapshots_owner_insert" on public.seo_snapshots;
create policy "seo_snapshots_owner_insert" on public.seo_snapshots for insert with check (auth.uid() = user_id);
drop policy if exists "seo_snapshots_owner_update" on public.seo_snapshots;
create policy "seo_snapshots_owner_update" on public.seo_snapshots for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "seo_snapshots_owner_delete" on public.seo_snapshots;
create policy "seo_snapshots_owner_delete" on public.seo_snapshots for delete using (auth.uid() = user_id);
