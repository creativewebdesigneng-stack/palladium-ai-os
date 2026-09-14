create table if not exists public.website_studio_collection_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.website_studio_projects(id) on delete cascade,
  collection_key text not null check (char_length(collection_key) between 1 and 120),
  slug text not null check (char_length(slug) between 1 and 160),
  title text not null default '',
  data jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, collection_key, slug)
);
create index if not exists website_studio_collection_items_project_idx on public.website_studio_collection_items(project_id, collection_key, updated_at desc);
alter table public.website_studio_collection_items enable row level security;
drop policy if exists "website studio collection owners read" on public.website_studio_collection_items;
drop policy if exists "website studio collection owners insert" on public.website_studio_collection_items;
drop policy if exists "website studio collection owners update" on public.website_studio_collection_items;
drop policy if exists "website studio collection owners delete" on public.website_studio_collection_items;
create policy "website studio collection owners read" on public.website_studio_collection_items for select to authenticated using (exists(select 1 from public.website_studio_projects p where p.id=project_id and p.user_id=(select auth.uid())));
create policy "website studio collection owners insert" on public.website_studio_collection_items for insert to authenticated with check (exists(select 1 from public.website_studio_projects p where p.id=project_id and p.user_id=(select auth.uid())));
create policy "website studio collection owners update" on public.website_studio_collection_items for update to authenticated using (exists(select 1 from public.website_studio_projects p where p.id=project_id and p.user_id=(select auth.uid()))) with check (exists(select 1 from public.website_studio_projects p where p.id=project_id and p.user_id=(select auth.uid())));
create policy "website studio collection owners delete" on public.website_studio_collection_items for delete to authenticated using (exists(select 1 from public.website_studio_projects p where p.id=project_id and p.user_id=(select auth.uid())));
revoke all on public.website_studio_collection_items from anon;
grant select,insert,update,delete on public.website_studio_collection_items to authenticated;
