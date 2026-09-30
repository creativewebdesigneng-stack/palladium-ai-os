-- Reconcile the authoritative Cinema Studio / Game Foundry persistence that is present
-- in repository history but absent from the active production database.
-- This is intentionally idempotent and reuses the existing canonical stores.

create table if not exists public.media_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('seedream','ltx','short_video','cinema')),
  kind text not null check (kind in ('image','video')),
  prompt text not null,
  aspect_ratio text not null,
  source_url text,
  duration_seconds integer,
  status text not null default 'queued',
  worker_job_id text,
  output_url text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists media_generation_jobs_user_created_idx on public.media_generation_jobs(user_id,created_at desc);
create index if not exists media_generation_jobs_worker_idx on public.media_generation_jobs(provider,worker_job_id) where worker_job_id is not null;
alter table public.media_generation_jobs enable row level security;
revoke all on public.media_generation_jobs from anon;
grant select,insert,update,delete on public.media_generation_jobs to authenticated;
drop policy if exists media_generation_jobs_select_own on public.media_generation_jobs;
create policy media_generation_jobs_select_own on public.media_generation_jobs for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists media_generation_jobs_insert_own on public.media_generation_jobs;
create policy media_generation_jobs_insert_own on public.media_generation_jobs for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists media_generation_jobs_update_own on public.media_generation_jobs;
create policy media_generation_jobs_update_own on public.media_generation_jobs for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists media_generation_jobs_delete_own on public.media_generation_jobs;
create policy media_generation_jobs_delete_own on public.media_generation_jobs for delete to authenticated using ((select auth.uid())=user_id);

create table if not exists public.three_d_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  input_name text not null,
  source_url text,
  workflow text not null default 'image-to-mesh',
  requested_format text not null default 'glb' check (requested_format in ('glb','gltf','fbx','obj','usd','ply','stl','vox')),
  status text not null default 'queued' check (status in ('queued','running','completed','failed','cancelled')),
  worker_job_id text, output_url text, preview_url text, error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), completed_at timestamptz
);
create index if not exists three_d_jobs_user_created_idx on public.three_d_jobs(user_id,created_at desc);
alter table public.three_d_jobs enable row level security;
revoke all on public.three_d_jobs from anon;
grant select,insert,update,delete on public.three_d_jobs to authenticated;
drop policy if exists three_d_jobs_owner_all on public.three_d_jobs;
create policy three_d_jobs_owner_all on public.three_d_jobs for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

create table if not exists public.game_foundry_projects (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(),
  name text not null, prompt text not null default '',
  target_engine text not null default 'generic' check (target_engine in ('generic','unity','unreal','godot','web','blender')),
  project_type text not null default 'game' check (project_type in ('game','environment','character','prop','vehicle','asset_pack')),
  quality_profile text not null default 'game_ready' check (quality_profile in ('prototype','game_ready','cinematic')),
  status text not null default 'draft' check (status in ('draft','planning','planned','queued','running','completed','failed','cancelled')),
  design_spec jsonb not null default '{}'::jsonb, worker_job_id text, output_url text, preview_url text, error_message text,
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), completed_at timestamptz,
  export_manifest jsonb not null default '{}'::jsonb,
  handoff_status text not null default 'not_started' check (handoff_status in ('not_started','prepared','queued','running','completed','failed','cancelled')),
  handoff_id text,handoff_error text,handoff_updated_at timestamptz,
  source_manifest jsonb not null default '{}'::jsonb,
  source_status text not null default 'not_started' check (source_status in ('not_started','generating','generated','failed')),
  source_error text,source_generated_at timestamptz,
  package_manifest jsonb not null default '{}'::jsonb,
  package_status text not null default 'not_started' check (package_status in ('not_started','prepared','failed')),
  package_error text,package_prepared_at timestamptz,
  content_manifest jsonb not null default '{}'::jsonb,
  content_status text not null default 'not_started' check (content_status in ('not_started','generating','generated','failed')),
  content_error text,content_generated_at timestamptz
);
create index if not exists game_foundry_projects_user_created_idx on public.game_foundry_projects(user_id,created_at desc);
create index if not exists game_foundry_projects_handoff_idx on public.game_foundry_projects(user_id,handoff_status,created_at desc);
alter table public.game_foundry_projects enable row level security;
revoke all on public.game_foundry_projects from anon;
grant select,insert,update,delete on public.game_foundry_projects to authenticated;
drop policy if exists game_foundry_projects_owner_all on public.game_foundry_projects;
create policy game_foundry_projects_owner_all on public.game_foundry_projects for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

alter table public.three_d_jobs
 add column if not exists project_id uuid references public.game_foundry_projects(id) on delete set null,
 add column if not exists source_kind text not null default 'image' check (source_kind in ('prompt','image','model')),
 add column if not exists prompt text,
 add column if not exists quality_profile text not null default 'game_ready' check (quality_profile in ('draft','game_ready','cinematic')),
 add column if not exists target_engine text not null default 'generic' check (target_engine in ('generic','unity','unreal','godot','web','blender')),
 add column if not exists source_storage_path text,
 add column if not exists processing_profile jsonb not null default '{}'::jsonb,
 add column if not exists validation_report jsonb not null default '{}'::jsonb,
 add column if not exists processed_output_url text,
 add column if not exists processing_worker_job_id text,
 add column if not exists processing_status text not null default 'not_started' check (processing_status in ('not_started','queued','running','completed','failed','cancelled')),
 add column if not exists content_requirement_id text;
