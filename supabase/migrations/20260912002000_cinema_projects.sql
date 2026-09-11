create table if not exists public.cinema_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  prompt text not null,
  genre text not null,
  target_duration_minutes integer not null check (target_duration_minutes between 1 and 180),
  aspect_ratio text not null check (aspect_ratio in ('16:9','2.39:1','1.85:1','9:16','1:1')),
  quality text not null check (quality in ('preview','production','cinema')),
  status text not null default 'draft' check (status in ('draft','planning','planned','rendering','completed','failed')),
  blueprint text,
  production_manifest jsonb not null default '{}'::jsonb,
  continuity_bible jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cinema_projects enable row level security;

drop policy if exists cinema_projects_owner_select on public.cinema_projects;
create policy cinema_projects_owner_select on public.cinema_projects for select using (auth.uid() = user_id);
drop policy if exists cinema_projects_owner_insert on public.cinema_projects;
create policy cinema_projects_owner_insert on public.cinema_projects for insert with check (auth.uid() = user_id);
drop policy if exists cinema_projects_owner_update on public.cinema_projects;
create policy cinema_projects_owner_update on public.cinema_projects for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists cinema_projects_owner_delete on public.cinema_projects;
create policy cinema_projects_owner_delete on public.cinema_projects for delete using (auth.uid() = user_id);

create index if not exists cinema_projects_user_created_idx on public.cinema_projects(user_id, created_at desc);
