-- Blackstar Retail Hub: durable booking-reminder scheduler and delivery state.

-- Immutable gift-card event history is SELECT-only to authenticated clients at both RLS and grant layers.
revoke all on table public.retail_gift_card_events from authenticated;
grant select on table public.retail_gift_card_events to authenticated;

alter table public.retail_booking_reminders
  add column if not exists attempt_count integer not null default 0 check (attempt_count >= 0),
  add column if not exists max_attempts integer not null default 5 check (max_attempts between 1 and 20),
  add column if not exists next_attempt_at timestamptz,
  add column if not exists last_attempt_at timestamptz;

update public.retail_booking_reminders
   set next_attempt_at = coalesce(next_attempt_at, scheduled_for)
 where next_attempt_at is null;

create index if not exists retail_booking_reminders_due_idx
  on public.retail_booking_reminders(status, next_attempt_at, scheduled_for)
  where status = 'scheduled';

create unique index if not exists retail_booking_reminders_notification_dedupe_idx
  on public.notifications(user_id, ((metadata->>'retail_booking_reminder_id')))
  where kind = 'retail.booking_reminder' and metadata ? 'retail_booking_reminder_id';

create table if not exists public.retail_scheduler_credentials (
  name text primary key,
  token_sha256 text not null check (char_length(token_sha256) = 64),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.retail_scheduler_credentials enable row level security;
revoke all on table public.retail_scheduler_credentials from anon, authenticated;
grant select, insert, update, delete on table public.retail_scheduler_credentials to service_role;
create policy retail_scheduler_credentials_service_role_all on public.retail_scheduler_credentials
  for all to service_role using (true) with check (true);

-- Generate the scheduler bearer token inside Postgres; plaintext is stored only encrypted in Vault.
do $$
declare
  v_token text;
  v_secret_exists boolean;
begin
  select exists(select 1 from vault.secrets where name = 'blackstar_retail_booking_scheduler_token') into v_secret_exists;
  if v_secret_exists then
    select decrypted_secret into v_token from vault.decrypted_secrets where name = 'blackstar_retail_booking_scheduler_token' limit 1;
  else
    v_token := encode(extensions.gen_random_bytes(48), 'hex');
    perform vault.create_secret(v_token, 'blackstar_retail_booking_scheduler_token', 'Blackstar Retail booking-reminder scheduler bearer token');
  end if;

  insert into public.retail_scheduler_credentials(name, token_sha256, enabled)
  values ('retail_booking_reminder_dispatch', encode(extensions.digest(v_token, 'sha256'), 'hex'), true)
  on conflict (name) do update set token_sha256 = excluded.token_sha256, enabled = true, updated_at = now();
end $$;

-- Keep only one scheduler job with this name.
do $$
declare v_job_id bigint;
begin
  select jobid into v_job_id from cron.job where jobname = 'blackstar-retail-booking-reminders' limit 1;
  if v_job_id is not null then perform cron.unschedule(v_job_id); end if;
end $$;

select cron.schedule(
  'blackstar-retail-booking-reminders',
  '* * * * *',
  $cron$
    select net.http_post(
      url := 'https://piwhiuangitqvwvwwcga.supabase.co/functions/v1/retail-booking-reminder-dispatch',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets
          where name = 'blackstar_retail_booking_scheduler_token' limit 1
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 45000
    ) as request_id;
  $cron$
);
