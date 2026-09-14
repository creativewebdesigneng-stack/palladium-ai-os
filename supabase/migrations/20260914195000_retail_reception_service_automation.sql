-- Blackstar Retail & Local Business Hub: governed AI receptionist and customer-service automation.
-- This migration deliberately does NOT create another booking-reminder engine. Existing retail_booking_reminders
-- and retail-booking-reminder-dispatch remain the single reminder execution path.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;

create table public.retail_reception_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  location_id uuid references public.retail_locations(id) on delete cascade,
  name text not null default 'Retail receptionist' check (char_length(name) between 1 and 120),
  active boolean not null default true,
  greeting text not null default '',
  after_hours_message text not null default '',
  business_hours jsonb not null default '{}'::jsonb,
  knowledge jsonb not null default '{}'::jsonb,
  policies jsonb not null default '{}'::jsonb,
  escalation_name text,
  escalation_phone text,
  voice_studio_voice text not null default 'alloy',
  voice_studio_instructions text,
  answer_hours boolean not null default true,
  answer_location boolean not null default true,
  answer_services boolean not null default true,
  answer_pricing boolean not null default true,
  answer_stock boolean not null default true,
  answer_orders boolean not null default true,
  answer_shipping boolean not null default true,
  answer_policies boolean not null default true,
  can_create_bookings boolean not null default false,
  can_reschedule_bookings boolean not null default false,
  can_cancel_bookings boolean not null default false,
  can_create_followups boolean not null default true,
  can_send_communications boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index retail_reception_profiles_scope_uq
  on public.retail_reception_profiles(workspace_id, coalesce(location_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index retail_reception_profiles_user_idx on public.retail_reception_profiles(user_id, updated_at desc);
create index retail_reception_profiles_location_fk_idx on public.retail_reception_profiles(location_id);

create table public.retail_reception_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  profile_id uuid references public.retail_reception_profiles(id) on delete set null,
  call_id uuid references public.retail_call_inbox(id) on delete set null,
  appointment_id uuid references public.retail_appointments(id) on delete set null,
  order_id uuid references public.retail_orders(id) on delete set null,
  source text not null default 'staff' check (source in ('staff','ai','voice','sms','email','whatsapp','web','integration')),
  action_type text not null check (action_type in ('create_booking','reschedule_booking','cancel_booking','create_followup','send_communication','escalate_to_staff')),
  status text not null default 'pending_review' check (status in ('pending_review','approved','executing','executed','dismissed','failed')),
  summary text not null check (char_length(summary) between 1 and 2000),
  payload jsonb not null default '{}'::jsonb,
  reviewed_at timestamptz,
  executed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index retail_reception_actions_workspace_idx on public.retail_reception_actions(workspace_id, status, created_at desc);
create index retail_reception_actions_user_idx on public.retail_reception_actions(user_id, updated_at desc);
create index retail_reception_actions_profile_fk_idx on public.retail_reception_actions(profile_id);
create index retail_reception_actions_call_fk_idx on public.retail_reception_actions(call_id);
create index retail_reception_actions_appointment_fk_idx on public.retail_reception_actions(appointment_id);
create index retail_reception_actions_order_fk_idx on public.retail_reception_actions(order_id);

create table public.retail_customer_communications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  location_id uuid references public.retail_locations(id) on delete set null,
  appointment_id uuid references public.retail_appointments(id) on delete set null,
  call_id uuid references public.retail_call_inbox(id) on delete set null,
  order_id uuid references public.retail_orders(id) on delete set null,
  action_id uuid references public.retail_reception_actions(id) on delete set null,
  direction text not null default 'outbound' check (direction in ('outbound','internal')),
  channel text not null check (channel in ('in_app','sms','email','whatsapp','voice')),
  purpose text not null default 'custom' check (purpose in ('appointment_confirmation','missed_call','followup','order_update','shipping_update','custom')),
  recipient text not null check (char_length(recipient) between 1 and 320),
  subject text,
  body text not null check (char_length(body) between 1 and 4000),
  scheduled_for timestamptz not null default now(),
  status text not null default 'draft' check (status in ('draft','ready','sent','failed','cancelled')),
  provider text,
  provider_message_id text,
  sent_at timestamptz,
  delivered_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index retail_customer_comms_workspace_idx on public.retail_customer_communications(workspace_id, status, scheduled_for);
create index retail_customer_comms_user_idx on public.retail_customer_communications(user_id, updated_at desc);
create index retail_customer_comms_location_fk_idx on public.retail_customer_communications(location_id);
create index retail_customer_comms_appointment_fk_idx on public.retail_customer_communications(appointment_id);
create index retail_customer_comms_call_fk_idx on public.retail_customer_communications(call_id);
create index retail_customer_comms_order_fk_idx on public.retail_customer_communications(order_id);
create index retail_customer_comms_action_fk_idx on public.retail_customer_communications(action_id);

create trigger retail_reception_profiles_set_updated_at before update on public.retail_reception_profiles
for each row execute function public.retail_set_updated_at();
create trigger retail_reception_actions_set_updated_at before update on public.retail_reception_actions
for each row execute function public.retail_set_updated_at();
create trigger retail_customer_communications_set_updated_at before update on public.retail_customer_communications
for each row execute function public.retail_set_updated_at();

alter table public.retail_reception_profiles enable row level security;
alter table public.retail_reception_profiles force row level security;
alter table public.retail_reception_actions enable row level security;
alter table public.retail_reception_actions force row level security;
alter table public.retail_customer_communications enable row level security;
alter table public.retail_customer_communications force row level security;

revoke all on table public.retail_reception_profiles from anon, authenticated;
revoke all on table public.retail_reception_actions from anon, authenticated;
revoke all on table public.retail_customer_communications from anon, authenticated;
grant select, insert, update, delete on table public.retail_reception_profiles to authenticated;
grant select, insert, delete on table public.retail_reception_actions to authenticated;
grant update(status, reviewed_at, updated_at) on table public.retail_reception_actions to authenticated;
grant select, insert, delete on table public.retail_customer_communications to authenticated;
grant update(direction, channel, purpose, recipient, subject, body, scheduled_for, status, metadata, updated_at)
  on table public.retail_customer_communications to authenticated;
grant all on table public.retail_reception_profiles, public.retail_reception_actions, public.retail_customer_communications to service_role;

create policy retail_reception_profiles_select_own on public.retail_reception_profiles for select to authenticated
  using ((select auth.uid()) = user_id);
create policy retail_reception_profiles_insert_own on public.retail_reception_profiles for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid()))
    and (location_id is null or exists (
      select 1 from public.retail_locations l where l.id = location_id and l.workspace_id = workspace_id and l.user_id = (select auth.uid())
    ))
  );
