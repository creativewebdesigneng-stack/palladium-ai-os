create table if not exists public.voice_clone_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'luxtts' check (provider in ('luxtts')),
  text text not null,
  reference_filename text not null,
  reference_mime_type text not null,
  speed numeric not null default 1,
  steps integer not null default 4,
  status text not null default 'queued',
  duration_ms integer,
  output_bytes integer,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists voice_clone_jobs_user_created_idx
  on public.voice_clone_jobs(user_id, created_at desc);

alter table public.voice_clone_jobs enable row level security;

drop policy if exists "voice_clone_jobs_select_own" on public.voice_clone_jobs;
create policy "voice_clone_jobs_select_own" on public.voice_clone_jobs
  for select using (auth.uid() = user_id);

drop policy if exists "voice_clone_jobs_insert_own" on public.voice_clone_jobs;
create policy "voice_clone_jobs_insert_own" on public.voice_clone_jobs
  for insert with check (auth.uid() = user_id);

drop policy if exists "voice_clone_jobs_update_own" on public.voice_clone_jobs;
create policy "voice_clone_jobs_update_own" on public.voice_clone_jobs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "voice_clone_jobs_delete_own" on public.voice_clone_jobs;
create policy "voice_clone_jobs_delete_own" on public.voice_clone_jobs
  for delete using (auth.uid() = user_id);
