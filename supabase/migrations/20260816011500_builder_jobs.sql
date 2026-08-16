create table if not exists public.builder_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  prompt text not null,
  status text not null default 'requested' check (status in ('requested', 'planning', 'planned', 'cancelled', 'failed')),
  plan jsonb,
  source_status text not null default 'not_started' check (source_status in ('not_started', 'generating', 'generated', 'failed')),
  source_manifest jsonb,
  source_last_error text,
  repository_full_name text,
  branch_name text,
  branch_approval_id uuid,
  repository_status text not null default 'not_started' check (repository_status in ('not_started', 'branch_approval_pending', 'branch_ready', 'files_approval_pending', 'files_applied', 'failed')),
  repository_last_error text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists builder_jobs_user_created_idx
  on public.builder_jobs (user_id, created_at desc);

alter table public.builder_jobs enable row level security;

create policy "builder_jobs_select_own"
  on public.builder_jobs for select
  using (auth.uid() = user_id);

create policy "builder_jobs_insert_own"
  on public.builder_jobs for insert
  with check (auth.uid() = user_id);

create policy "builder_jobs_update_own"
  on public.builder_jobs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "builder_jobs_delete_own"
  on public.builder_jobs for delete
  using (auth.uid() = user_id);
