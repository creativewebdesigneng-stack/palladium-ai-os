alter table public.builder_deployments
  add column if not exists provider_project_id text,
  add column if not exists production_approval_id uuid,
  add column if not exists production_status text not null default 'not_started',
  add column if not exists production_promoted_at timestamptz,
  add column if not exists production_aliases jsonb not null default '[]'::jsonb,
  add column if not exists production_last_error text;

alter table public.builder_deployments
  drop constraint if exists builder_deployments_production_status_check;

alter table public.builder_deployments
  add constraint builder_deployments_production_status_check
  check (production_status in ('not_started', 'approval_pending', 'approved', 'promoting', 'promoted', 'failed'));

create index if not exists builder_deployments_production_approval_idx
  on public.builder_deployments (production_approval_id)
  where production_approval_id is not null;
