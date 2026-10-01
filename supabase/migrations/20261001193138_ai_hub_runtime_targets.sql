create table if not exists public.ai_hub_runtime_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid null references public.organisations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  deployment_target text not null check (deployment_target in ('customer-cloud','on-prem','edge','device')),
  region text null check (region is null or char_length(region) between 1 and 80),
  token_sha256 text not null check (token_sha256 ~ '^[0-9a-f]{64}$'),
  health text not null default 'offline' check (health in ('healthy','degraded','offline')),
  attested_at timestamptz null,
  expires_at timestamptz null,
  last_seen_at timestamptz null,
  revoked_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_hub_runtime_targets_expiry_check
    check (expires_at is null or attested_at is null or expires_at > attested_at)
);

create index if not exists ai_hub_runtime_targets_user_idx
  on public.ai_hub_runtime_targets(user_id, revoked_at, deployment_target);

create index if not exists ai_hub_runtime_targets_org_idx
  on public.ai_hub_runtime_targets(org_id, revoked_at, deployment_target)
  where org_id is not null;

create index if not exists ai_hub_runtime_targets_attestation_idx
  on public.ai_hub_runtime_targets(expires_at, health)
  where revoked_at is null;

alter table public.ai_hub_runtime_targets enable row level security;

revoke all on table public.ai_hub_runtime_targets from public, anon, authenticated;
grant select (
  id,user_id,org_id,name,deployment_target,region,health,attested_at,expires_at,
  last_seen_at,revoked_at,metadata,created_at,updated_at
) on public.ai_hub_runtime_targets to authenticated;
grant insert (
  user_id,org_id,name,deployment_target,region,token_sha256,metadata
) on public.ai_hub_runtime_targets to authenticated;
grant update (
  name,region,token_sha256,revoked_at,metadata,updated_at
) on public.ai_hub_runtime_targets to authenticated;
grant all on table public.ai_hub_runtime_targets to service_role;

drop policy if exists ai_hub_runtime_targets_select on public.ai_hub_runtime_targets;
create policy ai_hub_runtime_targets_select
on public.ai_hub_runtime_targets
for select
to authenticated
using (
  case
    when org_id is null then user_id = (select auth.uid())
    else private.is_org_member(org_id)
  end
);

drop policy if exists ai_hub_runtime_targets_insert on public.ai_hub_runtime_targets;
create policy ai_hub_runtime_targets_insert
on public.ai_hub_runtime_targets
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and (
    org_id is null
    or private.is_org_admin(org_id)
  )
);

drop policy if exists ai_hub_runtime_targets_update on public.ai_hub_runtime_targets;
create policy ai_hub_runtime_targets_update
on public.ai_hub_runtime_targets
for update
to authenticated
using (
  case
    when org_id is null then user_id = (select auth.uid())
    else private.is_org_admin(org_id)
  end
)
with check (
  case
    when org_id is null then user_id = (select auth.uid())
    else private.is_org_admin(org_id)
  end
);

comment on table public.ai_hub_runtime_targets is
  'Tenant-scoped portable AI Hub execution targets. Health and attestation timestamps are worker-owned and are not writable by authenticated clients.';
comment on column public.ai_hub_runtime_targets.token_sha256 is
  'SHA-256 digest of the one-time runtime heartbeat secret; plaintext is never persisted.';