create policy retail_reception_profiles_update_own on public.retail_reception_profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid()))
    and (location_id is null or exists (
      select 1 from public.retail_locations l where l.id = location_id and l.workspace_id = workspace_id and l.user_id = (select auth.uid())
    ))
  );
create policy retail_reception_profiles_delete_own on public.retail_reception_profiles for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy retail_reception_actions_select_own on public.retail_reception_actions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy retail_reception_actions_insert_own on public.retail_reception_actions for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and status = 'pending_review' and reviewed_at is null and executed_at is null and last_error is null
    and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid()))
    and (profile_id is null or exists (select 1 from public.retail_reception_profiles p where p.id = profile_id and p.workspace_id = workspace_id and p.user_id = (select auth.uid())))
    and (call_id is null or exists (select 1 from public.retail_call_inbox c where c.id = call_id and c.workspace_id = workspace_id and c.user_id = (select auth.uid())))
    and (appointment_id is null or exists (select 1 from public.retail_appointments a where a.id = appointment_id and a.workspace_id = workspace_id and a.user_id = (select auth.uid())))
    and (order_id is null or exists (select 1 from public.retail_orders o where o.id = order_id and o.workspace_id = workspace_id and o.user_id = (select auth.uid())))
  );
create policy retail_reception_actions_update_own on public.retail_reception_actions for update to authenticated
  using ((select auth.uid()) = user_id and status = 'pending_review')
  with check ((select auth.uid()) = user_id and status in ('approved','dismissed'));
create policy retail_reception_actions_delete_own on public.retail_reception_actions for delete to authenticated
  using ((select auth.uid()) = user_id and status in ('pending_review','dismissed'));

