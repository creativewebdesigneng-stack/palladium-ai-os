-- Reusable, owner/org-scoped agent skills. Skills are instruction bundles only:
-- recommended_tools are advisory and never grant runtime permissions.

create table if not exists public.agent_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organisations(id) on delete cascade,
  name text not null,
  description text,
  instructions text not null,
  recommended_tools text[] not null default '{}'::text[],
  version integer not null default 1 check (version >= 1),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(name) between 1 and 120),
  check (char_length(instructions) between 1 and 12000)
);

create unique index if not exists agent_skills_user_name_unique
  on public.agent_skills (user_id, lower(name)) where org_id is null;
create unique index if not exists agent_skills_org_name_unique
  on public.agent_skills (org_id, lower(name)) where org_id is not null;
create index if not exists agent_skills_scope_idx on public.agent_skills (user_id, org_id, is_active);

grant select, insert, update, delete on public.agent_skills to authenticated;
grant all on public.agent_skills to service_role;
alter table public.agent_skills enable row level security;

create policy agent_skills_select on public.agent_skills for select to authenticated
  using (user_id = auth.uid() or public.is_org_member(org_id));
create policy agent_skills_insert on public.agent_skills for insert to authenticated
  with check (
    user_id = auth.uid()
    and ((org_id is null) or public.org_admin(org_id))
  );
create policy agent_skills_update on public.agent_skills for update to authenticated
  using (user_id = auth.uid() or public.org_admin(org_id))
  with check (user_id = auth.uid() or public.org_admin(org_id));
create policy agent_skills_delete on public.agent_skills for delete to authenticated
  using (user_id = auth.uid() or public.org_admin(org_id));

create table if not exists public.agent_skill_bindings (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.personal_agents(id) on delete cascade,
  skill_id uuid not null references public.agent_skills(id) on delete cascade,
  enabled boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (agent_id, skill_id)
);

create index if not exists agent_skill_bindings_agent_idx
  on public.agent_skill_bindings (agent_id) where enabled;

grant select, insert, update, delete on public.agent_skill_bindings to authenticated;
grant all on public.agent_skill_bindings to service_role;
alter table public.agent_skill_bindings enable row level security;

create policy agent_skill_bindings_select on public.agent_skill_bindings for select to authenticated
  using (public.agent_is_visible(agent_id));
create policy agent_skill_bindings_insert on public.agent_skill_bindings for insert to authenticated
  with check (
    public.agent_is_visible(agent_id)
    and exists (
      select 1 from public.agent_skills s
      where s.id = skill_id
        and s.is_active
        and (s.user_id = auth.uid() or public.is_org_member(s.org_id))
    )
  );
create policy agent_skill_bindings_update on public.agent_skill_bindings for update to authenticated
  using (public.agent_is_visible(agent_id))
  with check (public.agent_is_visible(agent_id));
create policy agent_skill_bindings_delete on public.agent_skill_bindings for delete to authenticated
  using (public.agent_is_visible(agent_id));
