-- Live Prompt Workspace: owner-scoped saved prompts, immutable versions and run history.
create table if not exists public.saved_prompts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  system_prompt text,
  prompt_text text not null,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saved_prompts_user_updated_idx
  on public.saved_prompts(user_id, updated_at desc);

alter table public.saved_prompts enable row level security;

drop policy if exists "saved_prompts_select_own" on public.saved_prompts;
create policy "saved_prompts_select_own" on public.saved_prompts
  for select using (auth.uid() = user_id);

drop policy if exists "saved_prompts_insert_own" on public.saved_prompts;
create policy "saved_prompts_insert_own" on public.saved_prompts
  for insert with check (auth.uid() = user_id);

drop policy if exists "saved_prompts_update_own" on public.saved_prompts;
create policy "saved_prompts_update_own" on public.saved_prompts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "saved_prompts_delete_own" on public.saved_prompts;
create policy "saved_prompts_delete_own" on public.saved_prompts
  for delete using (auth.uid() = user_id);

create table if not exists public.saved_prompt_versions (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references public.saved_prompts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  version integer not null check (version > 0),
  name text not null,
  description text,
  system_prompt text,
  prompt_text text not null,
  created_at timestamptz not null default now(),
  unique(prompt_id, version)
);

create index if not exists saved_prompt_versions_user_prompt_idx
  on public.saved_prompt_versions(user_id, prompt_id, version desc);

alter table public.saved_prompt_versions enable row level security;

drop policy if exists "saved_prompt_versions_select_own" on public.saved_prompt_versions;
create policy "saved_prompt_versions_select_own" on public.saved_prompt_versions
  for select using (auth.uid() = user_id);

drop policy if exists "saved_prompt_versions_insert_own" on public.saved_prompt_versions;
create policy "saved_prompt_versions_insert_own" on public.saved_prompt_versions
  for insert with check (auth.uid() = user_id);

create table if not exists public.saved_prompt_runs (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid references public.saved_prompts(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt_version integer not null check (prompt_version > 0),
  input_text text,
  output_text text,
  status text not null default 'running' check (status in ('running','succeeded','failed')),
  provider text,
  model text,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists saved_prompt_runs_user_created_idx
  on public.saved_prompt_runs(user_id, created_at desc);

alter table public.saved_prompt_runs enable row level security;

drop policy if exists "saved_prompt_runs_select_own" on public.saved_prompt_runs;
create policy "saved_prompt_runs_select_own" on public.saved_prompt_runs
  for select using (auth.uid() = user_id);

drop policy if exists "saved_prompt_runs_insert_own" on public.saved_prompt_runs;
create policy "saved_prompt_runs_insert_own" on public.saved_prompt_runs
  for insert with check (auth.uid() = user_id);

drop policy if exists "saved_prompt_runs_update_own" on public.saved_prompt_runs;
create policy "saved_prompt_runs_update_own" on public.saved_prompt_runs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
