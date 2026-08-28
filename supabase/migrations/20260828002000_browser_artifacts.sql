-- Private metadata for files captured by browser agents. File bytes live in
-- the existing private `knowledge` storage bucket under the owner's user prefix.

create table if not exists public.browser_artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid null,
  agent_id uuid null,
  task_id uuid null,
  kind text not null default 'download',
  filename text not null,
  mime_type text null,
  size_bytes bigint not null,
  sha256 text not null,
  storage_path text not null,
  source_url text null,
  created_at timestamptz not null default now(),
  constraint browser_artifacts_size_check check (size_bytes >= 0 and size_bytes <= 26214400),
  constraint browser_artifacts_kind_check check (kind in ('download','screenshot','trace'))
);

create index if not exists browser_artifacts_user_created_idx
  on public.browser_artifacts(user_id, created_at desc);
create index if not exists browser_artifacts_task_idx
  on public.browser_artifacts(task_id) where task_id is not null;

alter table public.browser_artifacts enable row level security;

drop policy if exists "browser_artifacts_select_own" on public.browser_artifacts;
create policy "browser_artifacts_select_own"
  on public.browser_artifacts for select
  using (auth.uid() = user_id);

drop policy if exists "browser_artifacts_delete_own" on public.browser_artifacts;
create policy "browser_artifacts_delete_own"
  on public.browser_artifacts for delete
  using (auth.uid() = user_id);

comment on table public.browser_artifacts is
  'Owner-scoped metadata for private browser downloads/screenshots/traces. Raw bytes are never stored in tool execution logs.';
