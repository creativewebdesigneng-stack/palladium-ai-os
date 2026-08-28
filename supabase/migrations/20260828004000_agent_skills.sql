-- PalladiumAI reusable agent skills inspired by Atomic Agent playbooks.
-- Skill packages are owner-scoped, security-scanned before install, and kept
-- separate from the executable tool registry so a skill cannot register tools.

create table if not exists public.agent_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid null,
  name text not null,
  description text not null,
  version text not null,
  body text not null,
  requires_tools text[] not null default '{}',
  requires_scripts text[] not null default '{}',
  dangerous boolean not null default false,
  scan_verdict text not null default 'ok',
  scan_findings jsonb not null default '[]'::jsonb,
  files jsonb not null default '{}'::jsonb,
  source_kind text not null default 'upload',
  source_ref text null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_skills_name_length check (char_length(name) between 1 and 63),
  constraint agent_skills_description_length check (char_length(description) between 1 and 240),
  constraint agent_skills_version_length check (char_length(version) between 1 and 80),
  constraint agent_skills_scan_verdict check (scan_verdict in ('ok', 'warning', 'dangerous')),
  constraint agent_skills_source_kind check (source_kind in ('upload', 'github', 'reflection', 'builtin'))
);

create unique index if not exists agent_skills_user_name_unique
  on public.agent_skills(user_id, lower(name));
create index if not exists agent_skills_user_enabled_idx
  on public.agent_skills(user_id, enabled, updated_at desc);

alter table public.agent_skills enable row level security;

drop policy if exists "agent_skills_select_own" on public.agent_skills;
create policy "agent_skills_select_own"
  on public.agent_skills for select
  using (auth.uid() = user_id);

drop policy if exists "agent_skills_insert_own" on public.agent_skills;
create policy "agent_skills_insert_own"
  on public.agent_skills for insert
  with check (auth.uid() = user_id);

drop policy if exists "agent_skills_update_own" on public.agent_skills;
create policy "agent_skills_update_own"
  on public.agent_skills for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "agent_skills_delete_own" on public.agent_skills;
create policy "agent_skills_delete_own"
  on public.agent_skills for delete
  using (auth.uid() = user_id);

comment on table public.agent_skills is
  'Owner-scoped reusable agent playbooks. Packages are scanned before install and cannot dynamically register executable tools.';
