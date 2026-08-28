create table if not exists public.browser_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid null,
  agent_id uuid not null,
  scope_key text not null,
  domain_scope text[] not null default '{}',
  state_ciphertext text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_used_at timestamptz null,
  constraint browser_profiles_owner_agent_scope_unique unique (user_id, agent_id, scope_key)
);

create index if not exists browser_profiles_user_agent_updated_idx
  on public.browser_profiles (user_id, agent_id, updated_at desc);

alter table public.browser_profiles enable row level security;

create policy "browser_profiles_owner_select"
  on public.browser_profiles for select
  using (auth.uid() = user_id);

create policy "browser_profiles_owner_insert"
  on public.browser_profiles for insert
  with check (auth.uid() = user_id);

create policy "browser_profiles_owner_update"
  on public.browser_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "browser_profiles_owner_delete"
  on public.browser_profiles for delete
  using (auth.uid() = user_id);

comment on table public.browser_profiles is
  'Owner-scoped encrypted browser storage-state snapshots for opt-in cross-run browser_task sessions.';
