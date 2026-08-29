-- Native Voice Studio execution history. Audio credentials remain server-side and generated
-- audio is returned to the authenticated caller; metadata/transcripts remain auditable here.
create table if not exists public.voice_studio_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('tts','stt')),
  provider text not null,
  model text not null,
  voice text,
  status text not null default 'running' check (status in ('running','completed','failed')),
  input_text text,
  output_text text,
  input_mime_type text,
  output_format text,
  duration_ms integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists voice_studio_jobs_user_idx on public.voice_studio_jobs(user_id, created_at desc);
grant select, insert, update, delete on public.voice_studio_jobs to authenticated;
grant all on public.voice_studio_jobs to service_role;
alter table public.voice_studio_jobs enable row level security;
create policy "voice_studio_jobs_owner" on public.voice_studio_jobs
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
