-- Existing Builder state remains server-owned proof, never caller-editable assertions.
do $$ begin if to_regclass('public.builder_jobs') is not null or to_regclass('public.builder_deployments') is not null then raise exception 'Builder recovery requires both tables absent';end if;end $$;
create table public.builder_jobs(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 title text not null,prompt text not null,
 status text not null default 'requested' check(status in ('requested','planning','planned','cancelled','failed')),
 plan jsonb,source_status text not null default 'not_started' check(source_status in ('not_started','generating','generated','failed')),
 source_manifest jsonb,source_last_error text,repository_full_name text,branch_name text,branch_approval_id uuid,
 file_approval_ids jsonb not null default '[]' check(jsonb_typeof(file_approval_ids)='array'),
 repository_status text not null default 'not_started' check(repository_status in ('not_started','branch_approval_pending','branch_ready','files_approval_pending','files_applied','failed')),
 repository_last_error text,last_error text,
 sandbox_status text not null default 'not_started' check(sandbox_status in ('not_started','provisioning','running','passed','failed')),
 sandbox_provider text,sandbox_id text,sandbox_results jsonb,sandbox_last_error text,sandbox_started_at timestamptz,sandbox_finished_at timestamptz,
 repair_status text not null default 'not_started' check(repair_status in ('not_started','generating','proposed','accepted','failed')),
 repair_manifest jsonb,repair_last_error text,repair_attempt integer not null default 0 check(repair_attempt between 0 and 10),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(id,user_id)
);
create index builder_jobs_user_created_idx on public.builder_jobs(user_id,created_at desc);
create index builder_jobs_sandbox_status_idx on public.builder_jobs(user_id,sandbox_status,updated_at desc) where sandbox_status<>'not_started';
create index builder_jobs_repair_status_idx on public.builder_jobs(user_id,repair_status,updated_at desc) where repair_status<>'not_started';
create table public.builder_deployments(
 id uuid primary key default gen_random_uuid(),builder_job_id uuid not null,user_id uuid not null references auth.users(id) on delete cascade,
 provider text not null default 'vercel' check(provider='vercel'),target text not null default 'preview' check(target='preview'),
 status text not null default 'queued' check(status in ('queued','uploading','building','ready','failed','cancelled')),
 provider_deployment_id text,provider_project_id text,url text,last_error text,
 production_approval_id uuid,production_status text not null default 'not_started' check(production_status in ('not_started','approval_pending','approved','promoting','promoted','failed')),
 production_promoted_at timestamptz,production_aliases jsonb not null default '[]' check(jsonb_typeof(production_aliases)='array'),production_last_error text,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(builder_job_id,user_id) references public.builder_jobs(id,user_id) on delete cascade
);
create index builder_deployments_job_owner_idx on public.builder_deployments(builder_job_id,user_id);
create index builder_deployments_user_created_idx on public.builder_deployments(user_id,created_at desc);
create index builder_deployments_production_approval_idx on public.builder_deployments(production_approval_id) where production_approval_id is not null;
create unique index builder_deployments_active_preview_idx on public.builder_deployments(builder_job_id) where target='preview' and status in ('queued','uploading','building');
alter table public.builder_jobs enable row level security;alter table public.builder_deployments enable row level security;
revoke all on public.builder_jobs,public.builder_deployments from public,anon,authenticated;
grant select on public.builder_jobs,public.builder_deployments to authenticated;
grant all on public.builder_jobs,public.builder_deployments to service_role;
create policy builder_jobs_owner_read on public.builder_jobs for select to authenticated using(user_id=(select auth.uid()));
create policy builder_deployments_owner_read on public.builder_deployments for select to authenticated using(user_id=(select auth.uid()));

-- No auth.uid() null shortcut and no SECURITY DEFINER authority.
create function private.enforce_builder_execution_proof() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='INSERT' then
  if not exists(select 1 from public.builder_jobs j where j.id=new.builder_job_id and j.user_id=new.user_id and j.source_status='generated' and j.source_manifest is not null and j.repository_status='files_applied' and j.sandbox_status='passed') then raise exception 'Builder preview requires owned, generated, applied and validated source';end if;
 elsif new.builder_job_id is distinct from old.builder_job_id or new.user_id is distinct from old.user_id then
  raise exception 'Builder deployment identity is immutable';
 end if;
 if new.production_status in ('approved','promoting','promoted') and (
  tg_op='INSERT' or new.production_status is distinct from old.production_status
  or new.provider_deployment_id is distinct from old.provider_deployment_id
  or new.provider_project_id is distinct from old.provider_project_id
  or new.production_approval_id is distinct from old.production_approval_id
 ) then
  if new.status<>'ready' or new.provider_deployment_id is null or new.provider_project_id is null or not exists(
   select 1 from public.approval_requests a where a.id=new.production_approval_id and a.user_id=new.user_id and a.status='approved' and a.action_type='vercel_production_promote'
    and a.details->>'deployment_id'=new.provider_deployment_id and a.details->>'project_id'=new.provider_project_id
    and a.details->>'builder_deployment_id'=new.id::text and a.details->>'builder_job_id'=new.builder_job_id::text and a.details->>'target'='production'
  ) then raise exception 'Builder production approval must match the exact owner, job, deployment and project';end if;
 end if;
 return new;
end $$;
revoke all on function private.enforce_builder_execution_proof() from public,anon,authenticated;
grant execute on function private.enforce_builder_execution_proof() to service_role;
create trigger builder_execution_proof before insert or update on public.builder_deployments for each row execute function private.enforce_builder_execution_proof();
