-- Optimize older Projects RLS policies by evaluating auth.uid() once per statement.

drop policy if exists "projects_insert_scope" on public.projects;
create policy "projects_insert_scope" on public.projects
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (
    org_id is null
    or exists (
      select 1 from public.organisation_members om
      where om.org_id = projects.org_id and om.user_id = (select auth.uid())
    )
  )
);

drop policy if exists "projects_update_scope" on public.projects;
create policy "projects_update_scope" on public.projects
for update to authenticated
using (
  (org_id is null and user_id = (select auth.uid()))
  or
  (org_id is not null and exists (
    select 1 from public.organisation_members om
    where om.org_id = projects.org_id
      and om.user_id = (select auth.uid())
      and om.role in ('owner','admin')
  ))
)
with check (
  (org_id is null and user_id = (select auth.uid()))
  or
  (org_id is not null and exists (
    select 1 from public.organisation_members om
    where om.org_id = projects.org_id
      and om.user_id = (select auth.uid())
      and om.role in ('owner','admin')
  ))
);

drop policy if exists "projects_delete_scope" on public.projects;
create policy "projects_delete_scope" on public.projects
for delete to authenticated
using (
  (org_id is null and user_id = (select auth.uid()))
  or
  (org_id is not null and exists (
    select 1 from public.organisation_members om
    where om.org_id = projects.org_id
      and om.user_id = (select auth.uid())
      and om.role in ('owner','admin')
  ))
);

drop policy if exists "project_activity_select_scope" on public.project_activity;
create policy "project_activity_select_scope" on public.project_activity
for select to authenticated
using (exists (
  select 1 from public.projects p
  where p.id = project_activity.project_id
    and (
      (p.org_id is null and p.user_id = (select auth.uid()))
      or (p.org_id is not null and exists (
        select 1 from public.organisation_members om
        where om.org_id = p.org_id and om.user_id = (select auth.uid())
      ))
    )
));

drop policy if exists "project_activity_insert_scope" on public.project_activity;
create policy "project_activity_insert_scope" on public.project_activity
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.projects p
    where p.id = project_activity.project_id
      and (
        (p.org_id is null and p.user_id = (select auth.uid()))
        or (p.org_id is not null and exists (
          select 1 from public.organisation_members om
          where om.org_id = p.org_id and om.user_id = (select auth.uid())
        ))
      )
  )
);

drop policy if exists "project_resources_select_scope" on public.project_resources;
create policy "project_resources_select_scope" on public.project_resources
for select to authenticated
using (exists (
  select 1 from public.projects p
  where p.id = project_resources.project_id
    and (
      (p.org_id is null and p.user_id = (select auth.uid()))
      or (p.org_id is not null and exists (
        select 1 from public.organisation_members om
        where om.org_id = p.org_id and om.user_id = (select auth.uid())
      ))
    )
));

drop policy if exists "project_resources_insert_scope" on public.project_resources;
create policy "project_resources_insert_scope" on public.project_resources
for insert to authenticated
with check (
  added_by = (select auth.uid())
  and exists (
    select 1 from public.projects p
    where p.id = project_resources.project_id
      and (
        (p.org_id is null and p.user_id = (select auth.uid()))
        or (p.org_id is not null and exists (
          select 1 from public.organisation_members om
          where om.org_id = p.org_id
            and om.user_id = (select auth.uid())
            and om.role in ('owner','admin')
        ))
      )
  )
);

drop policy if exists "project_resources_delete_scope" on public.project_resources;
create policy "project_resources_delete_scope" on public.project_resources
for delete to authenticated
using (exists (
  select 1 from public.projects p
  where p.id = project_resources.project_id
    and (
      (p.org_id is null and p.user_id = (select auth.uid()))
      or (p.org_id is not null and exists (
        select 1 from public.organisation_members om
        where om.org_id = p.org_id
          and om.user_id = (select auth.uid())
          and om.role in ('owner','admin')
      ))
    )
));
