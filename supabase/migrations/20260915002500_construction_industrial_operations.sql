-- Blackstar Construction & Industrial operations foundation.
create table public.construction_workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  organisation_name text,
  sector text not null default 'construction',
  currency text not null default 'GBP',
  timezone text not null default 'Europe/London',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.construction_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.construction_workspaces(id) on delete cascade,
  name text not null, project_number text, client_name text, location_text text,
  status text not null default 'planning' check (status in ('planning','active','on_hold','closeout','completed','cancelled')),
  start_date date, target_end_date date, contract_value numeric not null default 0,
  budget numeric not null default 0, description text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index construction_projects_workspace_idx on public.construction_projects(workspace_id,status,updated_at desc);

create table public.construction_assets (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.construction_workspaces(id) on delete cascade,
  project_id uuid references public.construction_projects(id) on delete cascade,
  name text not null, asset_type text not null default 'equipment', identifier text, manufacturer text, model text,
  status text not null default 'operational' check (status in ('operational','inspection_due','maintenance_due','out_of_service','retired')),
  criticality text not null default 'medium' check (criticality in ('low','medium','high','critical')),
  last_service_at timestamptz, next_service_at timestamptz, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index construction_assets_workspace_idx on public.construction_assets(workspace_id,status,next_service_at);

create table public.construction_issues (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.construction_workspaces(id) on delete cascade,
  project_id uuid references public.construction_projects(id) on delete cascade,
  asset_id uuid references public.construction_assets(id) on delete set null,
  issue_type text not null check (issue_type in ('safety','quality','defect','rfi','constraint','delay','maintenance','commercial','environmental','other')),
  title text not null, description text,
  severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
  status text not null default 'open' check (status in ('open','triaged','in_progress','blocked','resolved','closed')),
  owner_name text, due_at timestamptz, resolution text, evidence jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index construction_issues_workspace_idx on public.construction_issues(workspace_id,status,severity,updated_at desc);

create table public.construction_inspections (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.construction_workspaces(id) on delete cascade,
  project_id uuid references public.construction_projects(id) on delete cascade,
  asset_id uuid references public.construction_assets(id) on delete set null,
  inspection_type text not null, title text not null, scheduled_at timestamptz, completed_at timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled','in_progress','passed','failed','action_required','cancelled')),
  inspector_name text, findings text, checklist jsonb not null default '[]'::jsonb, evidence jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index construction_inspections_workspace_idx on public.construction_inspections(workspace_id,status,scheduled_at);

create table public.construction_maintenance (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.construction_workspaces(id) on delete cascade,
  asset_id uuid not null references public.construction_assets(id) on delete cascade,
  title text not null, maintenance_type text not null default 'planned' check (maintenance_type in ('planned','preventive','predictive','corrective','breakdown','inspection')),
  priority text not null default 'medium' check (priority in ('low','medium','high','critical')),
  status text not null default 'open' check (status in ('open','scheduled','in_progress','completed','cancelled')),
  scheduled_at timestamptz, completed_at timestamptz, technician_name text, notes text, cost numeric not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index construction_maintenance_workspace_idx on public.construction_maintenance(workspace_id,status,scheduled_at);

do $$
declare t text;
begin
  foreach t in array array['construction_workspaces','construction_projects','construction_assets','construction_issues','construction_inspections','construction_maintenance']
  loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on table public.%I from anon',t);
    execute format('grant select,insert,update,delete on table public.%I to authenticated',t);
    execute format('grant all on table public.%I to service_role',t);
    execute format('create policy %I_select_own on public.%I for select to authenticated using ((select auth.uid())=user_id)',t,t);
    execute format('create policy %I_insert_own on public.%I for insert to authenticated with check ((select auth.uid())=user_id)',t,t);
    execute format('create policy %I_update_own on public.%I for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',t,t);
    execute format('create policy %I_delete_own on public.%I for delete to authenticated using ((select auth.uid())=user_id)',t,t);
  end loop;
end $$;
