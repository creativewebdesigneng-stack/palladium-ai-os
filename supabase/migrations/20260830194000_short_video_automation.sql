alter table public.media_generation_jobs
  drop constraint if exists media_generation_jobs_provider_check;

alter table public.media_generation_jobs
  add constraint media_generation_jobs_provider_check
  check (provider in ('seedream','ltx','short_video'));

insert into public.tools (slug, name, description, category, is_active, min_plan, requires_approval)
values (
  'short_video',
  'Automated Short Video',
  'Create and inspect bounded automated short-video jobs through Media Studio and the configured render worker.',
  'creative',
  true,
  'builder',
  false
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  is_active = true;
