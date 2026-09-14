-- Blackstar Retail Hub: governed AI receptionist profiles, reviewed action execution and auditable customer communication preparation.

create table public.retail_receptionist_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  active boolean not null default true,
  greeting text,
  business_hours jsonb not null default '{}'::jsonb,
  knowledge jsonb not null default '{}'::jsonb,
  policies jsonb not null default '{}'::jsonb,
  escalation_name text,
  escalation_phone text,
  default_channel text not null default 'manual' check (default_channel in ('manual','sms','email','voice','whatsapp')),
  allow_ai_proposals boolean not null default false,
  approval_required boolean not null default true check (approval_required = true),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id)
);
create index retail_receptionist_profiles_user_idx on public.retail_receptionist_profiles(user_id, updated_at desc);

create table public.retail_receptionist_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  call_id uuid references public.retail_call_inbox(id) on delete set null,
  appointment_id uuid references public.retail_appointments(id) on delete set null,
  order_id uuid references public.retail_orders(id) on delete set null,
  action_type text not null check (action_type in ('create_booking','reschedule_booking','cancel_booking','callback','prepare_customer_message')),
  status text not null default 'proposed' check (status in ('proposed','approved','processing','processed','rejected','failed')),
  requested_by text not null default 'manual' check (requested_by in ('manual','ai','voice_provider','integration')),
  summary text not null check (char_length(summary) between 1 and 2000),
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  processed_at timestamptz,
  processed_result jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index retail_receptionist_actions_workspace_idx on public.retail_receptionist_actions(workspace_id, status, created_at desc);
create index retail_receptionist_actions_call_fk_idx on public.retail_receptionist_actions(call_id);
create index retail_receptionist_actions_appointment_fk_idx on public.retail_receptionist_actions(appointment_id);
create index retail_receptionist_actions_order_fk_idx on public.retail_receptionist_actions(order_id);
create index retail_receptionist_actions_reviewed_by_fk_idx on public.retail_receptionist_actions(reviewed_by);
create index retail_receptionist_actions_user_idx on public.retail_receptionist_actions(user_id, updated_at desc);
create unique index retail_receptionist_actions_idempotency_uq
  on public.retail_receptionist_actions(workspace_id, idempotency_key)
  where idempotency_key is not null and idempotency_key <> '';

create table public.retail_customer_communications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  appointment_id uuid references public.retail_appointments(id) on delete set null,
  call_id uuid references public.retail_call_inbox(id) on delete set null,
  order_id uuid references public.retail_orders(id) on delete set null,
  action_id uuid references public.retail_receptionist_actions(id) on delete set null,
  channel text not null check (channel in ('manual','sms','email','voice','whatsapp')),
  purpose text not null default 'general' check (purpose in ('booking_confirmation','callback','order_update','general')),
  recipient text not null check (char_length(recipient) between 1 and 320),
  subject text,
  body text not null check (char_length(body) between 1 and 4000),
  scheduled_for timestamptz not null default now(),
  status text not null default 'draft' check (status in ('draft','manual_required','provider_required','manually_handled','sent','failed','cancelled')),
  provider text,
  provider_message_id text,
  sent_at timestamptz,
  delivered_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index retail_customer_communications_workspace_idx on public.retail_customer_communications(workspace_id, status, scheduled_for);
create index retail_customer_communications_appointment_fk_idx on public.retail_customer_communications(appointment_id);
create index retail_customer_communications_call_fk_idx on public.retail_customer_communications(call_id);
create index retail_customer_communications_order_fk_idx on public.retail_customer_communications(order_id);
create index retail_customer_communications_action_fk_idx on public.retail_customer_communications(action_id);
create index retail_customer_communications_user_idx on public.retail_customer_communications(user_id, updated_at desc);
create unique index retail_customer_communications_action_uq on public.retail_customer_communications(action_id) where action_id is not null;

-- Standard updated_at handling.
do $$
declare t text;
begin
  foreach t in array array['retail_receptionist_profiles','retail_receptionist_actions','retail_customer_communications']
  loop
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.retail_set_updated_at()', t, t);
  end loop;
