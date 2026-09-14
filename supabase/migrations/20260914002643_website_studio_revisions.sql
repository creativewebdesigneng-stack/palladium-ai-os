create table if not exists public.website_studio_revisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.website_studio_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 160),
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists website_studio_revisions_project_created_idx on public.website_studio_revisions(project_id, created_at desc);
alter table public.website_studio_revisions enable row level security;
drop policy if exists "website studio revisions select own" on public.website_studio_revisions;
drop policy if exists "website studio revisions insert own" on public.website_studio_revisions;
drop policy if exists "website studio revisions delete own" on public.website_studio_revisions;
create policy "website studio revisions select own" on public.website_studio_revisions for select to authenticated using ((select auth.uid())=user_id and exists (select 1 from public.website_studio_projects p where p.id=project_id and p.user_id=(select auth.uid())));
create policy "website studio revisions insert own" on public.website_studio_revisions for insert to authenticated with check ((select auth.uid())=user_id and exists (select 1 from public.website_studio_projects p where p.id=project_id and p.user_id=(select auth.uid())));
create policy "website studio revisions delete own" on public.website_studio_revisions for delete to authenticated using ((select auth.uid())=user_id and exists (select 1 from public.website_studio_projects p where p.id=project_id and p.user_id=(select auth.uid())));
revoke all on public.website_studio_revisions from anon;
grant select, insert, delete on public.website_studio_revisions to authenticated;
