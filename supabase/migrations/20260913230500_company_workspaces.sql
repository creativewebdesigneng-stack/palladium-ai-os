create table if not exists public.company_workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  industry text,
  stage text check (stage is null or stage in ('start','build','grow','optimise','expand','transform')),
  geography text,
  mission text,
  company_context text,
  objectives jsonb not null default '[]'::jsonb,
  priorities jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  department_plan jsonb not null default '{}'::jsonb,
  ai_workforce_plan jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists company_workspaces_user_updated_idx on public.company_workspaces(user_id, updated_at desc);
alter table public.company_workspaces enable row level security;
revoke all on table public.company_workspaces from anon;
revoke all on table public.company_workspaces from authenticated;
grant select, insert, update, delete on table public.company_workspaces to authenticated;

create policy "company_workspaces_select_own" on public.company_workspaces for select to authenticated using ((select auth.uid()) = user_id);
create policy "company_workspaces_insert_own" on public.company_workspaces for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "company_workspaces_update_own" on public.company_workspaces for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "company_workspaces_delete_own" on public.company_workspaces for delete to authenticated using ((select auth.uid()) = user_id);
