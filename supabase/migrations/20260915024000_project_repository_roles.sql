-- Enforce repository role separation and protected-branch workflow.

create or replace function private.can_maintain_project(target_project_id uuid)
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
          or exists (
            select 1
            from public.project_collaborators pc
            where pc.project_id = p.id
              and pc.user_id = (select auth.uid())
              and pc.role = 'maintainer'
          )
        )
    );
$$;

revoke all on function private.can_maintain_project(uuid) from public;
grant execute on function private.can_maintain_project(uuid) to authenticated;

drop policy if exists "repository_releases_insert" on public.project_repository_releases;
drop policy if exists "repository_releases_update" on public.project_repository_releases;
create policy "repository_releases_insert" on public.project_repository_releases
for insert to authenticated with check (
  created_by = (select auth.uid()) and private.can_maintain_project(project_id)
);
create policy "repository_releases_update" on public.project_repository_releases
for update to authenticated
using (private.can_maintain_project(project_id))
with check (private.can_maintain_project(project_id));

create or replace function public.project_repository_commit_file(
  p_project_id uuid,
  p_branch_name text,
  p_path text,
  p_content text,
  p_message text,
  p_mime_type text default 'text/plain'
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_branch public.project_repository_branches%rowtype;
  v_commit_id uuid;
  v_size integer;
  v_hash text;
  v_other_bytes bigint;
begin
  if not private.can_write_project(p_project_id) then
    raise exception 'Project write access denied.';
  end if;
  if p_branch_name is null or char_length(btrim(p_branch_name)) not between 1 and 120 then
    raise exception 'Invalid branch name.';
  end if;
  if p_path is null
     or char_length(p_path) not between 1 and 500
     or p_path ~ '(^|/)\.\.(/|$)'
     or p_path ~ '^/'
     or p_path ~ '/$' then
    raise exception 'Invalid repository path.';
  end if;
  if p_message is null or char_length(btrim(p_message)) not between 1 and 500 then
    raise exception 'Commit message is required.';
  end if;

  select * into v_branch
  from public.project_repository_branches
  where project_id = p_project_id and name = btrim(p_branch_name)
  for update;

  if not found then
    if btrim(p_branch_name) = 'main' and not private.can_maintain_project(p_project_id) then
      raise exception 'The protected main branch requires maintainer access. Commit on a feature branch and open a pull request.';
    end if;
    insert into public.project_repository_branches(project_id, name, created_by, protected)
    values (p_project_id, btrim(p_branch_name), (select auth.uid()), btrim(p_branch_name) = 'main')
    returning * into v_branch;
  end if;

  if v_branch.protected and not private.can_maintain_project(p_project_id) then
    raise exception 'Protected branches require maintainer access. Commit on a feature branch and open a pull request.';
  end if;

  if p_content is not null then
    v_size := octet_length(convert_to(p_content, 'UTF8'));
    if v_size > 1048576 then
      raise exception 'Repository text files are limited to 1 MiB.';
    end if;

    select coalesce(sum(byte_size), 0)
      into v_other_bytes
    from public.project_repository_files
    where project_id = p_project_id
      and branch_name = btrim(p_branch_name)
      and path <> p_path;

    if v_other_bytes + v_size > 26214400 then
      raise exception 'Repository branch text storage is limited to 25 MiB.';
    end if;
  end if;

  insert into public.project_repository_commits(
    project_id, parent_commit_id, branch_name, author_id, message
  )
  values (
    p_project_id, v_branch.head_commit_id, btrim(p_branch_name), (select auth.uid()), btrim(p_message)
  )
  returning id into v_commit_id;

  if p_content is null then
    delete from public.project_repository_files
    where project_id = p_project_id
      and branch_name = btrim(p_branch_name)
      and path = p_path;

    insert into public.project_repository_commit_files(
      commit_id, project_id, path, deleted
    ) values (
      v_commit_id, p_project_id, p_path, true
    );
  else
    v_hash := md5(p_content);
    insert into public.project_repository_files(
      project_id, branch_name, path, content, mime_type, byte_size, content_hash, updated_by
    )
    values (
      p_project_id, btrim(p_branch_name), p_path, p_content,
      coalesce(nullif(btrim(p_mime_type), ''), 'text/plain'),
      v_size, v_hash, (select auth.uid())
    )
    on conflict (project_id, branch_name, path)
    do update set
      content = excluded.content,
      mime_type = excluded.mime_type,
      byte_size = excluded.byte_size,
      content_hash = excluded.content_hash,
      updated_by = excluded.updated_by,
      updated_at = now();

    insert into public.project_repository_commit_files(
      commit_id, project_id, path, content, mime_type, byte_size, content_hash, deleted
    )
    values (
      v_commit_id, p_project_id, p_path, p_content,
      coalesce(nullif(btrim(p_mime_type), ''), 'text/plain'),
      v_size, v_hash, false
    );
  end if;

  update public.project_repository_branches
  set head_commit_id = v_commit_id, updated_at = now()
  where id = v_branch.id;

  return v_commit_id;
end;
$$;

revoke all on function public.project_repository_commit_file(uuid,text,text,text,text,text) from public;
grant execute on function public.project_repository_commit_file(uuid,text,text,text,text,text) to authenticated;

create or replace function public.project_repository_merge_pull_request(
  p_project_id uuid,
  p_pull_request_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_pr public.project_repository_pull_requests%rowtype;
  v_source public.project_repository_branches%rowtype;
  v_target public.project_repository_branches%rowtype;
  v_commit_id uuid;
begin
  if not private.can_maintain_project(p_project_id) then
    raise exception 'Maintainer access is required to merge pull requests.';
  end if;

  select * into v_pr
  from public.project_repository_pull_requests
  where id = p_pull_request_id
    and project_id = p_project_id
  for update;

  if not found then raise exception 'Pull request not found.'; end if;
  if v_pr.status <> 'open' then raise exception 'Only open pull requests can be merged.'; end if;

  select * into v_source
  from public.project_repository_branches
  where project_id = p_project_id and name = v_pr.source_branch
  for update;
  if not found then raise exception 'Source branch not found.'; end if;

  select * into v_target
  from public.project_repository_branches
  where project_id = p_project_id and name = v_pr.target_branch
  for update;
  if not found then raise exception 'Target branch not found.'; end if;

  insert into public.project_repository_commits(
    project_id, parent_commit_id, branch_name, author_id, message
  )
  values (
    p_project_id,
    v_target.head_commit_id,
    v_pr.target_branch,
    (select auth.uid()),
    'Merge PR #' || v_pr.pr_number::text || ': ' || v_pr.title
  )
  returning id into v_commit_id;

  insert into public.project_repository_commit_files(commit_id, project_id, path, deleted)
  select v_commit_id, p_project_id, target.path, true
  from public.project_repository_files target
  where target.project_id = p_project_id
    and target.branch_name = v_pr.target_branch
    and not exists (
      select 1 from public.project_repository_files source
      where source.project_id = p_project_id
        and source.branch_name = v_pr.source_branch
        and source.path = target.path
    );

  delete from public.project_repository_files
  where project_id = p_project_id and branch_name = v_pr.target_branch;

  insert into public.project_repository_files(
    project_id, branch_name, path, content, mime_type, byte_size, content_hash, updated_by, updated_at
  )
  select
    project_id, v_pr.target_branch, path, content, mime_type, byte_size, content_hash,
    (select auth.uid()), now()
  from public.project_repository_files
  where project_id = p_project_id and branch_name = v_pr.source_branch;

  insert into public.project_repository_commit_files(
    commit_id, project_id, path, content, mime_type, byte_size, content_hash, deleted
  )
  select
    v_commit_id, p_project_id, path, content, mime_type, byte_size, content_hash, false
  from public.project_repository_files
  where project_id = p_project_id and branch_name = v_pr.target_branch;

  update public.project_repository_branches
  set head_commit_id = v_commit_id, updated_at = now()
  where id = v_target.id;

  update public.project_repository_pull_requests
  set status = 'merged',
      merged_by = (select auth.uid()),
      merged_at = now(),
      updated_at = now()
  where id = p_pull_request_id;

  return v_commit_id;
end;
$$;

revoke all on function public.project_repository_merge_pull_request(uuid,uuid) from public;
grant execute on function public.project_repository_merge_pull_request(uuid,uuid) to authenticated;