create index if not exists three_d_jobs_project_idx on public.three_d_jobs(project_id,created_at desc);
create index if not exists three_d_jobs_processing_status_idx on public.three_d_jobs(user_id,processing_status,created_at desc);
create unique index if not exists three_d_jobs_project_requirement_unique on public.three_d_jobs(project_id,content_requirement_id) where project_id is not null and content_requirement_id is not null;

insert into storage.buckets(id,name,public,file_size_limit) values ('game-foundry','game-foundry',false,104857600)
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit;
drop policy if exists game_foundry_storage_select_own on storage.objects;
create policy game_foundry_storage_select_own on storage.objects for select to authenticated using (bucket_id='game-foundry' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists game_foundry_storage_insert_own on storage.objects;
create policy game_foundry_storage_insert_own on storage.objects for insert to authenticated with check (bucket_id='game-foundry' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists game_foundry_storage_update_own on storage.objects;
create policy game_foundry_storage_update_own on storage.objects for update to authenticated using (bucket_id='game-foundry' and (storage.foldername(name))[1]=(select auth.uid())::text) with check (bucket_id='game-foundry' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists game_foundry_storage_delete_own on storage.objects;
create policy game_foundry_storage_delete_own on storage.objects for delete to authenticated using (bucket_id='game-foundry' and (storage.foldername(name))[1]=(select auth.uid())::text);

create table if not exists public.cinema_projects (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 title text not null,prompt text not null,genre text not null,target_duration_minutes integer not null check(target_duration_minutes between 1 and 180),
 aspect_ratio text not null check(aspect_ratio in ('16:9','2.39:1','1.85:1','9:16','1:1')),
 quality text not null check(quality in ('preview','production','cinema')),
 status text not null default 'draft' check(status in ('draft','planning','planned','rendering','completed','failed')),
 blueprint text,production_manifest jsonb not null default '{}'::jsonb,continuity_bible jsonb not null default '{}'::jsonb,error_message text,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index if not exists cinema_projects_user_created_idx on public.cinema_projects(user_id,created_at desc);
alter table public.cinema_projects enable row level security;
revoke all on public.cinema_projects from anon;
grant select,insert,update,delete on public.cinema_projects to authenticated;
drop policy if exists cinema_projects_owner_select on public.cinema_projects;
create policy cinema_projects_owner_select on public.cinema_projects for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists cinema_projects_owner_insert on public.cinema_projects;
create policy cinema_projects_owner_insert on public.cinema_projects for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists cinema_projects_owner_update on public.cinema_projects;
create policy cinema_projects_owner_update on public.cinema_projects for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists cinema_projects_owner_delete on public.cinema_projects;
create policy cinema_projects_owner_delete on public.cinema_projects for delete to authenticated using ((select auth.uid())=user_id);

create table if not exists public.cinema_shot_renders (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 cinema_project_id uuid not null references public.cinema_projects(id) on delete cascade,
 scene_id text not null,shot_id text not null,stage text not null check(stage in ('keyframe','video')),
 segment_index integer not null default 0 check(segment_index>=0),duration_seconds integer,
 provider text not null check(provider in ('seedream','ltx')),media_job_id uuid references public.media_generation_jobs(id) on delete set null,
 status text not null default 'queued' check(status in ('queued','running','completed','failed','cancelled')),
 output_url text,error_message text,metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),completed_at timestamptz
);
create unique index if not exists cinema_shot_renders_unique_segment on public.cinema_shot_renders(cinema_project_id,scene_id,shot_id,stage,segment_index);
create index if not exists cinema_shot_renders_project_idx on public.cinema_shot_renders(user_id,cinema_project_id,scene_id,shot_id);
alter table public.cinema_shot_renders enable row level security;
revoke all on public.cinema_shot_renders from anon;
grant select,insert,update,delete on public.cinema_shot_renders to authenticated;
drop policy if exists cinema_shot_renders_owner_select on public.cinema_shot_renders;
create policy cinema_shot_renders_owner_select on public.cinema_shot_renders for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists cinema_shot_renders_owner_insert on public.cinema_shot_renders;
create policy cinema_shot_renders_owner_insert on public.cinema_shot_renders for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists cinema_shot_renders_owner_update on public.cinema_shot_renders;
create policy cinema_shot_renders_owner_update on public.cinema_shot_renders for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists cinema_shot_renders_owner_delete on public.cinema_shot_renders;
create policy cinema_shot_renders_owner_delete on public.cinema_shot_renders for delete to authenticated using ((select auth.uid())=user_id);

insert into public.tools(slug,name,description,category,is_active,min_plan,requires_approval) values
('three_d_studio','3D Studio','Submit and inspect bounded image-to-3D mesh jobs through the configured worker.','creative',true,'builder',false),
('game_foundry','Blackstar Game Foundry','Plan game projects and create governed 3D asset-generation jobs using configured real workers and engine-ready export targets.','creative',true,'builder',false),
('cinema_studio','Blackstar Cinema Studio','Develop long-form film plans and submit governed cinema render jobs.','creative',true,'builder',false)
on conflict(slug) do update set name=excluded.name,description=excluded.description,category=excluded.category,is_active=true;
