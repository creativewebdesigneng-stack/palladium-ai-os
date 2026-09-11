create table if not exists public.cinema_shot_renders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cinema_project_id uuid not null references public.cinema_projects(id) on delete cascade,
  scene_id text not null,
  shot_id text not null,
  stage text not null check (stage in ('keyframe','video')),
  segment_index integer not null default 0 check (segment_index >= 0),
  duration_seconds integer,
  provider text not null check (provider in ('seedream','ltx')),
  media_job_id uuid references public.media_generation_jobs(id) on delete set null,
  status text not null default 'queued' check (status in ('queued','running','completed','failed','cancelled')),
  output_url text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table public.cinema_shot_renders enable row level security;
drop policy if exists cinema_shot_renders_owner_select on public.cinema_shot_renders;
create policy cinema_shot_renders_owner_select on public.cinema_shot_renders for select using (auth.uid()=user_id);
drop policy if exists cinema_shot_renders_owner_insert on public.cinema_shot_renders;
create policy cinema_shot_renders_owner_insert on public.cinema_shot_renders for insert with check (auth.uid()=user_id);
drop policy if exists cinema_shot_renders_owner_update on public.cinema_shot_renders;
create policy cinema_shot_renders_owner_update on public.cinema_shot_renders for update using (auth.uid()=user_id) with check (auth.uid()=user_id);
drop policy if exists cinema_shot_renders_owner_delete on public.cinema_shot_renders;
create policy cinema_shot_renders_owner_delete on public.cinema_shot_renders for delete using (auth.uid()=user_id);
create unique index if not exists cinema_shot_renders_unique_segment on public.cinema_shot_renders(cinema_project_id,scene_id,shot_id,stage,segment_index);
create index if not exists cinema_shot_renders_project_idx on public.cinema_shot_renders(user_id,cinema_project_id,scene_id,shot_id);
