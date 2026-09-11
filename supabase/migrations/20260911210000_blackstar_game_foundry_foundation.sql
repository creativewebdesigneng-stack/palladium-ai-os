-- Blackstar Game Foundry foundation.
-- Reuses existing 3D Studio jobs and adds only the project metadata required for game/asset workflows.

create table if not exists public.game_foundry_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  prompt text not null default '',
  target_engine text not null default 'generic' check (target_engine in ('generic','unity','unreal','godot','web','blender')),
  project_type text not null default 'game' check (project_type in ('game','environment','character','prop','vehicle','asset_pack')),
  quality_profile text not null default 'game_ready' check (quality_profile in ('prototype','game_ready','cinematic')),
  status text not null default 'draft' check (status in ('draft','planning','queued','running','completed','failed','cancelled')),
  design_spec jsonb not null default '{}'::jsonb,
  worker_job_id text,
  output_url text,
  preview_url text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.three_d_jobs
  add column if not exists project_id uuid references public.game_foundry_projects(id) on delete set null,
  add column if not exists source_kind text not null default 'image' check (source_kind in ('prompt','image','model')),
  add column if not exists prompt text,
  add column if not exists quality_profile text not null default 'game_ready' check (quality_profile in ('draft','game_ready','cinematic')),
  add column if not exists target_engine text not null default 'generic' check (target_engine in ('generic','unity','unreal','godot','web','blender'));

alter table public.three_d_jobs alter column source_url drop not null;

create index if not exists game_foundry_projects_user_created_idx on public.game_foundry_projects(user_id, created_at desc);
create index if not exists three_d_jobs_project_idx on public.three_d_jobs(project_id, created_at desc);

alter table public.game_foundry_projects enable row level security;

drop policy if exists "game_foundry_projects_owner_all" on public.game_foundry_projects;
create policy "game_foundry_projects_owner_all"
  on public.game_foundry_projects
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

insert into public.tools (slug, name, description, category, is_active, min_plan, requires_approval)
values (
  'game_foundry',
  'Blackstar Game Foundry',
  'Plan game projects and create governed 3D asset-generation jobs using configured real workers and engine-ready export targets.',
  'creative',
  true,
  'builder',
  false
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  is_active = true;
