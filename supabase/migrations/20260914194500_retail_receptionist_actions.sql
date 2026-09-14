-- Blackstar Retail Hub: approval-gated receptionist actions for saved call records.
-- This acts on Retail data only. It does not represent a phone call being answered or placed.

create table public.retail_call_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  call_id uuid not null references public.retail_call_inbox(id) on delete cascade,
  action_type text not null check (action_type in ('create_appointment','reschedule_appointment','cancel_appointment','mark_follow_up','close_call')),
  status text not null default 'proposed' check (status in ('proposed','approved','executed','failed','dismissed')),
  target_appointment_id uuid references public.retail_appointments(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  idempotency_key text,
  approval_required boolean not null default true,
  proposed_at timestamptz not null default now(),
  approved_at timestamptz,
  executed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index retail_call_actions_workspace_status_idx on public.retail_call_actions(workspace_id, status, created_at desc);
create index retail_call_actions_call_fk_idx on public.retail_call_actions(call_id);
create index retail_call_actions_target_appointment_fk_idx on public.retail_call_actions(target_appointment_id);
create index retail_call_actions_user_idx on public.retail_call_actions(user_id, updated_at desc);
create unique index retail_call_actions_idempotency_uq
  on public.retail_call_actions(workspace_id, idempotency_key)
  where idempotency_key is not null and idempotency_key <> '';

alter table public.retail_call_actions enable row level security;
revoke all on table public.retail_call_actions from anon, authenticated;
grant select, insert on table public.retail_call_actions to authenticated;
grant all on table public.retail_call_actions to service_role;

create policy retail_call_actions_select_own on public.retail_call_actions
  for select to authenticated using ((select auth.uid()) = user_id);

create policy retail_call_actions_insert_own on public.retail_call_actions
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and status = 'proposed'
    and approval_required = true
    and approved_at is null
    and executed_at is null
    and coalesce(last_error, '') = ''
    and exists (
      select 1 from public.retail_call_inbox c
      where c.id = call_id and c.workspace_id = workspace_id and c.user_id = (select auth.uid())
    )
    and (
      target_appointment_id is null
      or exists (
        select 1 from public.retail_appointments a
        where a.id = target_appointment_id and a.workspace_id = workspace_id and a.user_id = (select auth.uid())
      )
    )
  );

create trigger retail_call_actions_set_updated_at
  before update on public.retail_call_actions
  for each row execute function public.retail_set_updated_at();

