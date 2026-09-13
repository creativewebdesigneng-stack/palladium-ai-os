create table if not exists public.industry_workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  industry text not null check (char_length(industry) between 1 and 120),
  geography text,
  organisation_context text,
  objectives text,
  maturity jsonb not null default '{}'::jsonb,
  opportunities jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  roadmap jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists industry_workspaces_user_updated_idx on public.industry_workspaces(user_id, updated_at desc);
alter table public.industry_workspaces enable row level security;
revoke all on table public.industry_workspaces from anon;
revoke all on table public.industry_workspaces from authenticated;
grant select, insert, update, delete on table public.industry_workspaces to authenticated;
drop policy if exists "industry_workspaces_select_own" on public.industry_workspaces;
create policy "industry_workspaces_select_own" on public.industry_workspaces for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "industry_workspaces_insert_own" on public.industry_workspaces;
create policy "industry_workspaces_insert_own" on public.industry_workspaces for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "industry_workspaces_update_own" on public.industry_workspaces;
create policy "industry_workspaces_update_own" on public.industry_workspaces for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "industry_workspaces_delete_own" on public.industry_workspaces;
create policy "industry_workspaces_delete_own" on public.industry_workspaces for delete to authenticated using ((select auth.uid()) = user_id);
