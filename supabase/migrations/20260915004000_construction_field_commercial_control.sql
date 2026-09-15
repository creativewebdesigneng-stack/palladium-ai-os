-- Construction field, supply-chain and commercial control layer.
create table public.construction_field_records (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 workspace_id uuid not null references public.construction_workspaces(id) on delete cascade,
 project_id uuid references public.construction_projects(id) on delete cascade,
 record_type text not null check(record_type in ('rams','permit','incident','near_miss','ncr','snag','rfi','toolbox_talk','daily_diary','handover')),
 title text not null, reference text, status text not null default 'open' check(status in ('draft','open','submitted','approved','rejected','in_progress','resolved','closed')),
 risk_level text not null default 'medium' check(risk_level in ('low','medium','high','critical')),
 description text, responsible_person text, due_at timestamptz, approved_by text, approved_at timestamptz,
 data jsonb not null default '{}'::jsonb, evidence jsonb not null default '[]'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index construction_field_records_ws_idx on public.construction_field_records(workspace_id,record_type,status,updated_at desc);

create table public.construction_partners (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 workspace_id uuid not null references public.construction_workspaces(id) on delete cascade,
 partner_type text not null check(partner_type in ('subcontractor','supplier','consultant','client','manufacturer','hire_company','other')),
 name text not null, contact_name text, email text, phone text, trade text,
 status text not null default 'active' check(status in ('prospect','approved','active','suspended','inactive')),
 rating numeric, insurance_expiry date, accreditation_expiry date, notes text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index construction_partners_ws_idx on public.construction_partners(workspace_id,partner_type,status);

create table public.construction_materials (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 workspace_id uuid not null references public.construction_workspaces(id) on delete cascade,
 project_id uuid references public.construction_projects(id) on delete cascade,
 supplier_id uuid references public.construction_partners(id) on delete set null,
 name text not null, sku text, unit text not null default 'each', required_qty numeric not null default 0,
 ordered_qty numeric not null default 0, delivered_qty numeric not null default 0, used_qty numeric not null default 0,
 unit_cost numeric not null default 0, lead_time_days integer, required_by date, expected_delivery date,
 status text not null default 'required' check(status in ('required','quoted','ordered','part_delivered','delivered','shortage','cancelled')),
 notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index construction_materials_ws_idx on public.construction_materials(workspace_id,status,required_by);

create table public.construction_work_packages (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 workspace_id uuid not null references public.construction_workspaces(id) on delete cascade,
 project_id uuid not null references public.construction_projects(id) on delete cascade,
 partner_id uuid references public.construction_partners(id) on delete set null,
 name text not null, trade text, status text not null default 'planned' check(status in ('planned','ready','in_progress','blocked','complete','cancelled')),
 planned_start date, planned_finish date, actual_start date, actual_finish date,
 percent_complete numeric not null default 0 check(percent_complete between 0 and 100),
 budget numeric not null default 0, committed_cost numeric not null default 0, actual_cost numeric not null default 0,
 dependencies jsonb not null default '[]'::jsonb, constraints jsonb not null default '[]'::jsonb, notes text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index construction_work_packages_ws_idx on public.construction_work_packages(workspace_id,status,planned_start);

create table public.construction_changes (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 workspace_id uuid not null references public.construction_workspaces(id) on delete cascade,
 project_id uuid not null references public.construction_projects(id) on delete cascade,
 reference text, title text not null, change_type text not null default 'variation' check(change_type in ('variation','change_order','compensation_event','claim','forecast_adjustment','other')),
 status text not null default 'draft' check(status in ('draft','submitted','under_review','approved','rejected','implemented','closed')),
 description text, cost_impact numeric not null default 0, time_impact_days integer not null default 0,
 submitted_at timestamptz, decision_at timestamptz, approved_by text, evidence jsonb not null default '[]'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index construction_changes_ws_idx on public.construction_changes(workspace_id,status,updated_at desc);

do $$ declare t text; begin
 foreach t in array array['construction_field_records','construction_partners','construction_materials','construction_work_packages','construction_changes']
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
