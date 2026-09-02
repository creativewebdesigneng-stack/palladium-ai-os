create table if not exists public.personal_assistant_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  assistant_name text not null default 'Blackstar',
  location_name text,
  timezone text,
  welcome_enabled boolean not null default true,
  briefing_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint personal_assistant_name_length check (char_length(assistant_name) between 1 and 60),
  constraint personal_assistant_location_length check (location_name is null or char_length(location_name) <= 160),
  constraint personal_assistant_timezone_length check (timezone is null or char_length(timezone) <= 100)
);

alter table public.personal_assistant_preferences enable row level security;

drop policy if exists "Users can read own personal assistant preferences" on public.personal_assistant_preferences;
create policy "Users can read own personal assistant preferences"
on public.personal_assistant_preferences for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own personal assistant preferences" on public.personal_assistant_preferences;
create policy "Users can insert own personal assistant preferences"
on public.personal_assistant_preferences for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own personal assistant preferences" on public.personal_assistant_preferences;
create policy "Users can update own personal assistant preferences"
on public.personal_assistant_preferences for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own personal assistant preferences" on public.personal_assistant_preferences;
create policy "Users can delete own personal assistant preferences"
on public.personal_assistant_preferences for delete
using (auth.uid() = user_id);
