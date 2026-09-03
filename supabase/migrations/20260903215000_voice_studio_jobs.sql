-- Voice Studio execution history.
-- Keeps TTS/STT jobs owner-scoped while allowing server functions to record lifecycle state.

create table if not exists public.voice_studio_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('tts', 'stt')),
  provider text not null default 'openai',
  model text not null,
  voice text,
  status text not null default 'running' check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  input_text text,
  output_text text,
  input_mime_type text,
  output_format text,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists voice_studio_jobs_user_created_idx
  on public.voice_studio_jobs (user_id, created_at desc);

create index if not exists voice_studio_jobs_user_status_idx
  on public.voice_studio_jobs (user_id, status);

alter table public.voice_studio_jobs enable row level security;

drop policy if exists "voice_studio_jobs_select_own" on public.voice_studio_jobs;
create policy "voice_studio_jobs_select_own"
  on public.voice_studio_jobs
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "voice_studio_jobs_insert_own" on public.voice_studio_jobs;
create policy "voice_studio_jobs_insert_own"
  on public.voice_studio_jobs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "voice_studio_jobs_update_own" on public.voice_studio_jobs;
create policy "voice_studio_jobs_update_own"
  on public.voice_studio_jobs
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "voice_studio_jobs_delete_own" on public.voice_studio_jobs;
create policy "voice_studio_jobs_delete_own"
  on public.voice_studio_jobs
  for delete
  to authenticated
  using (auth.uid() = user_id);

comment on table public.voice_studio_jobs is
  'Owner-scoped Voice Studio TTS and speech-to-text execution history.';

notify pgrst, 'reload schema';
