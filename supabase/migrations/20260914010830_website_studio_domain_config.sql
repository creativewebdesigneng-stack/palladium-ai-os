alter table public.website_studio_projects
  add column if not exists domain_config jsonb not null default '{"domain":"","verified":false,"verification":[],"lastCheckedAt":null}'::jsonb;

alter table public.website_studio_projects
  drop constraint if exists website_studio_projects_domain_config_object_check;

alter table public.website_studio_projects
  add constraint website_studio_projects_domain_config_object_check
  check (jsonb_typeof(domain_config)='object');
