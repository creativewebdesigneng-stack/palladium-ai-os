create table if not exists public.agent_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  org_id uuid null,
  name text not null,
  description text not null default '',
  version text not null default '0.1.0',
  body text not null default '',
  requires_tools text[] not null default '{}'::text[],
  requires_scripts text[] not null default '{}'::text[],
  dangerous boolean not null default false,
  scan_verdict text not null default 'safe',
  scan_findings jsonb not null default '[]'::jsonb,
  files jsonb not null default '{}'::jsonb,
  source_kind text not null default 'upload',
  source_ref text null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_skills_user_updated_idx
  on public.agent_skills(user_id, updated_at desc);

create index if not exists agent_skills_user_name_idx
  on public.agent_skills(user_id, lower(name));

create unique index if not exists agent_skills_reflection_source_unique
  on public.agent_skills(user_id, source_kind, source_ref)
  where source_ref is not null and source_kind = 'reflection';

alter table public.agent_skills enable row level security;

drop policy if exists agent_skills_select_own on public.agent_skills;
create policy agent_skills_select_own
  on public.agent_skills
  for select
  using (auth.uid() = user_id);

drop policy if exists agent_skills_insert_own on public.agent_skills;
create policy agent_skills_insert_own
  on public.agent_skills
  for insert
  with check (auth.uid() = user_id);

drop policy if exists agent_skills_update_own on public.agent_skills;
create policy agent_skills_update_own
  on public.agent_skills
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists agent_skills_delete_own on public.agent_skills;
create policy agent_skills_delete_own
  on public.agent_skills
  for delete
  using (auth.uid() = user_id);

notify pgrst, 'reload schema';
