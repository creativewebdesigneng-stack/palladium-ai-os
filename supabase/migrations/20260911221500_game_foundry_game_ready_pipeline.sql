-- Blackstar Game Foundry game-ready asset processing.
-- Extends canonical 3D jobs; no duplicate asset-processing job store.

alter table public.three_d_jobs
  add column if not exists processing_profile jsonb not null default '{}'::jsonb,
  add column if not exists validation_report jsonb not null default '{}'::jsonb,
  add column if not exists processed_output_url text,
  add column if not exists processing_worker_job_id text,
  add column if not exists processing_status text not null default 'not_started'
    check (processing_status in ('not_started','queued','running','completed','failed','cancelled'));

create index if not exists three_d_jobs_processing_status_idx
  on public.three_d_jobs(user_id, processing_status, created_at desc);
