-- Repository integrity and quota hardening.

create or replace function private.prevent_repository_project_reassignment()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.project_id is distinct from old.project_id then
    raise exception 'Repository records cannot be moved between projects.';
  end if;
  return new;
end;
$$;

drop trigger if exists project_repo_branches_project_immutable on public.project_repository_branches;
create trigger project_repo_branches_project_immutable
before update on public.project_repository_branches
for each row execute function private.prevent_repository_project_reassignment();

drop trigger if exists project_repo_files_project_immutable on public.project_repository_files;
create trigger project_repo_files_project_immutable
before update on public.project_repository_files
for each row execute function private.prevent_repository_project_reassignment();

drop trigger if exists project_repo_issues_project_immutable on public.project_repository_issues;
create trigger project_repo_issues_project_immutable
before update on public.project_repository_issues
for each row execute function private.prevent_repository_project_reassignment();

drop trigger if exists project_repo_issue_comments_project_immutable on public.project_repository_issue_comments;
create trigger project_repo_issue_comments_project_immutable
before update on public.project_repository_issue_comments
for each row execute function private.prevent_repository_project_reassignment();

drop trigger if exists project_repo_releases_project_immutable on public.project_repository_releases;
create trigger project_repo_releases_project_immutable
before update on public.project_repository_releases
for each row execute function private.prevent_repository_project_reassignment();

drop trigger if exists project_repo_pull_requests_project_immutable on public.project_repository_pull_requests;
create trigger project_repo_pull_requests_project_immutable
before update on public.project_repository_pull_requests
for each row execute function private.prevent_repository_project_reassignment();

create or replace function private.prevent_collaborator_identity_reassignment()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.project_id is distinct from old.project_id
     or new.user_id is distinct from old.user_id
     or new.added_by is distinct from old.added_by then
    raise exception 'Collaborator identity fields are immutable.';
  end if;
  return new;
end;
$$;

drop trigger if exists project_collaborator_identity_immutable on public.project_collaborators;
create trigger project_collaborator_identity_immutable
before update on public.project_collaborators
for each row execute function private.prevent_collaborator_identity_reassignment();

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
    insert into public.project_repository_branches(project_id, name, created_by, protected)
    values (p_project_id, btrim(p_branch_name), (select auth.uid()), btrim(p_branch_name) = 'main')
    returning * into v_branch;
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
