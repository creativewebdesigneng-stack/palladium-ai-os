create table if not exists public.builder_deployments (
  id uuid primary key default gen_random_uuid(),
  builder_job_id uuid not null references public.builder_jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'vercel' check (provider in ('vercel')),
  target text not null default 'preview' check (target in ('preview')),
  status text not null default 'queued' check (status in ('queued', 'uploading', 'building', 'ready', 'failed', 'cancelled')),
  provider_deployment_id text,
  url text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists builder_deployments_job_created_idx
  on public.builder_deployments (builder_job_id, created_at desc);

create index if not exists builder_deployments_user_created_idx
  on public.builder_deployments (user_id, created_at desc);

create unique index if not exists builder_deployments_active_preview_idx
  on public.builder_deployments (builder_job_id)
  where target = 'preview' and status in ('queued', 'uploading', 'building');

alter table public.builder_deployments enable row level security;

create policy "builder_deployments_select_own"
  on public.builder_deployments for select
  using (auth.uid() = user_id);

create policy "builder_deployments_insert_own"
  on public.builder_deployments for insert
  with check (auth.uid() = user_id);

create policy "builder_deployments_update_own"
  on public.builder_deployments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "builder_deployments_delete_own"
  on public.builder_deployments for delete
  using (auth.uid() = user_id);
