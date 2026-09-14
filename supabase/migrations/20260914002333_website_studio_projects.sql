create table if not exists public.website_studio_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  slug text not null check (char_length(slug) between 1 and 120),
  prompt text,
  brief jsonb not null default '{}'::jsonb,
  pages jsonb not null default '[]'::jsonb,
  design_tokens jsonb not null default '{}'::jsonb,
  html text not null default '',
  css text not null default '',
  javascript text not null default '',
  framework text not null default 'html',
  status text not null default 'draft' check (status in ('draft','ready','published','archived')),
  preview_url text,
  production_url text,
  deployment_provider text,
  deployment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists website_studio_projects_user_slug_idx on public.website_studio_projects(user_id, slug);
create index if not exists website_studio_projects_user_updated_idx on public.website_studio_projects(user_id, updated_at desc);
alter table public.website_studio_projects enable row level security;
drop policy if exists "website studio select own" on public.website_studio_projects;
drop policy if exists "website studio insert own" on public.website_studio_projects;
drop policy if exists "website studio update own" on public.website_studio_projects;
drop policy if exists "website studio delete own" on public.website_studio_projects;
create policy "website studio select own" on public.website_studio_projects for select to authenticated using ((select auth.uid()) = user_id);
create policy "website studio insert own" on public.website_studio_projects for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "website studio update own" on public.website_studio_projects for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "website studio delete own" on public.website_studio_projects for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.website_studio_projects from anon;
grant select, insert, update, delete on public.website_studio_projects to authenticated;
