-- billing_webhook_events already has row level security and no client policy.
-- Revoke leftover client grants so anon and authenticated cannot rely on
-- table privileges if a policy is added later by mistake. Service role keeps
-- the trusted writer grant. No rows are changed.

do $$
begin
  if to_regclass('public.billing_webhook_events') is null then
    raise exception 'billing_webhook_events is missing; privilege hardening was not skipped';
  end if;
end $$;

revoke all on table public.billing_webhook_events from public, anon, authenticated;
grant all on table public.billing_webhook_events to service_role;
