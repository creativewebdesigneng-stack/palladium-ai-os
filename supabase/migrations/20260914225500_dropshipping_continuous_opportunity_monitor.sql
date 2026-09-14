-- Continuous, evidence-backed Dropshipping Opportunity Watchlist monitoring.
-- Reuses Blackstar's existing least-privilege runtime worker verifier and Vault pattern.

alter table public.dropshipping_opportunities
  add column if not exists monitor_enabled boolean not null default false,
  add column if not exists monitor_interval_hours integer not null default 24,
  add column if not exists next_check_at timestamptz null,
  add column if not exists claimed_at timestamptz null,
  add column if not exists monitor_attempts integer not null default 0,
  add column if not exists monitor_last_error text null;

alter table public.dropshipping_opportunities
  drop constraint if exists dropshipping_opportunities_monitor_interval_check;
alter table public.dropshipping_opportunities
  add constraint dropshipping_opportunities_monitor_interval_check
  check (monitor_interval_hours between 1 and 168);

alter table public.dropshipping_opportunities
  drop constraint if exists dropshipping_opportunities_monitor_attempts_check;
alter table public.dropshipping_opportunities
  add constraint dropshipping_opportunities_monitor_attempts_check
  check (monitor_attempts between 0 and 1000);

create index if not exists dropshipping_opportunities_monitor_due_idx
  on public.dropshipping_opportunities(next_check_at)
  where monitor_enabled = true and status in ('watching','testing','winner');

alter table public.runtime_worker_credentials
  drop constraint if exists runtime_worker_credentials_name_check;
alter table public.runtime_worker_credentials
  add constraint runtime_worker_credentials_name_check
  check (name in ('workflow_runner','webhook_retry','dropshipping_monitor'));

do $$
declare
  v_token text;
begin
  select decrypted_secret
    into v_token
    from vault.decrypted_secrets
   where name = 'blackstar_dropshipping_monitor_token'
   limit 1;

  if v_token is null then
    v_token := encode(extensions.gen_random_bytes(48), 'hex');
    perform vault.create_secret(
      v_token,
      'blackstar_dropshipping_monitor_token',
      'Bearer token for the protected Blackstar Dropshipping Opportunity monitor.'
    );
  end if;

  insert into public.runtime_worker_credentials(name, token_sha256, enabled, updated_at)
  values (
    'dropshipping_monitor',
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    true,
    now()
  )
  on conflict (name) do update
    set token_sha256 = excluded.token_sha256,
        enabled = true,
        updated_at = now();
end $$;

create or replace function public.verify_runtime_worker_token(
  worker_name text,
  supplied_token text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if supplied_token is null or length(supplied_token) < 32 then
    return false;
  end if;

  if worker_name not in ('workflow_runner', 'webhook_retry', 'dropshipping_monitor') then
    return false;
  end if;

  return coalesce((
    select c.enabled
      and encode(extensions.digest(supplied_token, 'sha256'), 'hex') = c.token_sha256
    from public.runtime_worker_credentials as c
    where c.name = worker_name
  ), false);
end;
$$;

revoke all on function public.verify_runtime_worker_token(text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.verify_runtime_worker_token(text, text) to anon, service_role;

do $$
declare
  existing_job bigint;
begin
  for existing_job in
    select jobid from cron.job where jobname = 'blackstar-dropshipping-opportunity-monitor'
  loop
    perform cron.unschedule(existing_job);
  end loop;
end $$;

select cron.schedule(
  'blackstar-dropshipping-opportunity-monitor',
  '7,37 * * * *',
  $job$
  select net.http_post(
    url := 'https://palladium-ai-os.vercel.app/api/internal/dropshipping-opportunity-monitor?limit=4',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'blackstar_dropshipping_monitor_token'
        limit 1
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  ) as request_id;
  $job$
);
