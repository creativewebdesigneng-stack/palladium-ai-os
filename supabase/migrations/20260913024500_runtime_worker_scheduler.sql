-- Restore Blackstar's single authoritative production scheduler.
-- Worker bearer tokens are generated inside Postgres, kept plaintext only in Vault,
-- and validated by the application using SHA-256 hashes stored server-side.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

create table if not exists public.runtime_worker_credentials (
  name text primary key check (name in ('workflow_runner', 'webhook_retry')),
  token_sha256 text not null check (token_sha256 ~ '^[0-9a-f]{64}$'),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.runtime_worker_credentials enable row level security;
revoke all on public.runtime_worker_credentials from public, anon, authenticated;
grant select on public.runtime_worker_credentials to service_role;

do $$
declare
  workflow_token text := encode(extensions.gen_random_bytes(48), 'hex');
  webhook_token text := encode(extensions.gen_random_bytes(48), 'hex');
  workflow_secret_id uuid;
  webhook_secret_id uuid;
begin
  insert into public.runtime_worker_credentials(name, token_sha256, enabled, updated_at)
  values (
    'workflow_runner',
    encode(extensions.digest(workflow_token, 'sha256'), 'hex'),
    true,
    now()
  )
  on conflict (name) do update
    set token_sha256 = excluded.token_sha256,
        enabled = true,
        updated_at = now();

  insert into public.runtime_worker_credentials(name, token_sha256, enabled, updated_at)
  values (
    'webhook_retry',
    encode(extensions.digest(webhook_token, 'sha256'), 'hex'),
    true,
    now()
  )
  on conflict (name) do update
    set token_sha256 = excluded.token_sha256,
        enabled = true,
        updated_at = now();

  select id into workflow_secret_id
  from vault.secrets
  where name = 'blackstar_workflow_runner_token';

  if workflow_secret_id is null then
    perform vault.create_secret(
      workflow_token,
      'blackstar_workflow_runner_token',
      'Bearer token for the protected Blackstar workflow runtime worker.'
    );
  else
    perform vault.update_secret(
      workflow_secret_id,
      workflow_token,
      'blackstar_workflow_runner_token',
      'Bearer token for the protected Blackstar workflow runtime worker.'
    );
  end if;

  select id into webhook_secret_id
  from vault.secrets
  where name = 'blackstar_webhook_retry_token';

  if webhook_secret_id is null then
    perform vault.create_secret(
      webhook_token,
      'blackstar_webhook_retry_token',
      'Bearer token for the protected Blackstar webhook retry worker.'
    );
  else
    perform vault.update_secret(
      webhook_secret_id,
      webhook_token,
      'blackstar_webhook_retry_token',
      'Bearer token for the protected Blackstar webhook retry worker.'
    );
  end if;
end
$$;

do $$
declare
  existing_job bigint;
begin
  for existing_job in
    select jobid from cron.job where jobname in (
      'blackstar-workflow-runner',
      'blackstar-webhook-retries'
    )
  loop
    perform cron.unschedule(existing_job);
  end loop;
end
$$;

select cron.schedule(
  'blackstar-workflow-runner',
  '*/5 * * * *',
  $job$
  select net.http_post(
    url := 'https://palladium-ai-os.vercel.app/api/internal/workflow-runs?limit=4',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'blackstar_workflow_runner_token'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  ) as request_id;
  $job$
);

select cron.schedule(
  'blackstar-webhook-retries',
  '*/5 * * * *',
  $job$
  select net.http_post(
    url := 'https://palladium-ai-os.vercel.app/api/internal/webhook-retries?limit=50',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'blackstar_webhook_retry_token'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  ) as request_id;
  $job$
);
