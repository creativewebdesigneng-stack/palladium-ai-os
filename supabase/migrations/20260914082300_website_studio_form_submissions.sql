create table if not exists public.website_studio_form_submissions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.website_studio_projects(id) on delete cascade,
  form_key text not null check (char_length(form_key) between 1 and 120),
  payload jsonb not null default '{}'::jsonb,
  source_url text,
  user_agent text,
  submit_token_hash text not null check (submit_token_hash ~ '^[0-9a-f]{64} text not null default 'new' check (status in ('new','reviewed','archived','spam')),
  created_at timestamptz not null default now()
);

create index if not exists website_studio_form_submissions_project_created_idx
  on public.website_studio_form_submissions(project_id, created_at desc);

alter table public.website_studio_form_submissions enable row level security;

drop policy if exists "website studio submission owners read" on public.website_studio_form_submissions;
drop policy if exists "website studio submission owners update" on public.website_studio_form_submissions;
drop policy if exists "website studio public submit published" on public.website_studio_form_submissions;

create policy "website studio submission owners read"
  on public.website_studio_form_submissions for select to authenticated
  using (exists (
    select 1 from public.website_studio_projects p
    where p.id = project_id and p.user_id = (select auth.uid())
  ));

create policy "website studio submission owners update"
  on public.website_studio_form_submissions for update to authenticated
  using (exists (
    select 1 from public.website_studio_projects p
    where p.id = project_id and p.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.website_studio_projects p
    where p.id = project_id and p.user_id = (select auth.uid())
  ));

revoke all on public.website_studio_form_submissions from anon;
grant select, update on public.website_studio_form_submissions to authenticated;
),
  status text not null default 'new' check (status in ('new','reviewed','archived','spam')),
  created_at timestamptz not null default now()
);

create index if not exists website_studio_form_submissions_project_created_idx
  on public.website_studio_form_submissions(project_id, created_at desc);

alter table public.website_studio_form_submissions enable row level security;

drop policy if exists "website studio submission owners read" on public.website_studio_form_submissions;
drop policy if exists "website studio submission owners update" on public.website_studio_form_submissions;
drop policy if exists "website studio public submit published" on public.website_studio_form_submissions;

create policy "website studio submission owners read"
  on public.website_studio_form_submissions for select to authenticated
  using (exists (
    select 1 from public.website_studio_projects p
    where p.id = project_id and p.user_id = (select auth.uid())
  ));

create policy "website studio submission owners update"
  on public.website_studio_form_submissions for update to authenticated
  using (exists (
    select 1 from public.website_studio_projects p
    where p.id = project_id and p.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.website_studio_projects p
    where p.id = project_id and p.user_id = (select auth.uid())
  ));

revoke all on public.website_studio_form_submissions from anon;
grant select, update on public.website_studio_form_submissions to authenticated;
