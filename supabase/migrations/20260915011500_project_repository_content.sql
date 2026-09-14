-- Blackstar native repository content, branch, commit and collaborator operations.
-- Text repository files are versioned transactionally; binary assets remain outside
-- this first native repository slice and are never silently accepted as text.

create table if not exists public.project_repository_commits (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  parent_commit_id uuid references public.project_repository_commits(id) on delete set null,
  branch_name text not null check (char_length(branch_name) between 1 and 120),
  author_id uuid not null references auth.users(id) on delete restrict,
  message text not null check (char_length(message) between 1 and 500),
  created_at timestamptz not null default now()
);

create table if not exists public.project_repository_branches (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  head_commit_id uuid references public.project_repository_commits(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  protected boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, name)
);

create table if not exists public.project_repository_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  branch_name text not null check (char_length(branch_name) between 1 and 120),
  path text not null check (
    char_length(path) between 1 and 500
    and path !~ '(^|/)\.\.(/|$)'
    and path !~ '^/'
    and path !~ '/$'
  ),
  content text not null,
  mime_type text not null default 'text/plain' check (char_length(mime_type) between 1 and 120),
  byte_size integer not null check (byte_size >= 0 and byte_size <= 1048576),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{32}$'),
  updated_by uuid not null references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now(),
  unique(project_id, branch_name, path)
);

create table if not exists public.project_repository_commit_files (
  id uuid primary key default gen_random_uuid(),
  commit_id uuid not null references public.project_repository_commits(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  path text not null check (char_length(path) between 1 and 500),
  content text,
  mime_type text,
  byte_size integer check (byte_size is null or (byte_size >= 0 and byte_size <= 1048576)),
  content_hash text,
  deleted boolean not null default false,
  unique(commit_id, path)
);

grant select, insert, update, delete on public.project_repository_commits to authenticated;
grant select, insert, update, delete on public.project_repository_branches to authenticated;
grant select, insert, update, delete on public.project_repository_files to authenticated;
grant select, insert, update, delete on public.project_repository_commit_files to authenticated;
grant all on public.project_repository_commits to service_role;
grant all on public.project_repository_branches to service_role;
grant all on public.project_repository_files to service_role;
grant all on public.project_repository_commit_files to service_role;

alter table public.project_repository_commits enable row level security;
alter table public.project_repository_branches enable row level security;
alter table public.project_repository_files enable row level security;
alter table public.project_repository_commit_files enable row level security;

create or replace function private.can_read_project(target_project_id uuid)
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
          p.visibility = 'public'
          or (p.org_id is null and p.user_id = (select auth.uid()))
          or (
            p.org_id is not null
            and exists (
              select 1 from public.organisation_members om
              where om.org_id = p.org_id and om.user_id = (select auth.uid())
            )
          )
          or exists (
            select 1 from public.project_collaborators pc
            where pc.project_id = p.id and pc.user_id = (select auth.uid())
          )
        )
    );
$$;

create or replace function private.can_write_project(target_project_id uuid)
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
              select 1 from public.organisation_members om
              where om.org_id = p.org_id
                and om.user_id = (select auth.uid())
                and om.role in ('owner','admin')
            )
          )
          or exists (
            select 1 from public.project_collaborators pc
            where pc.project_id = p.id
              and pc.user_id = (select auth.uid())
              and pc.role in ('contributor','maintainer')
          )
        )
    );
$$;

revoke all on function private.can_read_project(uuid) from public;
revoke all on function private.can_write_project(uuid) from public;
grant execute on function private.can_read_project(uuid) to authenticated;
grant execute on function private.can_write_project(uuid) to authenticated;

create policy "repository_commits_read" on public.project_repository_commits
for select to authenticated using (private.can_read_project(project_id));
create policy "repository_commits_write" on public.project_repository_commits
for insert to authenticated with check (
  author_id = (select auth.uid()) and private.can_write_project(project_id)
);

create policy "repository_branches_read" on public.project_repository_branches
for select to authenticated using (private.can_read_project(project_id));
create policy "repository_branches_insert" on public.project_repository_branches
for insert to authenticated with check (
  created_by = (select auth.uid()) and private.can_write_project(project_id)
);
create policy "repository_branches_update" on public.project_repository_branches
for update to authenticated
using (private.can_write_project(project_id))
with check (private.can_write_project(project_id));
create policy "repository_branches_delete" on public.project_repository_branches
for delete to authenticated using (
  private.can_manage_project(project_id) and protected = false
);

create policy "repository_files_read" on public.project_repository_files
for select to authenticated using (private.can_read_project(project_id));
create policy "repository_files_insert" on public.project_repository_files
for insert to authenticated with check (
  updated_by = (select auth.uid()) and private.can_write_project(project_id)
);
create policy "repository_files_update" on public.project_repository_files
for update to authenticated
using (private.can_write_project(project_id))
with check (
  updated_by = (select auth.uid()) and private.can_write_project(project_id)
);
create policy "repository_files_delete" on public.project_repository_files
for delete to authenticated using (private.can_write_project(project_id));

create policy "repository_commit_files_read" on public.project_repository_commit_files
for select to authenticated using (private.can_read_project(project_id));
create policy "repository_commit_files_write" on public.project_repository_commit_files
for insert to authenticated with check (private.can_write_project(project_id));

create index if not exists project_repo_commits_project_idx
  on public.project_repository_commits(project_id, created_at desc);
create index if not exists project_repo_branches_project_idx
  on public.project_repository_branches(project_id, name);
create index if not exists project_repo_files_project_idx
  on public.project_repository_files(project_id, branch_name, path);
create index if not exists project_repo_commit_files_commit_idx
  on public.project_repository_commit_files(commit_id, path);

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
    v_size := octet_length(convert_to(p_content, 'UTF8'));
    if v_size > 1048576 then
      raise exception 'Repository text files are limited to 1 MiB.';
    end if;
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
