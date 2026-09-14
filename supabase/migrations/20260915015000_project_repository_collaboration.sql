-- Blackstar repository collaboration primitives: branches, issues, comments and releases.

create or replace function public.project_repository_create_branch(
  p_project_id uuid,
  p_name text,
  p_from_branch text
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_source public.project_repository_branches%rowtype;
  v_branch_id uuid;
begin
  if not private.can_write_project(p_project_id) then
    raise exception 'Project write access denied.';
  end if;
  if p_name is null
     or char_length(btrim(p_name)) not between 1 and 120
     or btrim(p_name) !~ '^[A-Za-z0-9._/-]+$'
     or btrim(p_name) ~ '(^|/)\.\.(/|$)'
     or btrim(p_name) ~ '^/'
     or btrim(p_name) ~ '/$' then
    raise exception 'Invalid branch name.';
  end if;

  select * into v_source
  from public.project_repository_branches
  where project_id = p_project_id and name = btrim(p_from_branch);

  if not found then
    insert into public.project_repository_branches(project_id, name, created_by, protected)
    values (p_project_id, btrim(p_from_branch), (select auth.uid()), btrim(p_from_branch) = 'main')
    on conflict (project_id, name) do nothing;

    select * into v_source
    from public.project_repository_branches
    where project_id = p_project_id and name = btrim(p_from_branch);
  end if;

  insert into public.project_repository_branches(
    project_id, name, head_commit_id, created_by, protected
  )
  values (
    p_project_id, btrim(p_name), v_source.head_commit_id, (select auth.uid()), false
  )
  returning id into v_branch_id;

  insert into public.project_repository_files(
    project_id, branch_name, path, content, mime_type, byte_size, content_hash, updated_by, updated_at
  )
  select
    project_id, btrim(p_name), path, content, mime_type, byte_size, content_hash,
    (select auth.uid()), now()
  from public.project_repository_files
  where project_id = p_project_id and branch_name = btrim(p_from_branch);

  return v_branch_id;
end;
$$;

revoke all on function public.project_repository_create_branch(uuid,text,text) from public;
grant execute on function public.project_repository_create_branch(uuid,text,text) to authenticated;

create table if not exists public.project_repository_issues (
  id uuid primary key default gen_random_uuid(),
  issue_number bigint generated always as identity,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 240),
  body text check (body is null or char_length(body) <= 20000),
  status text not null default 'open' check (status in ('open','closed')),
  labels text[] not null default '{}' check (cardinality(labels) <= 20),
  created_by uuid not null references auth.users(id) on delete restrict,
  assignee_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists public.project_repository_issue_comments (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.project_repository_issues(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 10000),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_repository_releases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  tag_name text not null check (char_length(tag_name) between 1 and 120),
  title text not null check (char_length(title) between 1 and 240),
  notes text check (notes is null or char_length(notes) <= 30000),
  commit_id uuid references public.project_repository_commits(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  draft boolean not null default false,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique(project_id, tag_name)
);

grant select, insert, update, delete on public.project_repository_issues to authenticated;
grant select, insert, update, delete on public.project_repository_issue_comments to authenticated;
grant select, insert, update, delete on public.project_repository_releases to authenticated;
grant all on public.project_repository_issues to service_role;
grant all on public.project_repository_issue_comments to service_role;
grant all on public.project_repository_releases to service_role;

alter table public.project_repository_issues enable row level security;
alter table public.project_repository_issue_comments enable row level security;
alter table public.project_repository_releases enable row level security;

create policy "repository_issues_read" on public.project_repository_issues
for select to authenticated using (private.can_read_project(project_id));
create policy "repository_issues_insert" on public.project_repository_issues
for insert to authenticated with check (
  created_by = (select auth.uid()) and private.can_read_project(project_id)
);
create policy "repository_issues_update" on public.project_repository_issues
for update to authenticated
using (created_by = (select auth.uid()) or private.can_write_project(project_id))
with check (private.can_read_project(project_id));
create policy "repository_issues_delete" on public.project_repository_issues
for delete to authenticated using (private.can_manage_project(project_id));

create policy "repository_issue_comments_read" on public.project_repository_issue_comments
for select to authenticated using (private.can_read_project(project_id));
create policy "repository_issue_comments_insert" on public.project_repository_issue_comments
for insert to authenticated with check (
  created_by = (select auth.uid()) and private.can_read_project(project_id)
);
create policy "repository_issue_comments_update" on public.project_repository_issue_comments
for update to authenticated
using (created_by = (select auth.uid()))
with check (created_by = (select auth.uid()) and private.can_read_project(project_id));
create policy "repository_issue_comments_delete" on public.project_repository_issue_comments
for delete to authenticated using (
  created_by = (select auth.uid()) or private.can_manage_project(project_id)
);

create policy "repository_releases_read" on public.project_repository_releases
for select to authenticated
using (private.can_read_project(project_id) and (draft = false or private.can_write_project(project_id)));
create policy "repository_releases_insert" on public.project_repository_releases
for insert to authenticated with check (
  created_by = (select auth.uid()) and private.can_write_project(project_id)
);
create policy "repository_releases_update" on public.project_repository_releases
for update to authenticated
using (private.can_write_project(project_id))
with check (private.can_write_project(project_id));
create policy "repository_releases_delete" on public.project_repository_releases
for delete to authenticated using (private.can_manage_project(project_id));

create index if not exists project_repo_issues_project_idx
  on public.project_repository_issues(project_id, status, updated_at desc);
create unique index if not exists project_repo_issue_number_unique
  on public.project_repository_issues(issue_number);
create index if not exists project_repo_issue_comments_idx
  on public.project_repository_issue_comments(issue_id, created_at asc);
create index if not exists project_repo_releases_project_idx
  on public.project_repository_releases(project_id, created_at desc);