create policy retail_customer_communications_select_own on public.retail_customer_communications for select to authenticated
  using ((select auth.uid()) = user_id);
create policy retail_customer_communications_insert_own on public.retail_customer_communications for insert to authenticated
  with check (
    (select auth.uid()) = user_id and status in ('draft','ready')
    and provider is null and provider_message_id is null and sent_at is null and delivered_at is null
    and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid()))
    and (location_id is null or exists (select 1 from public.retail_locations l where l.id = location_id and l.workspace_id = workspace_id and l.user_id = (select auth.uid())))
    and (appointment_id is null or exists (select 1 from public.retail_appointments a where a.id = appointment_id and a.workspace_id = workspace_id and a.user_id = (select auth.uid())))
    and (call_id is null or exists (select 1 from public.retail_call_inbox c where c.id = call_id and c.workspace_id = workspace_id and c.user_id = (select auth.uid())))
    and (order_id is null or exists (select 1 from public.retail_orders o where o.id = order_id and o.workspace_id = workspace_id and o.user_id = (select auth.uid())))
    and (action_id is null or exists (select 1 from public.retail_reception_actions a where a.id = action_id and a.workspace_id = workspace_id and a.user_id = (select auth.uid())))
  );
create policy retail_customer_communications_update_own on public.retail_customer_communications for update to authenticated
  using ((select auth.uid()) = user_id and status in ('draft','ready','cancelled'))
  with check ((select auth.uid()) = user_id and status in ('draft','ready','cancelled'));
create policy retail_customer_communications_delete_own on public.retail_customer_communications for delete to authenticated
  using ((select auth.uid()) = user_id and status in ('draft','ready','cancelled'));

