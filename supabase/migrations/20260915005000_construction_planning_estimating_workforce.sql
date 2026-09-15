-- Construction planning, estimating, tendering and workforce intelligence.
create table public.construction_schedule_tasks (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 workspace_id uuid not null references public.construction_workspaces(id) on delete cascade,
 project_id uuid not null references public.construction_projects(id) on delete cascade,
 work_package_id uuid references public.construction_work_packages(id) on delete set null,
 name text not null, wbs_code text, status text not null default 'planned' check(status in ('planned','ready','in_progress','blocked','complete','cancelled')),
 planned_start date, planned_finish date, actual_start date, actual_finish date,
 duration_days integer not null default 1 check(duration_days>=0), percent_complete numeric not null default 0 check(percent_complete between 0 and 100),
 is_milestone boolean not null default false, is_critical boolean not null default false,
 predecessor_ids jsonb not null default '[]'::jsonb, constraints jsonb not null default '[]'::jsonb, notes text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index construction_schedule_tasks_ws_idx on public.construction_schedule_tasks(workspace_id,project_id,status,planned_start);

create table public.construction_estimate_items (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 workspace_id uuid not null references public.construction_workspaces(id) on delete cascade,
 project_id uuid not null references public.construction_projects(id) on delete cascade,
 cost_code text, category text not null default 'other', description text not null, quantity numeric not null default 0,
 unit text not null default 'each', labour_rate numeric not null default 0, material_rate numeric not null default 0,
 plant_rate numeric not null default 0, subcontract_rate numeric not null default 0, waste_percent numeric not null default 0,
 markup_percent numeric not null default 0, notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index construction_estimate_items_ws_idx on public.construction_estimate_items(workspace_id,project_id,category);

create table public.construction_tenders (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 workspace_id uuid not null references public.construction_workspaces(id) on delete cascade,
 project_id uuid references public.construction_projects(id) on delete cascade,
 title text not null, bidder_name text not null, trade text, status text not null default 'received' check(status in ('invited','received','clarification','shortlisted','accepted','rejected')),
 bid_value numeric not null default 0, programme_days integer, exclusions text, qualifications text, clarifications text,
 score_quality numeric, score_commercial numeric, score_delivery numeric, score_safety numeric, notes text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index construction_tenders_ws_idx on public.construction_tenders(workspace_id,status,trade);

create table public.construction_workforce (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 workspace_id uuid not null references public.construction_workspaces(id) on delete cascade,
 project_id uuid references public.construction_projects(id) on delete cascade,
 partner_id uuid references public.construction_partners(id) on delete set null,
 name text not null, role text not null, trade text, employer text, status text not null default 'active' check(status in ('planned','active','off_site','suspended','inactive')),
 competencies jsonb not null default '[]'::jsonb, certifications jsonb not null default '[]'::jsonb,
 certification_expiry date, induction_complete boolean not null default false, hours_this_week numeric not null default 0,
 notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index construction_workforce_ws_idx on public.construction_workforce(workspace_id,project_id,status,certification_expiry);

do $$ declare t text; begin
 foreach t in array array['construction_schedule_tasks','construction_estimate_items','construction_tenders','construction_workforce']
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
