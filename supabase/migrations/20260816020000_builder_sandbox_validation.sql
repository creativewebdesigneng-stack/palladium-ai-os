alter table public.builder_jobs
  add column if not exists sandbox_status text not null default 'not_started',
  add column if not exists sandbox_provider text,
  add column if not exists sandbox_id text,
  add column if not exists sandbox_results jsonb,
  add column if not exists sandbox_last_error text,
  add column if not exists sandbox_started_at timestamptz,
  add column if not exists sandbox_finished_at timestamptz;

alter table public.builder_jobs
  drop constraint if exists builder_jobs_sandbox_status_check;

alter table public.builder_jobs
  add constraint builder_jobs_sandbox_status_check
  check (sandbox_status in ('not_started', 'provisioning', 'running', 'passed', 'failed'));

create index if not exists builder_jobs_sandbox_status_idx
  on public.builder_jobs (user_id, sandbox_status, updated_at desc)
  where sandbox_status <> 'not_started';
