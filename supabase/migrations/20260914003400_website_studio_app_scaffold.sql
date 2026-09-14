alter table public.website_studio_projects
  add column if not exists app_config jsonb not null default '{"forms":[],"collections":[],"auth":{"enabled":false,"providers":[]}}'::jsonb;

alter table public.website_studio_projects
  add constraint website_studio_projects_app_config_object_check
  check (jsonb_typeof(app_config)='object') not valid;

alter table public.website_studio_projects
  validate constraint website_studio_projects_app_config_object_check;
