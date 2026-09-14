alter table public.website_studio_projects
  add column if not exists git_config jsonb not null default '{"connected":false,"provider":"github","repository":"","branch":"main","rootPath":""}'::jsonb;
alter table public.website_studio_projects
  add constraint website_studio_projects_git_config_object_check
  check (jsonb_typeof(git_config)='object') not valid;
alter table public.website_studio_projects
  validate constraint website_studio_projects_git_config_object_check;
