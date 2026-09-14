-- Blackstar native project repository access layer.
-- Private by default. Public projects are discoverable; collaborators receive explicit scoped access.

alter table public.projects
  add column if not exists visibility text not null default 'private'
    check (visibility in ('private','public')),
  add column if not exists slug text,
  add column if not exists default_branch text not null default 'main'
    check (char_length(default_branch) between 1 and 120),
  add column if not exists license text,
  add column if not exists homepage_url text;

update public.projects
set slug = lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'))
where slug is null;

update public.projects
set slug = 'project-' || left(id::text, 8)
where slug is null or slug = '';

alter table public.projects alter column slug set not null;

create unique index if not exists projects_personal_slug_unique
  on public.projects(user_id, slug)
  where org_id is null;

create unique index if not exists projects_org_slug_unique
  on public.projects(org_id, slug)
  where org_id is not null;

create index if not exists projects_public_discovery_idx
  on public.projects(visibility, updated_at desc)
  where visibility = 'public' and status <> 'archived';

create table if not exists public.project_collaborators (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer'
    check (role in ('viewer','contributor','maintainer')),
  added_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(project_id, user_id)
);

create table if not exists public.project_stars (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(project_id, user_id)
);

grant select on public.project_collaborators to authenticated;
grant insert, update, delete on public.project_collaborators to authenticated;
grant all on public.project_collaborators to service_role;
grant select, insert, delete on public.project_stars to authenticated;
grant all on public.project_stars to service_role;

alter table public.project_collaborators enable row level security;
alter table public.project_stars enable row level security;

-- Replace the original project SELECT policy with public/collaborator-aware access.
drop policy if exists "projects_select_scope" on public.projects;
create policy "projects_select_scope" on public.projects
for select to authenticated
using (
  visibility = 'public'
  or (org_id is null and user_id = (select auth.uid()))
  or (
    org_id is not null
    and exists (
      select 1
      from public.organisation_members om
      where om.org_id = projects.org_id
        and om.user_id = (select auth.uid())
    )
  )
  or exists (
    select 1
    from public.project_collaborators pc
    where pc.project_id = projects.id
      and pc.user_id = (select auth.uid())
  )
);

-- Collaborator policy checks use a narrowly scoped helper to avoid recursive
-- RLS evaluation between projects and project_collaborators.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.can_manage_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.projects p
      where p.id = target_project_id
        and (
          (p.org_id is null and p.user_id = (select auth.uid()))
          or (
            p.org_id is not null
            and exists (
              select 1
              from public.organisation_members om
              where om.org_id = p.org_id
                and om.user_id = (select auth.uid())
                and om.role in ('owner','admin')
            )
          )
        )
    );
$$;

revoke all on function private.can_manage_project(uuid) from public;
grant execute on function private.can_manage_project(uuid) to authenticated;

create policy "project_collaborators_select_scope" on public.project_collaborators
for select to authenticated
using (
  user_id = (select auth.uid())
  or added_by = (select auth.uid())
  or private.can_manage_project(project_id)
);

create policy "project_collaborators_insert_scope" on public.project_collaborators
for insert to authenticated
with check (
  added_by = (select auth.uid())
  and user_id <> (select auth.uid())
  and private.can_manage_project(project_id)
);

create policy "project_collaborators_update_scope" on public.project_collaborators
for update to authenticated
using (private.can_manage_project(project_id))
with check (
  user_id <> (select auth.uid())
  and private.can_manage_project(project_id)
);

create policy "project_collaborators_delete_scope" on public.project_collaborators
for delete to authenticated
using (
  user_id = (select auth.uid())
  or private.can_manage_project(project_id)
);

-- Stars can be read on public projects or projects the current user can already
-- access. Users can only create/delete their own star rows.
create policy "project_stars_select_scope" on public.project_stars
for select to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = project_stars.project_id
  )
);

create policy "project_stars_insert_own" on public.project_stars
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.projects p
    where p.id = project_stars.project_id
  )
);

create policy "project_stars_delete_own" on public.project_stars
for delete to authenticated
using (user_id = (select auth.uid()));

create index if not exists project_collaborators_user_idx
  on public.project_collaborators(user_id, project_id);
create index if not exists project_stars_project_idx
  on public.project_stars(project_id, created_at desc);
