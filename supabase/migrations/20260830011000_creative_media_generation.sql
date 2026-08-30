create table if not exists public.media_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('seedream','ltx')),
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

create index if not exists media_generation_jobs_user_created_idx
  on public.media_generation_jobs(user_id, created_at desc);
create index if not exists media_generation_jobs_worker_idx
  on public.media_generation_jobs(provider, worker_job_id)
  where worker_job_id is not null;

alter table public.media_generation_jobs enable row level security;

drop policy if exists "media_generation_jobs_select_own" on public.media_generation_jobs;
create policy "media_generation_jobs_select_own"
  on public.media_generation_jobs for select
  using (auth.uid() = user_id);

drop policy if exists "media_generation_jobs_insert_own" on public.media_generation_jobs;
create policy "media_generation_jobs_insert_own"
  on public.media_generation_jobs for insert
  with check (auth.uid() = user_id);

drop policy if exists "media_generation_jobs_update_own" on public.media_generation_jobs;
create policy "media_generation_jobs_update_own"
  on public.media_generation_jobs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "media_generation_jobs_delete_own" on public.media_generation_jobs;
create policy "media_generation_jobs_delete_own"
  on public.media_generation_jobs for delete
  using (auth.uid() = user_id);
