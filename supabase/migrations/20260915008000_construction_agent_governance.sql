-- Governed construction specialist-agent proposals and execution audit.
create table public.construction_agent_runs (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 workspace_id uuid not null references public.construction_workspaces(id) on delete cascade,
 project_id uuid references public.construction_projects(id) on delete cascade,
 agent_role text not null check(agent_role in ('project','estimator','site_manager','hse','quality','planner','commercial','procurement','reliability','document_control','bim','sustainability')),
 objective text not null, status text not null default 'queued' check(status in ('queued','analysing','proposal_ready','approval_required','approved','executing','verified','rejected','failed')),
 risk_class text not null default 'medium' check(risk_class in ('low','medium','high','critical')),
 input_refs jsonb not null default '[]'::jsonb, findings jsonb not null default '[]'::jsonb,
 proposed_actions jsonb not null default '[]'::jsonb, confidence numeric check(confidence between 0 and 1),
 requires_competent_person boolean not null default false, approval_reason text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index construction_agent_runs_ws_idx on public.construction_agent_runs(workspace_id,status,risk_class,updated_at desc);

create table public.construction_agent_actions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 workspace_id uuid not null references public.construction_workspaces(id) on delete cascade,
 run_id uuid not null references public.construction_agent_runs(id) on delete cascade,
 action_type text not null, target_type text not null, target_id text, payload jsonb not null default '{}'::jsonb,
 consequence_class text not null default 'reversible' check(consequence_class in ('advisory','reversible','external_side_effect','safety_critical','engineering_authority')),
 status text not null default 'proposed' check(status in ('proposed','approval_required','approved','executing','succeeded','failed','rejected','cancelled')),
 approval_request_id uuid, approved_by uuid, approved_at timestamptz, executed_at timestamptz,
 verification jsonb not null default '{}'::jsonb, error text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index construction_agent_actions_ws_idx on public.construction_agent_actions(workspace_id,status,consequence_class,updated_at desc);

do $$ declare t text; begin foreach t in array array['construction_agent_runs','construction_agent_actions'] loop
 execute format('alter table public.%I enable row level security',t);execute format('revoke all on table public.%I from anon',t);execute format('grant select,insert,update,delete on table public.%I to authenticated',t);execute format('grant all on table public.%I to service_role',t);
 execute format('create policy %I_select_own on public.%I for select to authenticated using ((select auth.uid())=user_id)',t,t);
 execute format('create policy %I_insert_own on public.%I for insert to authenticated with check ((select auth.uid())=user_id)',t,t);
 execute format('create policy %I_update_own on public.%I for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',t,t);
 execute format('create policy %I_delete_own on public.%I for delete to authenticated using ((select auth.uid())=user_id)',t,t);
 end loop;end $$;
