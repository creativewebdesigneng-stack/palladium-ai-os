-- Construction document/BIM, telemetry, progress evidence and reliability intelligence.
create table public.construction_documents (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 workspace_id uuid not null references public.construction_workspaces(id) on delete cascade,
 project_id uuid references public.construction_projects(id) on delete cascade,
 document_type text not null default 'drawing' check(document_type in ('drawing','model','specification','method_statement','rams','submittal','datasheet','manual','certificate','om','other')),
 title text not null, document_number text, revision text, discipline text, status text not null default 'draft' check(status in ('draft','shared','review','approved','superseded','archived')),
 file_url text, checksum text, issued_at timestamptz, approved_at timestamptz, approved_by text, metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index construction_documents_ws_idx on public.construction_documents(workspace_id,project_id,document_type,status,updated_at desc);
create unique index construction_documents_revision_uq on public.construction_documents(workspace_id,project_id,document_number,revision) where document_number is not null and revision is not null;

create table public.construction_asset_telemetry (
 id bigint generated always as identity primary key, user_id uuid not null references auth.users(id) on delete cascade,
 workspace_id uuid not null references public.construction_workspaces(id) on delete cascade,
 asset_id uuid not null references public.construction_assets(id) on delete cascade,
 metric text not null, value numeric not null, unit text, quality text not null default 'measured' check(quality in ('measured','estimated','derived','invalid')),
 source text, observed_at timestamptz not null default now(), metadata jsonb not null default '{}'::jsonb
);
create index construction_asset_telemetry_asset_idx on public.construction_asset_telemetry(asset_id,metric,observed_at desc);
create index construction_asset_telemetry_ws_idx on public.construction_asset_telemetry(workspace_id,observed_at desc);

create table public.construction_progress_evidence (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 workspace_id uuid not null references public.construction_workspaces(id) on delete cascade,
 project_id uuid not null references public.construction_projects(id) on delete cascade,
 work_package_id uuid references public.construction_work_packages(id) on delete set null,
 evidence_type text not null check(evidence_type in ('photo','video','drone','scan','sensor','diary','measurement','other')),
 title text not null, captured_at timestamptz not null default now(), location_text text, file_url text,
 claimed_progress numeric check(claimed_progress between 0 and 100), verified_progress numeric check(verified_progress between 0 and 100),
 verification_status text not null default 'unverified' check(verification_status in ('unverified','ai_assisted','human_verified','rejected')),
 notes text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index construction_progress_evidence_ws_idx on public.construction_progress_evidence(workspace_id,project_id,captured_at desc);

create table public.construction_asset_health (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 workspace_id uuid not null references public.construction_workspaces(id) on delete cascade,
 asset_id uuid not null references public.construction_assets(id) on delete cascade,
 health_score numeric not null default 100 check(health_score between 0 and 100),
 risk_level text not null default 'low' check(risk_level in ('low','medium','high','critical')),
 anomaly_score numeric not null default 0 check(anomaly_score between 0 and 100), failure_mode text,
 recommended_action text, basis jsonb not null default '[]'::jsonb, assessed_at timestamptz not null default now(),
 human_review_status text not null default 'pending' check(human_review_status in ('pending','accepted','rejected','superseded')),
 created_at timestamptz not null default now()
);
create index construction_asset_health_ws_idx on public.construction_asset_health(workspace_id,risk_level,assessed_at desc);
create index construction_asset_health_asset_idx on public.construction_asset_health(asset_id,assessed_at desc);

do $$ declare t text; begin
 foreach t in array array['construction_documents','construction_asset_telemetry','construction_progress_evidence','construction_asset_health']
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