create or replace function private.retail_set_call_action_status_impl(
  p_action_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_action public.retail_call_actions%rowtype;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_status not in ('approved','dismissed') then raise exception 'invalid_call_action_transition'; end if;

  select * into v_action
  from public.retail_call_actions a
  where a.id = p_action_id and a.user_id = v_user_id
  for update;
  if not found then raise exception 'call_action_not_found'; end if;

  if p_status = 'approved' then
    if v_action.status <> 'proposed' then raise exception 'call_action_not_proposed'; end if;
    update public.retail_call_actions
       set status = 'approved', approved_at = now(), last_error = null, updated_at = now()
     where id = v_action.id
     returning * into v_action;
  else
    if v_action.status not in ('proposed','approved') then raise exception 'call_action_not_dismissible'; end if;
    update public.retail_call_actions
       set status = 'dismissed', updated_at = now()
     where id = v_action.id
     returning * into v_action;
  end if;

  return jsonb_build_object(
    'action_id', v_action.id,
    'status', v_action.status,
    'approved_at', v_action.approved_at
  );
end;
$$;
revoke all on function private.retail_set_call_action_status_impl(uuid,text) from public, anon;
grant execute on function private.retail_set_call_action_status_impl(uuid,text) to authenticated, service_role;

create or replace function public.retail_set_call_action_status(
  p_action_id uuid,
  p_status text
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.retail_set_call_action_status_impl(p_action_id,p_status);
$$;
revoke all on function public.retail_set_call_action_status(uuid,text) from public, anon;
grant execute on function public.retail_set_call_action_status(uuid,text) to authenticated, service_role;

create or replace function private.retail_execute_call_action_impl(p_action_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_action public.retail_call_actions%rowtype;
  v_call public.retail_call_inbox%rowtype;
  v_appointment public.retail_appointments%rowtype;
  v_target public.retail_appointments%rowtype;
  v_location_id uuid;
  v_service_item_id uuid;
  v_staff_id uuid;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_customer_name text;
  v_customer_phone text;
  v_customer_email text;
  v_note text;
  v_result jsonb := '{}'::jsonb;
  v_error text;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;

  select * into v_action
  from public.retail_call_actions a
  where a.id = p_action_id and a.user_id = v_user_id
  for update;
  if not found then raise exception 'call_action_not_found'; end if;

  if v_action.status = 'executed' then
    return jsonb_build_object('action_id',v_action.id,'status','executed','result',v_action.result,'idempotent',true);
  end if;
  if v_action.status <> 'approved' then raise exception 'call_action_not_approved'; end if;

  select * into v_call
  from public.retail_call_inbox c
  where c.id = v_action.call_id and c.workspace_id = v_action.workspace_id and c.user_id = v_user_id
  for update;
  if not found then raise exception 'call_record_not_found'; end if;

  begin
    v_note := nullif(btrim(coalesce(v_action.payload->>'note','')), '');

    if v_action.action_type = 'create_appointment' then
      v_starts_at := (v_action.payload->>'starts_at')::timestamptz;
      v_ends_at := (v_action.payload->>'ends_at')::timestamptz;
      if v_starts_at is null or v_ends_at is null or v_ends_at <= v_starts_at then raise exception 'invalid_appointment_time'; end if;

      v_location_id := nullif(v_action.payload->>'location_id','')::uuid;
      v_service_item_id := nullif(v_action.payload->>'service_item_id','')::uuid;
      v_staff_id := nullif(v_action.payload->>'staff_id','')::uuid;
      v_customer_name := coalesce(nullif(btrim(v_action.payload->>'customer_name'),''), nullif(btrim(v_call.customer_name),''), 'Customer');
      v_customer_phone := coalesce(nullif(btrim(v_action.payload->>'customer_phone'),''), nullif(btrim(v_call.phone),''));
      v_customer_email := nullif(btrim(v_action.payload->>'customer_email'),'');

      if v_location_id is not null and not exists (
        select 1 from public.retail_locations l where l.id=v_location_id and l.workspace_id=v_action.workspace_id and l.user_id=v_user_id and l.active=true
      ) then raise exception 'appointment_location_not_found'; end if;
      if v_service_item_id is not null and not exists (
        select 1 from public.retail_catalog_items i where i.id=v_service_item_id and i.workspace_id=v_action.workspace_id and i.user_id=v_user_id and i.active=true and i.item_type='service'
      ) then raise exception 'appointment_service_not_found'; end if;
      if v_staff_id is not null and not exists (
        select 1 from public.retail_staff s where s.id=v_staff_id and s.workspace_id=v_action.workspace_id and s.user_id=v_user_id and s.active=true
      ) then raise exception 'appointment_staff_not_found'; end if;
      if v_staff_id is not null and exists (
        select 1 from public.retail_appointments a
        where a.workspace_id=v_action.workspace_id and a.user_id=v_user_id and a.staff_id=v_staff_id
          and a.status not in ('completed','cancelled','no_show')
          and a.starts_at < v_ends_at and coalesce(a.ends_at,a.starts_at) > v_starts_at
      ) then raise exception 'appointment_staff_conflict'; end if;

      insert into public.retail_appointments (
        user_id, workspace_id, location_id, service_item_id, staff_id,
        customer_name, customer_phone, customer_email, starts_at, ends_at,
        status, source, notes
      ) values (
        v_user_id, v_action.workspace_id, v_location_id, v_service_item_id, v_staff_id,
        v_customer_name, v_customer_phone, v_customer_email, v_starts_at, v_ends_at,
        'booked', 'ai', concat_ws(E'\n', v_note, 'Created through an approved Blackstar Retail receptionist action.')
      ) returning * into v_appointment;

      update public.retail_call_inbox
         set appointment_id=v_appointment.id, status='handled', needs_follow_up=false,
             outcome=concat_ws(E'\n', nullif(outcome,''), 'Appointment booked through an approved Blackstar receptionist action.'), updated_at=now()
       where id=v_call.id;
      v_result := jsonb_build_object('appointment_id',v_appointment.id,'starts_at',v_appointment.starts_at,'ends_at',v_appointment.ends_at,'appointment_status',v_appointment.status);

    elsif v_action.action_type = 'reschedule_appointment' then
      if v_action.target_appointment_id is null then raise exception 'target_appointment_required'; end if;
      select * into v_target from public.retail_appointments a
       where a.id=v_action.target_appointment_id and a.workspace_id=v_action.workspace_id and a.user_id=v_user_id
       for update;
      if not found then raise exception 'target_appointment_not_found'; end if;
      if v_target.status in ('completed','cancelled','no_show') then raise exception 'target_appointment_terminal'; end if;

      v_starts_at := coalesce(nullif(v_action.payload->>'starts_at','')::timestamptz, v_target.starts_at);
      v_ends_at := coalesce(nullif(v_action.payload->>'ends_at','')::timestamptz, v_target.ends_at);
      if v_starts_at is null or v_ends_at is null or v_ends_at <= v_starts_at then raise exception 'invalid_appointment_time'; end if;
      v_location_id := coalesce(nullif(v_action.payload->>'location_id','')::uuid, v_target.location_id);
      v_service_item_id := coalesce(nullif(v_action.payload->>'service_item_id','')::uuid, v_target.service_item_id);
      v_staff_id := coalesce(nullif(v_action.payload->>'staff_id','')::uuid, v_target.staff_id);

      if v_location_id is not null and not exists (
        select 1 from public.retail_locations l where l.id=v_location_id and l.workspace_id=v_action.workspace_id and l.user_id=v_user_id and l.active=true
      ) then raise exception 'appointment_location_not_found'; end if;
      if v_service_item_id is not null and not exists (
        select 1 from public.retail_catalog_items i where i.id=v_service_item_id and i.workspace_id=v_action.workspace_id and i.user_id=v_user_id and i.active=true and i.item_type='service'
      ) then raise exception 'appointment_service_not_found'; end if;
      if v_staff_id is not null and not exists (
        select 1 from public.retail_staff s where s.id=v_staff_id and s.workspace_id=v_action.workspace_id and s.user_id=v_user_id and s.active=true
      ) then raise exception 'appointment_staff_not_found'; end if;
      if v_staff_id is not null and exists (
        select 1 from public.retail_appointments a
        where a.id <> v_target.id and a.workspace_id=v_action.workspace_id and a.user_id=v_user_id and a.staff_id=v_staff_id
          and a.status not in ('completed','cancelled','no_show')
          and a.starts_at < v_ends_at and coalesce(a.ends_at,a.starts_at) > v_starts_at
      ) then raise exception 'appointment_staff_conflict'; end if;

      update public.retail_appointments
         set location_id=v_location_id, service_item_id=v_service_item_id, staff_id=v_staff_id,
             starts_at=v_starts_at, ends_at=v_ends_at,
             notes=concat_ws(E'\n', nullif(notes,''), v_note, 'Rescheduled through an approved Blackstar Retail receptionist action.'), updated_at=now()
       where id=v_target.id
       returning * into v_target;
      update public.retail_call_inbox
         set appointment_id=v_target.id, status='handled', needs_follow_up=false,
             outcome=concat_ws(E'\n', nullif(outcome,''), 'Appointment rescheduled through an approved Blackstar receptionist action.'), updated_at=now()
       where id=v_call.id;
      v_result := jsonb_build_object('appointment_id',v_target.id,'starts_at',v_target.starts_at,'ends_at',v_target.ends_at,'appointment_status',v_target.status);

    elsif v_action.action_type = 'cancel_appointment' then
      if v_action.target_appointment_id is null then raise exception 'target_appointment_required'; end if;
      select * into v_target from public.retail_appointments a
       where a.id=v_action.target_appointment_id and a.workspace_id=v_action.workspace_id and a.user_id=v_user_id
       for update;
      if not found then raise exception 'target_appointment_not_found'; end if;
      if v_target.status='completed' then raise exception 'completed_appointment_cannot_be_cancelled'; end if;
      if v_target.status <> 'cancelled' then
        update public.retail_appointments
           set status='cancelled', notes=concat_ws(E'\n', nullif(notes,''), v_note, 'Cancelled through an approved Blackstar Retail receptionist action.'), updated_at=now()
         where id=v_target.id returning * into v_target;
      end if;
      update public.retail_call_inbox
         set appointment_id=v_target.id, status='handled', needs_follow_up=false,
             outcome=concat_ws(E'\n', nullif(outcome,''), 'Appointment cancellation recorded through an approved Blackstar receptionist action.'), updated_at=now()
       where id=v_call.id;
      v_result := jsonb_build_object('appointment_id',v_target.id,'appointment_status','cancelled');

    elsif v_action.action_type = 'mark_follow_up' then
      update public.retail_call_inbox
         set status='follow_up', needs_follow_up=true,
             outcome=concat_ws(E'\n', nullif(outcome,''), v_note, 'Follow-up requested through an approved Blackstar receptionist action.'), updated_at=now()
       where id=v_call.id;
      v_result := jsonb_build_object('call_id',v_call.id,'call_status','follow_up','needs_follow_up',true);

    elsif v_action.action_type = 'close_call' then
      update public.retail_call_inbox
         set status='closed', needs_follow_up=false,
             outcome=concat_ws(E'\n', nullif(outcome,''), v_note, 'Call record closed through an approved Blackstar receptionist action.'), updated_at=now()
       where id=v_call.id;
      v_result := jsonb_build_object('call_id',v_call.id,'call_status','closed','needs_follow_up',false);

    else
      raise exception 'unsupported_call_action';
    end if;

    update public.retail_call_actions
       set status='executed', result=v_result, executed_at=now(), last_error=null, updated_at=now()
     where id=v_action.id;

    return jsonb_build_object('action_id',v_action.id,'status','executed','result',v_result,'idempotent',false);
  exception when others then
    v_error := left(sqlerrm,1800);
    update public.retail_call_actions
       set status='failed', last_error=v_error, executed_at=now(), updated_at=now()
     where id=v_action.id;
    return jsonb_build_object('action_id',v_action.id,'status','failed','error',v_error,'idempotent',false);
  end;
end;
$$;
revoke all on function private.retail_execute_call_action_impl(uuid) from public, anon;
grant execute on function private.retail_execute_call_action_impl(uuid) to authenticated, service_role;

create or replace function public.retail_execute_call_action(p_action_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.retail_execute_call_action_impl(p_action_id);
$$;
revoke all on function public.retail_execute_call_action(uuid) from public, anon;
grant execute on function public.retail_execute_call_action(uuid) to authenticated, service_role;
