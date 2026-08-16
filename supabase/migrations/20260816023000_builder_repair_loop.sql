alter table public.builder_jobs
  add column if not exists repair_status text not null default 'not_started',
  add column if not exists repair_manifest jsonb,
  add column if not exists repair_last_error text,
  add column if not exists repair_attempt integer not null default 0;

alter table public.builder_jobs
  drop constraint if exists builder_jobs_repair_status_check;

alter table public.builder_jobs
  add constraint builder_jobs_repair_status_check
  check (repair_status in ('not_started', 'generating', 'proposed', 'accepted', 'failed'));

alter table public.builder_jobs
  drop constraint if exists builder_jobs_repair_attempt_check;

alter table public.builder_jobs
  add constraint builder_jobs_repair_attempt_check
  check (repair_attempt >= 0 and repair_attempt <= 10);

create index if not exists builder_jobs_repair_status_idx
  on public.builder_jobs (user_id, repair_status, updated_at desc)
  where repair_status <> 'not_started';
