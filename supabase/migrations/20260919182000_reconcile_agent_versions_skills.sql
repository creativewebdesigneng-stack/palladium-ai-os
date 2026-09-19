-- Restore Blackstar's original agent version ledger and owner-scoped skill
-- playbook registry. These foundational tables were absent from production.
-- Existing agent/runtime/approval implementations remain authoritative.

create table if not exists public.agent_versions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.personal_agents(id) on delete cascade,
  version integer not null,
  system_prompt text,
  instructions text,
  model text,
  config jsonb not null default '{}'::jsonb,
  changelog text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(agent_id,version)
);
create index if not exists agent_versions_agent_version_idx on public.agent_versions(agent_id,version desc);
alter table public.agent_versions enable row level security;
revoke all on public.agent_versions from public,anon,authenticated;
grant select,insert on public.agent_versions to authenticated;
grant all on public.agent_versions to service_role;
drop policy if exists agent_versions_owner_select on public.agent_versions;
create policy agent_versions_owner_select on public.agent_versions for select to authenticated
  using (exists (
    select 1 from public.personal_agents a
    where a.id=agent_id
    and (a.user_id=(select auth.uid()) or private.is_org_member(coalesce(a.org_id_fk,a.org_id)))
  ));
drop policy if exists agent_versions_owner_insert on public.agent_versions;
create policy agent_versions_owner_insert on public.agent_versions for insert to authenticated
  with check (
    created_by=(select auth.uid())
    and exists (select 1 from public.personal_agents a
                where a.id=agent_id and a.user_id=(select auth.uid()))
  );

create table if not exists public.agent_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid null,
  name text not null,
  description text not null default '',
  version text not null default '0.1.0',
  body text not null default '',
  requires_tools text[] not null default '{}'::text[],
  requires_scripts text[] not null default '{}'::text[],
  dangerous boolean not null default false,
  scan_verdict text not null default 'ok'
    check(scan_verdict in ('ok','warning','dangerous')),
  scan_findings jsonb not null default '[]'::jsonb,
  files jsonb not null default '{}'::jsonb,
  source_kind text not null default 'upload'
    check(source_kind in ('upload','github','reflection','builtin')),
  source_ref text null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_skills_name_length check(char_length(name) between 1 and 63),
  constraint agent_skills_description_length check(char_length(description) <= 240),
  constraint agent_skills_version_length check(char_length(version) between 1 and 80)
);
create unique index if not exists agent_skills_user_name_unique
  on public.agent_skills(user_id,lower(name));
create index if not exists agent_skills_user_enabled_idx
  on public.agent_skills(user_id,enabled,updated_at desc);
create unique index if not exists agent_skills_reflection_source_unique
  on public.agent_skills(user_id,source_kind,source_ref)
  where source_ref is not null and source_kind='reflection';
alter table public.agent_skills enable row level security;
revoke all on public.agent_skills from public,anon,authenticated;
grant select,insert,update,delete on public.agent_skills to authenticated;
grant all on public.agent_skills to service_role;

drop policy if exists agent_skills_owner_select on public.agent_skills;
create policy agent_skills_owner_select on public.agent_skills
  for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists agent_skills_owner_insert on public.agent_skills;
create policy agent_skills_owner_insert on public.agent_skills
  for insert to authenticated
  with check(user_id=(select auth.uid()) and
    (org_id is null or private.is_org_member(org_id)));
drop policy if exists agent_skills_owner_update on public.agent_skills;
create policy agent_skills_owner_update on public.agent_skills
  for update to authenticated using(user_id=(select auth.uid()))
  with check(user_id=(select auth.uid()) and
    (org_id is null or private.is_org_member(org_id)));
drop policy if exists agent_skills_owner_delete on public.agent_skills;
create policy agent_skills_owner_delete on public.agent_skills
  for delete to authenticated using(user_id=(select auth.uid()));

comment on table public.agent_skills is
 'Owner-scoped, security-scanned reusable skill playbooks. A skill cannot grant an executable tool or bypass an approval.';
notify pgrst,'reload schema';
