-- Personal AI defaults used by live assistant execution.
-- One row per user; no organisation-wide leakage and no anonymous access.

create table if not exists public.user_ai_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_provider text not null check (default_provider in ('lovable', 'openai', 'anthropic', 'compatible')),
  default_model text not null check (char_length(default_model) between 1 and 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_ai_preferences enable row level security;

create policy "Users can read own AI preferences"
  on public.user_ai_preferences
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own AI preferences"
  on public.user_ai_preferences
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own AI preferences"
  on public.user_ai_preferences
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
