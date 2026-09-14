alter table public.website_studio_projects
  add column if not exists form_submit_token_hash text;

alter table public.website_studio_projects
  drop constraint if exists website_studio_projects_form_submit_token_hash_check;

alter table public.website_studio_projects
  add constraint website_studio_projects_form_submit_token_hash_check
  check (form_submit_token_hash is null or form_submit_token_hash ~ '^[0-9a-f]{64}$');

revoke all on public.website_studio_projects from anon;
