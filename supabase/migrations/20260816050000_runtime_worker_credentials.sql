-- Private fallback credentials for durable runtime workers.
-- Raw bearer tokens are never stored; only SHA-256 digests are persisted.
create table if not exists public.runtime_worker_credentials (
  name text primary key,
  token_sha256 text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint runtime_worker_credentials_name_check
    check (name in ('workflow_runner', 'webhook_retry')),
  constraint runtime_worker_credentials_sha256_check
    check (token_sha256 ~ '^[0-9a-f]{64}$')
);

alter table public.runtime_worker_credentials enable row level security;

-- There are intentionally no anon/authenticated RLS policies. Only the
-- server-side service-role client may read these hashes.
revoke all on table public.runtime_worker_credentials from anon, authenticated;
grant select, insert, update, delete on table public.runtime_worker_credentials to service_role;

comment on table public.runtime_worker_credentials is
  'Server-only SHA-256 digests for GitHub/Supabase runtime worker bearer tokens.';
