-- Persistent Projects backend.
-- Supports personal projects and organisation-scoped projects with RLS.

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organisations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text,
  status text not null default 'active' check (status in ('active','paused','completed','archived')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  tags text[] not null default '{}',
  due_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.projects to authenticated;
grant all on public.projects to service_role;
alter table public.projects enable row level security;

-- Personal projects are accessible only to their owner. Organisation projects
-- are accessible to current organisation members. INSERT/UPDATE additionally
-- requires the authenticated user to remain the recorded creator or be an
-- organisation owner/admin for management actions performed through RLS.
create policy "projects_select_scope" on public.projects
for select to authenticated
using (
  (org_id is null and user_id = auth.uid())
  or
  (org_id is not null and exists (
    select 1 from public.organisation_members om
    where om.org_id = projects.org_id and om.user_id = auth.uid()
  ))
);

create policy "projects_insert_scope" on public.projects
for insert to authenticated
with check (
  user_id = auth.uid()
  and (
    org_id is null
    or exists (
      select 1 from public.organisation_members om
      where om.org_id = projects.org_id and om.user_id = auth.uid()
    )
  )
);

create policy "projects_update_scope" on public.projects
for update to authenticated
using (
  (org_id is null and user_id = auth.uid())
  or
  (org_id is not null and exists (
    select 1 from public.organisation_members om
    where om.org_id = projects.org_id
      and om.user_id = auth.uid()
      and om.role in ('owner','admin')
  ))
)
with check (
  (org_id is null and user_id = auth.uid())
  or
  (org_id is not null and exists (
    select 1 from public.organisation_members om
    where om.org_id = projects.org_id
      and om.user_id = auth.uid()
      and om.role in ('owner','admin')
  ))
);

create policy "projects_delete_scope" on public.projects
for delete to authenticated
using (
  (org_id is null and user_id = auth.uid())
  or
  (org_id is not null and exists (
    select 1 from public.organisation_members om
    where om.org_id = projects.org_id
      and om.user_id = auth.uid()
      and om.role in ('owner','admin')
  ))
);

create index if not exists projects_user_idx on public.projects(user_id, status, updated_at desc);
create index if not exists projects_org_idx on public.projects(org_id, status, updated_at desc) where org_id is not null;
create trigger projects_updated_at before update on public.projects
for each row execute function public.set_updated_at();

create table if not exists public.project_activity (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'updated',
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

grant select, insert on public.project_activity to authenticated;
grant all on public.project_activity to service_role;
alter table public.project_activity enable row level security;

create policy "project_activity_select_scope" on public.project_activity
for select to authenticated
using (exists (
  select 1 from public.projects p
  where p.id = project_activity.project_id
    and (
      (p.org_id is null and p.user_id = auth.uid())
      or (p.org_id is not null and exists (
        select 1 from public.organisation_members om
        where om.org_id = p.org_id and om.user_id = auth.uid()
      ))
    )
));

create policy "project_activity_insert_scope" on public.project_activity
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.projects p
    where p.id = project_activity.project_id
      and (
        (p.org_id is null and p.user_id = auth.uid())
        or (p.org_id is not null and exists (
          select 1 from public.organisation_members om
          where om.org_id = p.org_id and om.user_id = auth.uid()
        ))
      )
  )
);

create index if not exists project_activity_project_idx
  on public.project_activity(project_id, created_at desc);
