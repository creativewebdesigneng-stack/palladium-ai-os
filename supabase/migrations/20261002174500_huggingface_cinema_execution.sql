-- Hugging Face Cinema execution lane.
-- Extends the existing media job ledger and provisions a private output bucket.
-- Outputs are served through server-generated signed URLs only.

alter table public.media_generation_jobs
  drop constraint if exists media_generation_jobs_provider_check;

alter table public.media_generation_jobs
  add constraint media_generation_jobs_provider_check
  check (provider in ('seedream','ltx','short_video','cinema','huggingface_cinema'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cinema-hf-outputs',
  'cinema-hf-outputs',
  false,
  262144000,
  array['video/mp4','video/webm']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Deliberately no anon/authenticated storage.objects policies are created for
-- this bucket. Blackstar's service-role server stores outputs and creates
-- short-lived signed URLs after verifying media_generation_jobs ownership.