create or replace function private.retail_execute_reception_action_impl(p_action_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_action public.retail_reception_actions%rowtype;
  v_profile public.retail_reception_profiles%rowtype;
  v_payload jsonb;
  v_target_id uuid;
  v_communication_id uuid;
  v_channel text;
  v_purpose text;
  v_recipient text;
  v_subject text;
  v_body text;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_location_id uuid;
  v_service_id uuid;
  v_staff_id uuid;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;

  select * into v_action
  from public.retail_reception_actions
  where id = p_action_id and user_id = v_uid
  for update;
  if not found then raise exception 'reception_action_not_found'; end if;
  if v_action.status <> 'approved' then raise exception 'reception_action_not_approved'; end if;

  if v_action.profile_id is not null then
    select * into v_profile from public.retail_reception_profiles
    where id = v_action.profile_id and workspace_id = v_action.workspace_id and user_id = v_uid;
    if not found or not v_profile.active then raise exception 'reception_profile_unavailable'; end if;
  end if;

  v_payload := coalesce(v_action.payload, '{}'::jsonb);
  update public.retail_reception_actions set status = 'executing', last_error = null where id = v_action.id;

  begin
    case v_action.action_type
      when 'create_booking' then
        if v_action.profile_id is not null and not v_profile.can_create_bookings then raise exception 'reception_profile_create_booking_not_allowed'; end if;
        if nullif(btrim(v_payload->>'customer_name'),'') is null or nullif(btrim(v_payload->>'starts_at'),'') is null then
          raise exception 'create_booking_requires_customer_name_and_starts_at';
        end if;
        v_starts_at := (v_payload->>'starts_at')::timestamptz;
        v_ends_at := nullif(v_payload->>'ends_at','')::timestamptz;
        v_location_id := nullif(v_payload->>'location_id','')::uuid;
        v_service_id := nullif(v_payload->>'service_item_id','')::uuid;
        v_staff_id := nullif(v_payload->>'staff_id','')::uuid;
        if v_location_id is not null and not exists (select 1 from public.retail_locations l where l.id=v_location_id and l.workspace_id=v_action.workspace_id and l.user_id=v_uid) then raise exception 'booking_location_not_found'; end if;
        if v_service_id is not null and not exists (select 1 from public.retail_catalog_items i where i.id=v_service_id and i.workspace_id=v_action.workspace_id and i.user_id=v_uid and i.item_type='service' and i.active) then raise exception 'booking_service_not_found'; end if;
        if v_staff_id is not null and not exists (select 1 from public.retail_staff s where s.id=v_staff_id and s.workspace_id=v_action.workspace_id and s.user_id=v_uid and s.active) then raise exception 'booking_staff_not_found'; end if;
        insert into public.retail_appointments(user_id, workspace_id, location_id, service_item_id, staff_id, customer_name, customer_phone, customer_email, starts_at, ends_at, status, source, notes)
        values (v_uid, v_action.workspace_id, v_location_id, v_service_id, v_staff_id, left(v_payload->>'customer_name',180), nullif(left(v_payload->>'customer_phone',80),''), nullif(left(v_payload->>'customer_email',240),''), v_starts_at, v_ends_at, 'booked', 'ai', nullif(left(v_payload->>'notes',8000),''))
        returning id into v_target_id;
        update public.retail_reception_actions set appointment_id=v_target_id where id=v_action.id;

      when 'reschedule_booking' then
        if v_action.profile_id is not null and not v_profile.can_reschedule_bookings then raise exception 'reception_profile_reschedule_not_allowed'; end if;
        if v_action.appointment_id is null or nullif(btrim(v_payload->>'starts_at'),'') is null then raise exception 'reschedule_requires_appointment_and_starts_at'; end if;
        v_starts_at := (v_payload->>'starts_at')::timestamptz;
        v_ends_at := nullif(v_payload->>'ends_at','')::timestamptz;
        update public.retail_appointments
          set starts_at=v_starts_at, ends_at=coalesce(v_ends_at, ends_at), updated_at=now()
        where id=v_action.appointment_id and workspace_id=v_action.workspace_id and user_id=v_uid and status not in ('completed','cancelled','no_show')
        returning id into v_target_id;
        if v_target_id is null then raise exception 'reschedule_appointment_not_available'; end if;

      when 'cancel_booking' then
        if v_action.profile_id is not null and not v_profile.can_cancel_bookings then raise exception 'reception_profile_cancel_not_allowed'; end if;
        if v_action.appointment_id is null then raise exception 'cancel_requires_appointment'; end if;
        update public.retail_appointments set status='cancelled', updated_at=now()
        where id=v_action.appointment_id and workspace_id=v_action.workspace_id and user_id=v_uid and status not in ('completed','cancelled','no_show')
        returning id into v_target_id;
        if v_target_id is null then raise exception 'cancel_appointment_not_available'; end if;

      when 'create_followup' then
        if v_action.profile_id is not null and not v_profile.can_create_followups then raise exception 'reception_profile_followup_not_allowed'; end if;
        if v_action.call_id is not null then
          update public.retail_call_inbox set status='follow_up', needs_follow_up=true, updated_at=now()
          where id=v_action.call_id and workspace_id=v_action.workspace_id and user_id=v_uid returning id into v_target_id;
        else
          insert into public.retail_call_inbox(user_id, workspace_id, direction, customer_name, phone, reason, summary, status, needs_follow_up, source, received_at)
          values (v_uid, v_action.workspace_id, 'outbound', nullif(left(v_payload->>'customer_name',180),''), nullif(left(v_payload->>'phone',80),''), left(coalesce(nullif(v_payload->>'reason',''),v_action.summary),500), left(v_action.summary,8000), 'follow_up', true, 'ai', now())
          returning id into v_target_id;
          update public.retail_reception_actions set call_id=v_target_id where id=v_action.id;
        end if;

      when 'escalate_to_staff' then
        if v_action.call_id is not null then
          update public.retail_call_inbox set status='follow_up', needs_follow_up=true, outcome=left('Escalated to staff: ' || v_action.summary,2000), updated_at=now()
          where id=v_action.call_id and workspace_id=v_action.workspace_id and user_id=v_uid returning id into v_target_id;
        else
          insert into public.retail_call_inbox(user_id, workspace_id, direction, customer_name, phone, reason, summary, outcome, status, needs_follow_up, source, received_at)
          values (v_uid, v_action.workspace_id, 'inbound', nullif(left(v_payload->>'customer_name',180),''), nullif(left(v_payload->>'phone',80),''), left(coalesce(nullif(v_payload->>'reason',''),'AI receptionist escalation'),500), left(v_action.summary,8000), 'Escalated to staff', 'follow_up', true, 'ai', now())
          returning id into v_target_id;
          update public.retail_reception_actions set call_id=v_target_id where id=v_action.id;
        end if;

      when 'send_communication' then
        if v_action.profile_id is not null and not v_profile.can_send_communications then raise exception 'reception_profile_communications_not_allowed'; end if;
        v_channel := coalesce(nullif(v_payload->>'channel',''),'in_app');
        v_purpose := coalesce(nullif(v_payload->>'purpose',''),'custom');
        v_recipient := nullif(btrim(v_payload->>'recipient'),'');
        v_subject := nullif(v_payload->>'subject','');
        v_body := nullif(btrim(v_payload->>'body'),'');
        if v_channel not in ('in_app','sms','email','whatsapp','voice') then raise exception 'invalid_communication_channel'; end if;
        if v_purpose not in ('appointment_confirmation','missed_call','followup','order_update','shipping_update','custom') then raise exception 'invalid_communication_purpose'; end if;
        if v_recipient is null or v_body is null then raise exception 'communication_requires_recipient_and_body'; end if;

        if v_channel = 'in_app' then
          insert into public.retail_customer_communications(user_id, workspace_id, appointment_id, call_id, order_id, action_id, direction, channel, purpose, recipient, subject, body, scheduled_for, status, provider, provider_message_id, sent_at, metadata)
          values (v_uid, v_action.workspace_id, v_action.appointment_id, v_action.call_id, v_action.order_id, v_action.id, 'internal', 'in_app', v_purpose, left(v_recipient,320), left(v_subject,500), left(v_body,4000), now(), 'sent', 'blackstar_in_app', 'pending', now(), jsonb_build_object('source','retail_reception_action'))
          returning id into v_communication_id;
          update public.retail_customer_communications set provider_message_id='in_app:' || v_communication_id::text where id=v_communication_id;
          insert into public.notifications(user_id, kind, severity, title, body, link, metadata)
          values (v_uid, 'retail.service_communication', 'info', left(coalesce(v_subject,'Retail customer-service update'),200), left(v_body,4000), '/retail-hub', jsonb_build_object('retail_communication_id',v_communication_id,'retail_reception_action_id',v_action.id,'workspace_id',v_action.workspace_id));
          v_target_id := v_communication_id;
        else
          insert into public.retail_customer_communications(user_id, workspace_id, appointment_id, call_id, order_id, action_id, direction, channel, purpose, recipient, subject, body, scheduled_for, status, last_error, metadata)
          values (v_uid, v_action.workspace_id, v_action.appointment_id, v_action.call_id, v_action.order_id, v_action.id, 'outbound', v_channel, v_purpose, left(v_recipient,320), left(v_subject,500), left(v_body,4000), now(), 'ready', 'provider_not_configured:' || v_channel, jsonb_build_object('source','retail_reception_action','provider_delivery_required',true))
          returning id into v_communication_id;
          update public.retail_reception_actions set status='failed', last_error='provider_not_configured:' || v_channel, executed_at=now() where id=v_action.id;
          return jsonb_build_object('action_id',v_action.id,'status','failed','reason','provider_not_configured:' || v_channel,'communication_id',v_communication_id,'delivered',false);
        end if;
    end case;

    update public.retail_reception_actions set status='executed', executed_at=now(), last_error=null where id=v_action.id;
    return jsonb_build_object('action_id',v_action.id,'status','executed','action_type',v_action.action_type,'target_id',v_target_id,'delivered',case when v_action.action_type='send_communication' then true else null end);
  exception when others then
    update public.retail_reception_actions set status='failed', executed_at=now(), last_error=left(sqlerrm,1800) where id=v_action.id;
    return jsonb_build_object('action_id',v_action.id,'status','failed','reason',left(sqlerrm,1800));
  end;
end;
$$;

revoke all on function private.retail_execute_reception_action_impl(uuid) from public, anon;
grant execute on function private.retail_execute_reception_action_impl(uuid) to authenticated, service_role;

create or replace function public.retail_execute_reception_action(p_action_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.retail_execute_reception_action_impl(p_action_id);
$$;
revoke all on function public.retail_execute_reception_action(uuid) from public, anon;
grant execute on function public.retail_execute_reception_action(uuid) to authenticated, service_role;
