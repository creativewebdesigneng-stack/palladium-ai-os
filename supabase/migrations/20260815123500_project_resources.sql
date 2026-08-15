-- Links real PalladiumAI resources to projects. Resource ownership/scope is
-- validated by authenticated server functions before insertion; RLS ensures
-- callers can only see or mutate links beneath projects they can access.

create table public.project_resources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  resource_type text not null check (resource_type in ('agent','workflow')),
  resource_id uuid not null,
  added_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(project_id, resource_type, resource_id)
);

grant select, insert, delete on public.project_resources to authenticated;
grant all on public.project_resources to service_role;
alter table public.project_resources enable row level security;

create policy "project_resources_select_scope" on public.project_resources
for select to authenticated
using (exists (
  select 1 from public.projects p
  where p.id = project_resources.project_id
    and (
      (p.org_id is null and p.user_id = auth.uid())
      or (p.org_id is not null and exists (
        select 1 from public.organisation_members om
        where om.org_id = p.org_id and om.user_id = auth.uid()
      ))
    )
));

create policy "project_resources_insert_scope" on public.project_resources
for insert to authenticated
with check (
  added_by = auth.uid()
  and exists (
    select 1 from public.projects p
    where p.id = project_resources.project_id
      and (
        (p.org_id is null and p.user_id = auth.uid())
        or (p.org_id is not null and exists (
          select 1 from public.organisation_members om
          where om.org_id = p.org_id
            and om.user_id = auth.uid()
            and om.role in ('owner','admin')
        ))
      )
  )
);

create policy "project_resources_delete_scope" on public.project_resources
for delete to authenticated
using (exists (
  select 1 from public.projects p
  where p.id = project_resources.project_id
    and (
      (p.org_id is null and p.user_id = auth.uid())
      or (p.org_id is not null and exists (
        select 1 from public.organisation_members om
        where om.org_id = p.org_id
          and om.user_id = auth.uid()
          and om.role in ('owner','admin')
      ))
    )
));

create index project_resources_project_idx
  on public.project_resources(project_id, resource_type, created_at desc);
create index project_resources_resource_idx
  on public.project_resources(resource_type, resource_id);
