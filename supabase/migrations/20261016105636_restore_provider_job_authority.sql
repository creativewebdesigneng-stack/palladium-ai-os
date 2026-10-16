-- Restore existing provider ledgers; clients may not forge remote IDs or execution state.
do $$ begin if to_regclass('public.media_edit_jobs') is not null or to_regclass('public.deployment_targets') is not null then raise exception 'Provider recovery requires both tables absent'; end if; end $$;
create table public.media_edit_jobs(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 input_name text not null check(length(input_name) between 1 and 240),source_url text not null,
 mode text not null check(mode in ('silence','motion')),
 threshold numeric not null default 0.04 check(threshold between 0 and 1),
 margin_before_ms integer not null default 100 check(margin_before_ms between 0 and 60000),
 margin_after_ms integer not null default 100 check(margin_after_ms between 0 and 60000),
 output_format text not null default 'mp4' check(output_format in ('mp4','mov','premiere','resolve','final-cut-pro','shotcut','kdenlive','clip-sequence')),
 status text not null default 'queued' check(status in ('queued','running','completed','failed')),
 worker_job_id text unique,output_url text,error_message text,metadata jsonb not null default '{}',
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),completed_at timestamptz
);
create index media_edit_jobs_user_idx on public.media_edit_jobs(user_id,created_at desc);
create table public.deployment_targets(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(name) between 1 and 100),provider text not null default 'coolify' check(provider='coolify'),
 resource_kind text not null default 'application' check(resource_kind in ('application','service','database')),
 resource_uuid text not null check(length(resource_uuid) between 3 and 200),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(user_id,provider,resource_uuid)
);
alter table public.media_edit_jobs enable row level security;
alter table public.deployment_targets enable row level security;
revoke all on public.media_edit_jobs,public.deployment_targets from public,anon,authenticated;
grant select on public.media_edit_jobs,public.deployment_targets to authenticated;
grant all on public.media_edit_jobs,public.deployment_targets to service_role;
create policy media_jobs_owner_read on public.media_edit_jobs for select to authenticated using(user_id=(select auth.uid()));
create policy deployment_targets_owner_read on public.deployment_targets for select to authenticated using(user_id=(select auth.uid()));
