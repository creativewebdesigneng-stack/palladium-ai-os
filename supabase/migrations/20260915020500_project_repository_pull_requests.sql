-- Blackstar native pull requests and atomic branch merge.

create table if not exists public.project_repository_pull_requests (
  id uuid primary key default gen_random_uuid(),
  pr_number bigint generated always as identity,
  project_id uuid not null references public.projects(id) on delete cascade,
  source_branch text not null check (char_length(source_branch) between 1 and 120),
  target_branch text not null check (char_length(target_branch) between 1 and 120),
  title text not null check (char_length(title) between 1 and 240),
  body text check (body is null or char_length(body) <= 20000),
  status text not null default 'open' check (status in ('open','merged','closed')),
  created_by uuid not null references auth.users(id) on delete restrict,
  merged_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  merged_at timestamptz,
  check (source_branch <> target_branch)
);

grant select, insert, update, delete on public.project_repository_pull_requests to authenticated;
grant all on public.project_repository_pull_requests to service_role;
alter table public.project_repository_pull_requests enable row level security;

create policy "repository_pull_requests_read" on public.project_repository_pull_requests
for select to authenticated using (private.can_read_project(project_id));
create policy "repository_pull_requests_insert" on public.project_repository_pull_requests
for insert to authenticated with check (
  created_by = (select auth.uid()) and private.can_write_project(project_id)
);
create policy "repository_pull_requests_update" on public.project_repository_pull_requests
for update to authenticated
using (created_by = (select auth.uid()) or private.can_write_project(project_id))
with check (private.can_read_project(project_id));
create policy "repository_pull_requests_delete" on public.project_repository_pull_requests
for delete to authenticated using (private.can_manage_project(project_id));

create index if not exists project_repo_pull_requests_idx
  on public.project_repository_pull_requests(project_id, status, updated_at desc);
create unique index if not exists project_repo_pr_number_unique
  on public.project_repository_pull_requests(pr_number);

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
  if not private.can_write_project(p_project_id) then
    raise exception 'Project write access denied.';
  end if;

  select * into v_pr
  from public.project_repository_pull_requests
  where id = p_pull_request_id
    and project_id = p_project_id
  for update;

  if not found then
    raise exception 'Pull request not found.';
  end if;
  if v_pr.status <> 'open' then
    raise exception 'Only open pull requests can be merged.';
  end if;

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

  insert into public.project_repository_commit_files(
    commit_id, project_id, path, deleted
  )
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