end $$;

-- RLS and grants. Execution/review outcome columns are RPC-owned, not client-writable.
alter table public.retail_receptionist_profiles enable row level security;
alter table public.retail_receptionist_actions enable row level security;
alter table public.retail_customer_communications enable row level security;
revoke all on table public.retail_receptionist_profiles, public.retail_receptionist_actions, public.retail_customer_communications from anon, authenticated;
grant all on table public.retail_receptionist_profiles, public.retail_receptionist_actions, public.retail_customer_communications to service_role;

grant select, insert, update, delete on table public.retail_receptionist_profiles to authenticated;
grant select, insert, delete on table public.retail_receptionist_actions to authenticated;
grant select, insert, delete on table public.retail_customer_communications to authenticated;

create policy retail_receptionist_profiles_select_own on public.retail_receptionist_profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy retail_receptionist_profiles_insert_own on public.retail_receptionist_profiles for insert to authenticated with check (
  (select auth.uid()) = user_id
  and approval_required = true
  and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid()))
);
create policy retail_receptionist_profiles_update_own on public.retail_receptionist_profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and approval_required = true
    and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid()))
  );
create policy retail_receptionist_profiles_delete_own on public.retail_receptionist_profiles for delete to authenticated using ((select auth.uid()) = user_id);

create policy retail_receptionist_actions_select_own on public.retail_receptionist_actions for select to authenticated using ((select auth.uid()) = user_id);
create policy retail_receptionist_actions_insert_own on public.retail_receptionist_actions for insert to authenticated with check (
  (select auth.uid()) = user_id
  and requested_by = 'manual'
  and status = 'proposed'
  and reviewed_at is null and reviewed_by is null and processed_at is null and processed_result is null and last_error is null
  and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid()))
  and (call_id is null or exists (select 1 from public.retail_call_inbox c where c.id = call_id and c.workspace_id = workspace_id and c.user_id = (select auth.uid())))
  and (appointment_id is null or exists (select 1 from public.retail_appointments a where a.id = appointment_id and a.workspace_id = workspace_id and a.user_id = (select auth.uid())))
  and (order_id is null or exists (select 1 from public.retail_orders o where o.id = order_id and o.workspace_id = workspace_id and o.user_id = (select auth.uid())))
);
create policy retail_receptionist_actions_delete_own on public.retail_receptionist_actions for delete to authenticated
  using ((select auth.uid()) = user_id and status in ('proposed','rejected'));

create policy retail_customer_communications_select_own on public.retail_customer_communications for select to authenticated using ((select auth.uid()) = user_id);
create policy retail_customer_communications_insert_own on public.retail_customer_communications for insert to authenticated with check (
  (select auth.uid()) = user_id
  and action_id is null
  and status in ('draft','manual_required','provider_required')
  and provider is null and provider_message_id is null and sent_at is null and delivered_at is null and last_error is null
  and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid()))
  and (appointment_id is null or exists (select 1 from public.retail_appointments a where a.id = appointment_id and a.workspace_id = workspace_id and a.user_id = (select auth.uid())))
  and (call_id is null or exists (select 1 from public.retail_call_inbox c where c.id = call_id and c.workspace_id = workspace_id and c.user_id = (select auth.uid())))
  and (order_id is null or exists (select 1 from public.retail_orders o where o.id = order_id and o.workspace_id = workspace_id and o.user_id = (select auth.uid())))
);
create policy retail_customer_communications_delete_own on public.retail_customer_communications for delete to authenticated
  using ((select auth.uid()) = user_id and status in ('draft','cancelled'));

