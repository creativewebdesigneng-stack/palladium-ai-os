-- Native Work OS primitives inspired by Plane/OpenProject, integrated into PalladiumAI projects.
-- Reuses public.projects as the workspace boundary instead of introducing a duplicate project system.

create table if not exists public.project_cycles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  goal text,
  status text not null default 'planned' check (status in ('planned','active','completed','cancelled')),
  starts_at timestamptz,
  ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create table if not exists public.project_modules (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text,
  status text not null default 'planned' check (status in ('backlog','planned','in_progress','completed','cancelled')),
  target_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_work_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  cycle_id uuid references public.project_cycles(id) on delete set null,
  module_id uuid references public.project_modules(id) on delete set null,
  parent_id uuid references public.project_work_items(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 240),
  description text,
  status text not null default 'backlog' check (status in ('backlog','todo','in_progress','in_review','done','cancelled')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  estimate numeric(8,2) check (estimate is null or estimate >= 0),
  assignee_type text not null default 'unassigned' check (assignee_type in ('unassigned','human','agent')),
  assignee_id uuid,
  sort_order numeric(20,6) not null default 0,
  starts_at timestamptz,
  due_at timestamptz,
  completed_at timestamptz,
  labels text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (due_at is null or starts_at is null or due_at >= starts_at),
  check ((assignee_type = 'unassigned' and assignee_id is null) or assignee_type <> 'unassigned')
);

create index if not exists project_cycles_project_idx on public.project_cycles(project_id, status, starts_at);
create index if not exists project_modules_project_idx on public.project_modules(project_id, status, target_at);
create index if not exists project_work_items_project_idx on public.project_work_items(project_id, status, sort_order, created_at);
create index if not exists project_work_items_cycle_idx on public.project_work_items(cycle_id, status) where cycle_id is not null;
create index if not exists project_work_items_module_idx on public.project_work_items(module_id, status) where module_id is not null;
create index if not exists project_work_items_parent_idx on public.project_work_items(parent_id) where parent_id is not null;

create trigger project_cycles_updated_at before update on public.project_cycles
for each row execute function public.set_updated_at();
create trigger project_modules_updated_at before update on public.project_modules
for each row execute function public.set_updated_at();
create trigger project_work_items_updated_at before update on public.project_work_items
for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.project_cycles to authenticated;
grant select, insert, update, delete on public.project_modules to authenticated;
grant select, insert, update, delete on public.project_work_items to authenticated;
grant all on public.project_cycles, public.project_modules, public.project_work_items to service_role;

alter table public.project_cycles enable row level security;
alter table public.project_modules enable row level security;
alter table public.project_work_items enable row level security;

-- All Work OS records inherit access from their parent project. Personal records are owner-only;
-- organisation records are visible and editable to current organisation members.
do $$
declare
  table_name text;
begin
  foreach table_name in array array['project_cycles','project_modules','project_work_items']
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (exists (select 1 from public.projects p where p.id = %I.project_id and ((p.org_id is null and p.user_id = auth.uid()) or (p.org_id is not null and exists (select 1 from public.organisation_members om where om.org_id = p.org_id and om.user_id = auth.uid())))))',
      table_name || '_select_scope', table_name, table_name
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (created_by = auth.uid() and exists (select 1 from public.projects p where p.id = %I.project_id and ((p.org_id is null and p.user_id = auth.uid()) or (p.org_id is not null and exists (select 1 from public.organisation_members om where om.org_id = p.org_id and om.user_id = auth.uid())))))',
      table_name || '_insert_scope', table_name, table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (exists (select 1 from public.projects p where p.id = %I.project_id and ((p.org_id is null and p.user_id = auth.uid()) or (p.org_id is not null and exists (select 1 from public.organisation_members om where om.org_id = p.org_id and om.user_id = auth.uid()))))) with check (exists (select 1 from public.projects p where p.id = %I.project_id and ((p.org_id is null and p.user_id = auth.uid()) or (p.org_id is not null and exists (select 1 from public.organisation_members om where om.org_id = p.org_id and om.user_id = auth.uid())))))',
      table_name || '_update_scope', table_name, table_name, table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (exists (select 1 from public.projects p where p.id = %I.project_id and ((p.org_id is null and p.user_id = auth.uid()) or (p.org_id is not null and exists (select 1 from public.organisation_members om where om.org_id = p.org_id and om.user_id = auth.uid())))))',
      table_name || '_delete_scope', table_name, table_name
    );
  end loop;
end $$;
