-- Protected recurring scheduler for Blackstar Compliance Sentinel.
-- The plaintext bearer token is generated inside Postgres and stored only in Vault.
-- The Edge Function stores/compares only its SHA-256 digest.

create table if not exists public.compliance_scheduler_credentials (
  name text primary key,
  token_sha256 text not null check (length(token_sha256) = 64),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.compliance_scheduler_credentials enable row level security;
revoke all on table public.compliance_scheduler_credentials from anon, authenticated;
grant select on table public.compliance_scheduler_credentials to service_role;

do $$
declare
  v_token text;
begin
  select decrypted_secret
    into v_token
    from vault.decrypted_secrets
   where name = 'blackstar_compliance_sentinel_scheduler_token'
   limit 1;

  if v_token is null then
    v_token := encode(gen_random_bytes(48), 'hex');
    perform vault.create_secret(
      v_token,
      'blackstar_compliance_sentinel_scheduler_token',
      'Bearer token for the protected Blackstar Compliance Sentinel regulatory sync worker.',
      null
    );
  end if;

  insert into public.compliance_scheduler_credentials (name, token_sha256, enabled, updated_at)
  values (
    'compliance_regulatory_sync',
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    true,
    now()
  )
  on conflict (name) do update
    set token_sha256 = excluded.token_sha256,
        enabled = true,
        updated_at = now();
end $$;

-- Enable only adapters whose public authoritative source endpoints were verified before rollout.
-- UK Legislation remains pending while its public endpoint is rate-limiting external fetches.
-- GovInfo remains pending until its dedicated API/bulk-data adapter is deployed.
update public.compliance_regulatory_sources
set automation_ready = true,
    check_interval_hours = case
      when adapter = 'fca_handbook' then 6
      else 12
    end,
    next_check_at = now(),
    last_error = null,
    metadata = metadata || jsonb_build_object(
      'monitor_mode', 'authoritative_source_snapshot',
      'adapter_verified_at', now()
    )
where canonical_url in (
  'https://handbook.fca.org.uk/',
  'https://eur-lex.europa.eu/',
  'https://www.sec.gov/rules-regulations',
  'https://ico.org.uk/for-organisations/',
  'https://www.bankofengland.co.uk/prudential-regulation',
  'https://www.gov.uk/government/organisations/competition-and-markets-authority'
);

update public.compliance_regulatory_sources
set automation_ready = false,
    metadata = metadata || jsonb_build_object('adapter_status', 'pending_verified_adapter')
where canonical_url in (
  'https://www.legislation.gov.uk/',
  'https://www.govinfo.gov/'
);

do $$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid from cron.job where jobname = 'blackstar-compliance-sentinel-sync'
  loop
    perform cron.unschedule(v_job_id);
  end loop;

  perform cron.schedule(
    'blackstar-compliance-sentinel-sync',
    '17 * * * *',
    $job$
      select net.http_post(
        url := 'https://piwhiuangitqvwvwwcga.supabase.co/functions/v1/compliance-regulatory-sync',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (
            select decrypted_secret
              from vault.decrypted_secrets
             where name = 'blackstar_compliance_sentinel_scheduler_token'
             limit 1
          )
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 55000
      ) as request_id;
    $job$
  );
end $$;
