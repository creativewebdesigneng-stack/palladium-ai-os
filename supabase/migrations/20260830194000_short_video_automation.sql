alter table public.media_generation_jobs
  drop constraint if exists media_generation_jobs_provider_check;

alter table public.media_generation_jobs
  add constraint media_generation_jobs_provider_check
  check (provider in ('seedream','ltx','short_video'));