-- Human review is the only path from proposed/failed to approved/rejected.
create or replace function private.retail_review_receptionist_action_impl(p_action_id uuid, p_decision text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_action public.retail_receptionist_actions%rowtype;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'invalid_review_decision'; end if;

  select * into v_action
  from public.retail_receptionist_actions a
  where a.id = p_action_id and a.user_id = v_uid
  for update;
  if not found then raise exception 'receptionist_action_not_found'; end if;
  if v_action.status not in ('proposed','approved','rejected','failed') then raise exception 'receptionist_action_not_reviewable'; end if;

  update public.retail_receptionist_actions
     set status = p_decision,
         reviewed_at = now(),
         reviewed_by = v_uid,
         last_error = case when p_decision = 'approved' then null else last_error end,
         updated_at = now()
   where id = v_action.id;

  return jsonb_build_object('ok', true, 'action_id', v_action.id, 'status', p_decision);
end;
$$;
revoke all on function private.retail_review_receptionist_action_impl(uuid,text) from public, anon;
grant execute on function private.retail_review_receptionist_action_impl(uuid,text) to authenticated, service_role;

create or replace function public.retail_review_receptionist_action(p_action_id uuid, p_decision text)
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select private.retail_review_receptionist_action_impl(p_action_id, p_decision); $$;
revoke all on function public.retail_review_receptionist_action(uuid,text) from public, anon;
grant execute on function public.retail_review_receptionist_action(uuid,text) to authenticated, service_role;

-- Approved internal actions execute atomically. Message actions only prepare a communication;
-- they never claim SMS/email/voice/WhatsApp delivery without a real provider.
create or replace function private.retail_execute_receptionist_action_impl(p_action_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_action public.retail_receptionist_actions%rowtype;
  v_payload jsonb;
  v_result jsonb := '{}'::jsonb;
  v_appointment_id uuid;
  v_communication_id uuid;
  v_location_id uuid;
  v_service_item_id uuid;
  v_staff_id uuid;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_channel text;
  v_recipient text;
  v_body text;
  v_subject text;
  v_purpose text;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;

  select * into v_action
  from public.retail_receptionist_actions a
  where a.id = p_action_id and a.user_id = v_uid
  for update;
  if not found then raise exception 'receptionist_action_not_found'; end if;
  if v_action.status = 'processed' then
    return jsonb_build_object('ok', true, 'action_id', v_action.id, 'status', 'processed', 'result', coalesce(v_action.processed_result, '{}'::jsonb));
  end if;
  if v_action.status <> 'approved' then raise exception 'receptionist_action_must_be_approved'; end if;

  update public.retail_receptionist_actions set status = 'processing', updated_at = now() where id = v_action.id;
  v_payload := coalesce(v_action.payload, '{}'::jsonb);

  begin
    if v_action.action_type = 'create_booking' then
      if nullif(btrim(v_payload->>'customer_name'),'') is null then raise exception 'customer_name_required'; end if;
      if nullif(v_payload->>'starts_at','') is null then raise exception 'starts_at_required'; end if;
      v_starts_at := (v_payload->>'starts_at')::timestamptz;
      v_ends_at := nullif(v_payload->>'ends_at','')::timestamptz;
      if v_ends_at is not null and v_ends_at <= v_starts_at then raise exception 'appointment_end_must_follow_start'; end if;
      v_location_id := nullif(v_payload->>'location_id','')::uuid;
      v_service_item_id := nullif(v_payload->>'service_item_id','')::uuid;
      v_staff_id := nullif(v_payload->>'staff_id','')::uuid;
      if v_location_id is not null and not exists (select 1 from public.retail_locations l where l.id = v_location_id and l.workspace_id = v_action.workspace_id and l.user_id = v_uid) then raise exception 'location_not_found'; end if;
      if v_service_item_id is not null and not exists (select 1 from public.retail_catalog_items i where i.id = v_service_item_id and i.workspace_id = v_action.workspace_id and i.user_id = v_uid and i.active) then raise exception 'service_item_not_found'; end if;
      if v_staff_id is not null and not exists (select 1 from public.retail_staff s where s.id = v_staff_id and s.workspace_id = v_action.workspace_id and s.user_id = v_uid and s.active) then raise exception 'staff_not_found'; end if;

      insert into public.retail_appointments(
        user_id, workspace_id, location_id, service_item_id, staff_id, customer_name, customer_phone, customer_email,
        starts_at, ends_at, status, source, notes
      ) values (
        v_uid, v_action.workspace_id, v_location_id, v_service_item_id, v_staff_id, btrim(v_payload->>'customer_name'),
        nullif(btrim(v_payload->>'customer_phone'),''), nullif(btrim(v_payload->>'customer_email'),''),
        v_starts_at, v_ends_at, 'booked', 'ai', nullif(v_payload->>'notes','')
      ) returning id into v_appointment_id;
      v_result := jsonb_build_object('appointment_id', v_appointment_id, 'action', v_action.action_type);

    elsif v_action.action_type = 'reschedule_booking' then
      if v_action.appointment_id is null then raise exception 'linked_appointment_required'; end if;
      if nullif(v_payload->>'starts_at','') is null then raise exception 'starts_at_required'; end if;
      v_starts_at := (v_payload->>'starts_at')::timestamptz;
      v_ends_at := nullif(v_payload->>'ends_at','')::timestamptz;
      if v_ends_at is not null and v_ends_at <= v_starts_at then raise exception 'appointment_end_must_follow_start'; end if;
      update public.retail_appointments
         set starts_at = v_starts_at, ends_at = v_ends_at, updated_at = now()
       where id = v_action.appointment_id and workspace_id = v_action.workspace_id and user_id = v_uid;
      if not found then raise exception 'linked_appointment_not_found'; end if;
      v_result := jsonb_build_object('appointment_id', v_action.appointment_id, 'action', v_action.action_type);

    elsif v_action.action_type = 'cancel_booking' then
      if v_action.appointment_id is null then raise exception 'linked_appointment_required'; end if;
      update public.retail_appointments
         set status = 'cancelled', updated_at = now()
       where id = v_action.appointment_id and workspace_id = v_action.workspace_id and user_id = v_uid;
      if not found then raise exception 'linked_appointment_not_found'; end if;
      v_result := jsonb_build_object('appointment_id', v_action.appointment_id, 'action', v_action.action_type);

    elsif v_action.action_type = 'callback' then
      if v_action.call_id is null then raise exception 'linked_call_required'; end if;
      update public.retail_call_inbox
         set needs_follow_up = true, status = 'follow_up', updated_at = now()
       where id = v_action.call_id and workspace_id = v_action.workspace_id and user_id = v_uid;
      if not found then raise exception 'linked_call_not_found'; end if;
      v_result := jsonb_build_object('call_id', v_action.call_id, 'action', v_action.action_type);

    elsif v_action.action_type = 'prepare_customer_message' then
      v_channel := coalesce(nullif(v_payload->>'channel',''), 'manual');
      if v_channel not in ('manual','sms','email','voice','whatsapp') then raise exception 'invalid_communication_channel'; end if;
      v_recipient := btrim(coalesce(v_payload->>'recipient',''));
      v_body := btrim(coalesce(v_payload->>'body',''));
      v_subject := nullif(btrim(v_payload->>'subject'),'');
      v_purpose := coalesce(nullif(v_payload->>'purpose',''), 'general');
      if v_purpose not in ('booking_confirmation','callback','order_update','general') then raise exception 'invalid_communication_purpose'; end if;
      if char_length(v_recipient) < 1 or char_length(v_recipient) > 320 then raise exception 'invalid_communication_recipient'; end if;
      if char_length(v_body) < 1 or char_length(v_body) > 4000 then raise exception 'invalid_communication_body'; end if;

      insert into public.retail_customer_communications(
        user_id, workspace_id, appointment_id, call_id, order_id, action_id, channel, purpose, recipient, subject, body,
        scheduled_for, status, metadata
      ) values (
        v_uid, v_action.workspace_id, v_action.appointment_id, v_action.call_id, v_action.order_id, v_action.id,
        v_channel, v_purpose, v_recipient, v_subject, v_body,
        coalesce(nullif(v_payload->>'scheduled_for','')::timestamptz, now()),
        case when v_channel = 'manual' then 'manual_required' else 'provider_required' end,
        jsonb_build_object('source','retail_receptionist_action','provider_delivery_required',v_channel <> 'manual')
      ) returning id into v_communication_id;
      v_result := jsonb_build_object(
        'communication_id', v_communication_id,
        'action', v_action.action_type,
        'delivery_status', case when v_channel = 'manual' then 'manual_required' else 'provider_required' end
      );
    end if;

    update public.retail_receptionist_actions
       set status = 'processed', processed_at = now(), processed_result = v_result, last_error = null, updated_at = now()
     where id = v_action.id;
    return jsonb_build_object('ok', true, 'action_id', v_action.id, 'status', 'processed', 'result', v_result);
  exception when others then
    update public.retail_receptionist_actions
       set status = 'failed', last_error = left(sqlerrm, 2000), processed_at = null, updated_at = now()
     where id = v_action.id;
    return jsonb_build_object('ok', false, 'action_id', v_action.id, 'status', 'failed', 'error', left(sqlerrm, 2000));
  end;
end;
$$;
revoke all on function private.retail_execute_receptionist_action_impl(uuid) from public, anon;
grant execute on function private.retail_execute_receptionist_action_impl(uuid) to authenticated, service_role;

create or replace function public.retail_execute_receptionist_action(p_action_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select private.retail_execute_receptionist_action_impl(p_action_id); $$;
revoke all on function public.retail_execute_receptionist_action(uuid) from public, anon;
grant execute on function public.retail_execute_receptionist_action(uuid) to authenticated, service_role;

create or replace function private.retail_cancel_customer_communication_impl(p_communication_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := (select auth.uid()); v_row public.retail_customer_communications%rowtype;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  select * into v_row from public.retail_customer_communications c where c.id = p_communication_id and c.user_id = v_uid for update;
  if not found then raise exception 'customer_communication_not_found'; end if;
  if v_row.status not in ('draft','manual_required','provider_required') then raise exception 'customer_communication_not_cancellable'; end if;
  update public.retail_customer_communications set status = 'cancelled', updated_at = now() where id = v_row.id;
  return jsonb_build_object('ok',true,'communication_id',v_row.id,'status','cancelled');
end;
$$;
revoke all on function private.retail_cancel_customer_communication_impl(uuid) from public, anon;
grant execute on function private.retail_cancel_customer_communication_impl(uuid) to authenticated, service_role;

create or replace function public.retail_cancel_customer_communication(p_communication_id uuid)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.retail_cancel_customer_communication_impl(p_communication_id); $$;
revoke all on function public.retail_cancel_customer_communication(uuid) from public, anon;
grant execute on function public.retail_cancel_customer_communication(uuid) to authenticated, service_role;

create or replace function private.retail_mark_customer_communication_handled_impl(p_communication_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := (select auth.uid()); v_row public.retail_customer_communications%rowtype;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  select * into v_row from public.retail_customer_communications c where c.id = p_communication_id and c.user_id = v_uid for update;
  if not found then raise exception 'customer_communication_not_found'; end if;
  if v_row.status not in ('manual_required','provider_required','draft') then raise exception 'customer_communication_not_open'; end if;
  update public.retail_customer_communications
     set status = 'manually_handled', provider = 'manual', provider_message_id = 'manual:' || id::text,
         sent_at = now(), delivered_at = now(), last_error = null,
         metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object('manually_recorded',true), updated_at = now()
   where id = v_row.id;
  return jsonb_build_object('ok',true,'communication_id',v_row.id,'status','manually_handled');
end;
$$;
revoke all on function private.retail_mark_customer_communication_handled_impl(uuid) from public, anon;
grant execute on function private.retail_mark_customer_communication_handled_impl(uuid) to authenticated, service_role;

create or replace function public.retail_mark_customer_communication_handled(p_communication_id uuid)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.retail_mark_customer_communication_handled_impl(p_communication_id); $$;
revoke all on function public.retail_mark_customer_communication_handled(uuid) from public, anon;
grant execute on function public.retail_mark_customer_communication_handled(uuid) to authenticated, service_role;
