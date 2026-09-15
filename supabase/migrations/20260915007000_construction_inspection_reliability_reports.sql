-- Construction inspection, reliability and executive analytics layer.
create table public.construction_inspection_actions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 workspace_id uuid not null references public.construction_workspaces(id) on delete cascade,
 inspection_id uuid not null references public.construction_inspections(id) on delete cascade,
 issue_id uuid references public.construction_issues(id) on delete set null,
 title text not null, severity text not null default 'medium' check(severity in ('low','medium','high','critical')),
 status text not null default 'open' check(status in ('open','in_progress','verified','closed')),
 owner_name text, due_at timestamptz, verification_notes text, verified_by text, verified_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index construction_inspection_actions_ws_idx on public.construction_inspection_actions(workspace_id,status,severity,due_at);

create table public.construction_reliability_events (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 workspace_id uuid not null references public.construction_workspaces(id) on delete cascade,
 asset_id uuid not null references public.construction_assets(id) on delete cascade,
 event_type text not null check(event_type in ('failure','breakdown','alarm','anomaly','service','inspection','repair','return_to_service')),
 occurred_at timestamptz not null default now(), downtime_minutes integer not null default 0,
 failure_mode text, cause text, action_taken text, parts_used jsonb not null default '[]'::jsonb,
 cost numeric not null default 0, verified_by text, notes text, created_at timestamptz not null default now()
);
create index construction_reliability_events_ws_idx on public.construction_reliability_events(workspace_id,asset_id,occurred_at desc);

create table public.construction_reports (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 workspace_id uuid not null references public.construction_workspaces(id) on delete cascade,
 project_id uuid references public.construction_projects(id) on delete cascade,
 report_type text not null check(report_type in ('daily','weekly','monthly','executive','safety','quality','commercial','programme','reliability')),
 title text not null, period_start date, period_end date, status text not null default 'draft' check(status in ('draft','review','approved','issued')),
 summary text, metrics jsonb not null default '{}'::jsonb, risks jsonb not null default '[]'::jsonb, actions jsonb not null default '[]'::jsonb,
 approved_by text, approved_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index construction_reports_ws_idx on public.construction_reports(workspace_id,report_type,status,updated_at desc);

do $$ declare t text; begin foreach t in array array['construction_inspection_actions','construction_reliability_events','construction_reports'] loop
 execute format('alter table public.%I enable row level security',t);execute format('revoke all on table public.%I from anon',t);execute format('grant select,insert,update,delete on table public.%I to authenticated',t);execute format('grant all on table public.%I to service_role',t);
 execute format('create policy %I_select_own on public.%I for select to authenticated using ((select auth.uid())=user_id)',t,t);
 execute format('create policy %I_insert_own on public.%I for insert to authenticated with check ((select auth.uid())=user_id)',t,t);
 execute format('create policy %I_update_own on public.%I for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',t,t);
 execute format('create policy %I_delete_own on public.%I for delete to authenticated using ((select auth.uid())=user_id)',t,t);
 end loop;end $$;
