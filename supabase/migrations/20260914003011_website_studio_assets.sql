create table if not exists public.website_studio_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.website_studio_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  kind text not null default 'image' check (kind in ('image','video','font','document','other')),
  source_url text not null check (char_length(source_url) between 1 and 4000),
  alt_text text,
  provenance text,
  created_at timestamptz not null default now()
);
create index if not exists website_studio_assets_project_idx on public.website_studio_assets(project_id, created_at desc);
alter table public.website_studio_assets enable row level security;
drop policy if exists "website studio assets select own" on public.website_studio_assets;
drop policy if exists "website studio assets insert own" on public.website_studio_assets;
drop policy if exists "website studio assets update own" on public.website_studio_assets;
drop policy if exists "website studio assets delete own" on public.website_studio_assets;
create policy "website studio assets select own" on public.website_studio_assets for select to authenticated using ((select auth.uid())=user_id and exists(select 1 from public.website_studio_projects p where p.id=project_id and p.user_id=(select auth.uid())));
create policy "website studio assets insert own" on public.website_studio_assets for insert to authenticated with check ((select auth.uid())=user_id and exists(select 1 from public.website_studio_projects p where p.id=project_id and p.user_id=(select auth.uid())));
create policy "website studio assets update own" on public.website_studio_assets for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id and exists(select 1 from public.website_studio_projects p where p.id=project_id and p.user_id=(select auth.uid())));
create policy "website studio assets delete own" on public.website_studio_assets for delete to authenticated using ((select auth.uid())=user_id);
revoke all on public.website_studio_assets from anon;
grant select,insert,update,delete on public.website_studio_assets to authenticated;
