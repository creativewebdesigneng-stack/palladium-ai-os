-- Add an atomic, recoverable claim to the EXISTING Stripe event ledger.
-- Previously stored rows are already completed. Never replay them as new.
alter table public.marketplace_payment_events
  add column if not exists processing_status text not null default 'processed',
  add column if not exists lease_token uuid,
  add column if not exists lease_expires_at timestamptz,
  add column if not exists attempt_count integer not null default 0;

alter table public.marketplace_payment_events
  add constraint marketplace_payment_events_processing_status_check
  check (processing_status in ('processing', 'processed'));

-- In-flight rows have no real completion timestamp. Keep the existing default
-- for old post-success writers until the new code is deployed.
alter table public.marketplace_payment_events
  alter column processed_at drop not null;

create or replace function public.blackstar_claim_payment_event(
  p_event_id text, p_event_type text, p_livemode boolean,
  p_lease_token uuid, p_lease_seconds integer default 300
) returns text
language plpgsql security invoker set search_path = ''
as $$
declare
  v_row public.marketplace_payment_events%rowtype;
begin
  if p_event_id is null or p_event_id !~ '^evt_[A-Za-z0-9]+$'
    or p_event_type is null or length(p_event_type) not between 1 and 128
    or p_livemode is null or p_lease_token is null
    or p_lease_seconds is null or p_lease_seconds not between 30 and 600
  then
    raise exception 'invalid payment event claim input';
  end if;

  -- The primary-key conflict serialises competing claims for the SAME event.
  -- A lease may be stolen only after its expiry; a processed row never is.
  insert into public.marketplace_payment_events
    (id,event_type,livemode,processing_status,lease_token,lease_expires_at,
     attempt_count,processed_at)
  values
    (p_event_id,p_event_type,p_livemode,'processing',p_lease_token,
     now() + make_interval(secs => p_lease_seconds),1,null)
  on conflict (id) do update
    set lease_token = excluded.lease_token,
        lease_expires_at = excluded.lease_expires_at,
        attempt_count = public.marketplace_payment_events.attempt_count + 1
    where public.marketplace_payment_events.event_type = excluded.event_type
      and public.marketplace_payment_events.livemode = excluded.livemode
      and public.marketplace_payment_events.processing_status = 'processing'
      and public.marketplace_payment_events.lease_expires_at <= now()
  returning * into v_row;

  if found then return 'acquired'; end if;

  select * into v_row from public.marketplace_payment_events
   where id = p_event_id;
  if not found then raise exception 'payment event claim could not be inspected'; end if;
  if v_row.event_type is distinct from p_event_type
    or v_row.livemode is distinct from p_livemode
  then raise exception 'payment event identity conflict'; end if;
  if v_row.processing_status = 'processed' then return 'done'; end if;
  return 'busy';
end;
$$;

create or replace function public.blackstar_complete_payment_event(
  p_event_id text, p_lease_token uuid
) returns boolean
language plpgsql security invoker set search_path = ''
as $$
declare v_id text;
begin
  if p_event_id is null or p_lease_token is null then return false; end if;
  update public.marketplace_payment_events
    set processing_status='processed', processed_at=now(),
        lease_token=null,lease_expires_at=null
    where id=p_event_id and processing_status='processing'
      and lease_token=p_lease_token and lease_expires_at > now()
    returning id into v_id;
  return v_id is not null;
end;
$$;

create or replace function public.blackstar_release_payment_event(
  p_event_id text, p_lease_token uuid
) returns boolean
language plpgsql security invoker set search_path = ''
as $$
declare v_id text;
begin
  if p_event_id is null or p_lease_token is null then return false; end if;
  update public.marketplace_payment_events
    set lease_token=null, lease_expires_at=now()
    where id=p_event_id and processing_status='processing'
      and lease_token=p_lease_token
    returning id into v_id;
  return v_id is not null;
end;
$$;

-- public is a Data API schema. RPC functions are ONLY callable by the
-- server-side service_role, never a browser / anon / authenticated session.
revoke all on function public.blackstar_claim_payment_event(text,text,boolean,uuid,integer)
  from public, anon, authenticated;
revoke all on function public.blackstar_complete_payment_event(text,uuid)
  from public, anon, authenticated;
revoke all on function public.blackstar_release_payment_event(text,uuid)
  from public, anon, authenticated;
grant execute on function public.blackstar_claim_payment_event(text,text,boolean,uuid,integer) to service_role;
grant execute on function public.blackstar_complete_payment_event(text,uuid) to service_role;
grant execute on function public.blackstar_release_payment_event(text,uuid) to service_role;
