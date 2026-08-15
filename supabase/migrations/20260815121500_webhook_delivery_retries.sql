-- Durable retry/dead-letter metadata for outbound webhook deliveries.
alter table public.webhook_deliveries
  add column if not exists next_attempt_at timestamptz,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists dead_lettered_at timestamptz;

create index if not exists webhook_deliveries_due_retry_idx
  on public.webhook_deliveries(next_attempt_at)
  where status = 'failed'
    and next_attempt_at is not null
    and dead_lettered_at is null;

comment on column public.webhook_deliveries.next_attempt_at is
  'UTC time after which a failed delivery may be retried.';
comment on column public.webhook_deliveries.last_attempt_at is
  'UTC timestamp of the most recent network delivery attempt.';
comment on column public.webhook_deliveries.dead_lettered_at is
  'Set after the retry budget is exhausted; the delivery remains inspectable for audit/manual recovery.';
