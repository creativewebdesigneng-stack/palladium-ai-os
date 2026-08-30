create table if not exists public.voice_assistant_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  muted boolean not null default false,
  voice_name text,
  rate double precision not null default 1 check (rate between 0.7 and 1.4),
  pitch double precision not null default 1 check (pitch between 0.7 and 1.3),
  announce_notifications boolean not null default true,
  wake_word_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.voice_assistant_preferences enable row level security;

drop policy if exists "voice assistant preferences owner select" on public.voice_assistant_preferences;
create policy "voice assistant preferences owner select"
on public.voice_assistant_preferences for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "voice assistant preferences owner insert" on public.voice_assistant_preferences;
create policy "voice assistant preferences owner insert"
on public.voice_assistant_preferences for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "voice assistant preferences owner update" on public.voice_assistant_preferences;
create policy "voice assistant preferences owner update"
on public.voice_assistant_preferences for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
