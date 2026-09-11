-- Link generated 3D jobs back to approved Game Foundry content requirements.
alter table public.three_d_jobs
  add column if not exists content_requirement_id text;

create unique index if not exists three_d_jobs_project_requirement_unique
  on public.three_d_jobs(project_id, content_requirement_id)
  where project_id is not null and content_requirement_id is not null;
