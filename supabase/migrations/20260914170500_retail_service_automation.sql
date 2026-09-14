-- Blackstar Retail service automation
-- Structured return lines + atomic restocking, AI receptionist operating profile/action queue,
-- customer communication queue, and safe database preparation of appointment/no-show communications.

create table public.retail_return_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  return_id uuid not null references public.retail_returns(id) on delete cascade,
  item_id uuid not null references public.retail_catalog_items(id) on delete restrict,
  location_id uuid references public.retail_locations(id) on delete restrict,
  quantity numeric(14,3) not null check (quantity > 0),
  condition text not null default 'sellable' check (condition in ('sellable','opened','damaged','defective','unknown')),
  disposition text not null default 'restock' check (disposition in ('restock','quarantine','discard','return_to_supplier','inspect')),
  processed_quantity numeric(14,3) not null default 0 check (processed_quantity >= 0 and processed_quantity <= quantity),
  processed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index retail_return_items_return_item_location_uq on public.retail_return_items(return_id, item_id, coalesce(location_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index retail_return_items_workspace_idx on public.retail_return_items(workspace_id, return_id);
create index retail_return_items_item_fk_idx on public.retail_return_items(item_id);
create index retail_return_items_location_fk_idx on public.retail_return_items(location_id);
create index retail_return_items_user_idx on public.retail_return_items(user_id, updated_at desc);

create table public.retail_reception_profiles (
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
  default_channel text not null default 'sms' check (default_channel in ('sms','email','voice','whatsapp')),
  appointment_reminders boolean not null default true,
  first_reminder_hours integer not null default 24 check (first_reminder_hours between 1 and 720),
  second_reminder_hours integer check (second_reminder_hours is null or second_reminder_hours between 1 and 168),
  no_show_followup boolean not null default true,
  ai_actions_enabled boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id)
);
create index retail_reception_profiles_user_idx on public.retail_reception_profiles(user_id, updated_at desc);

create table public.retail_reception_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  call_id uuid references public.retail_call_inbox(id) on delete set null,
  appointment_id uuid references public.retail_appointments(id) on delete set null,
  order_id uuid references public.retail_orders(id) on delete set null,
  action_type text not null check (action_type in ('create_booking','reschedule_booking','cancel_booking','callback','order_status_reply','product_or_service_query','custom')),
  status text not null default 'pending_review' check (status in ('pending_review','approved','executed','dismissed','failed')),
  requested_by text not null default 'manual' check (requested_by in ('manual','ai','voice_provider','integration')),
  summary text not null check (char_length(summary) between 1 and 2000),
  payload jsonb not null default '{}'::jsonb,
  executed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index retail_reception_actions_workspace_idx on public.retail_reception_actions(workspace_id, status, created_at desc);
create index retail_reception_actions_call_fk_idx on public.retail_reception_actions(call_id);
create index retail_reception_actions_appointment_fk_idx on public.retail_reception_actions(appointment_id);
create index retail_reception_actions_order_fk_idx on public.retail_reception_actions(order_id);
create index retail_reception_actions_user_idx on public.retail_reception_actions(user_id, updated_at desc);

create table public.retail_customer_communications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  appointment_id uuid references public.retail_appointments(id) on delete cascade,
  call_id uuid references public.retail_call_inbox(id) on delete set null,
  order_id uuid references public.retail_orders(id) on delete set null,
  action_id uuid references public.retail_reception_actions(id) on delete set null,
  channel text not null check (channel in ('sms','email','voice','whatsapp')),
  purpose text not null check (purpose in ('appointment_reminder_1','appointment_reminder_2','appointment_confirmation','no_show_followup','callback','order_update','custom')),
  recipient text not null check (char_length(recipient) between 1 and 320),
  subject text,
  body text not null check (char_length(body) between 1 and 4000),
  scheduled_for timestamptz not null default now(),
  status text not null default 'ready' check (status in ('draft','ready','sending','sent','failed','cancelled')),
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
create index retail_customer_comms_appointment_fk_idx on public.retail_customer_communications(appointment_id);
create index retail_customer_comms_call_fk_idx on public.retail_customer_communications(call_id);
create index retail_customer_comms_order_fk_idx on public.retail_customer_communications(order_id);
create index retail_customer_comms_action_fk_idx on public.retail_customer_communications(action_id);
create index retail_customer_comms_user_idx on public.retail_customer_communications(user_id, updated_at desc);
create unique index retail_customer_comms_appointment_purpose_uq
  on public.retail_customer_communications(appointment_id, purpose)
  where appointment_id is not null and purpose in ('appointment_reminder_1','appointment_reminder_2','no_show_followup');

-- Updated-at triggers.
do $$
declare t text;
begin
  foreach t in array array['retail_return_items','retail_reception_profiles','retail_reception_actions','retail_customer_communications']
  loop
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.retail_set_updated_at()', t, t);
  end loop;
end $$;

-- Base RLS and least-privilege grants.
do $$
declare t text;
begin
  foreach t in array array['retail_return_items','retail_reception_profiles','retail_reception_actions','retail_customer_communications']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
    execute format('create policy %I_select_own on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t, t);
  end loop;
end $$;

-- Return items: processing fields are executor-owned and processed lines cannot be altered/deleted.
revoke update on table public.retail_return_items from authenticated;
grant update(item_id, location_id, quantity, condition, disposition, notes, updated_at) on table public.retail_return_items to authenticated;
create policy retail_return_items_insert_own on public.retail_return_items for insert to authenticated with check (
  (select auth.uid()) = user_id and processed_quantity = 0 and processed_at is null
  and exists (select 1 from public.retail_returns r where r.id = return_id and r.workspace_id = workspace_id and r.user_id = (select auth.uid()))
  and exists (select 1 from public.retail_catalog_items i where i.id = item_id and i.workspace_id = workspace_id and i.user_id = (select auth.uid()) and i.track_inventory)
  and (location_id is null or exists (select 1 from public.retail_locations l where l.id = location_id and l.workspace_id = workspace_id and l.user_id = (select auth.uid())))
);
create policy retail_return_items_update_own on public.retail_return_items for update to authenticated
  using ((select auth.uid()) = user_id and processed_quantity = 0)
  with check (
    (select auth.uid()) = user_id and processed_quantity = 0 and processed_at is null
    and exists (select 1 from public.retail_returns r where r.id = return_id and r.workspace_id = workspace_id and r.user_id = (select auth.uid()))
    and exists (select 1 from public.retail_catalog_items i where i.id = item_id and i.workspace_id = workspace_id and i.user_id = (select auth.uid()) and i.track_inventory)
    and (location_id is null or exists (select 1 from public.retail_locations l where l.id = location_id and l.workspace_id = workspace_id and l.user_id = (select auth.uid())))
  );
create policy retail_return_items_delete_own on public.retail_return_items for delete to authenticated
  using ((select auth.uid()) = user_id and processed_quantity = 0);

create policy retail_reception_profiles_insert_own on public.retail_reception_profiles for insert to authenticated with check (
  (select auth.uid()) = user_id and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid()))
);
create policy retail_reception_profiles_update_own on public.retail_reception_profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid())));
create policy retail_reception_profiles_delete_own on public.retail_reception_profiles for delete to authenticated using ((select auth.uid()) = user_id);

-- User-created reception actions are manual. AI/provider actions must come from trusted service paths.
create policy retail_reception_actions_insert_own on public.retail_reception_actions for insert to authenticated with check (
  (select auth.uid()) = user_id and requested_by = 'manual' and status = 'pending_review'
  and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid()))
  and (call_id is null or exists (select 1 from public.retail_call_inbox c where c.id = call_id and c.workspace_id = workspace_id and c.user_id = (select auth.uid())))
  and (appointment_id is null or exists (select 1 from public.retail_appointments a where a.id = appointment_id and a.workspace_id = workspace_id and a.user_id = (select auth.uid())))
  and (order_id is null or exists (select 1 from public.retail_orders o where o.id = order_id and o.workspace_id = workspace_id and o.user_id = (select auth.uid())))
);
create policy retail_reception_actions_update_own on public.retail_reception_actions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid())));
create policy retail_reception_actions_delete_own on public.retail_reception_actions for delete to authenticated
  using ((select auth.uid()) = user_id and status in ('pending_review','dismissed'));

-- Communications: clients can draft/edit/cancel; provider outcome fields are trusted-executor only.
revoke update on table public.retail_customer_communications from authenticated;
grant update(channel, recipient, subject, body, scheduled_for, status, metadata, updated_at)
  on table public.retail_customer_communications to authenticated;
create policy retail_customer_communications_insert_own on public.retail_customer_communications for insert to authenticated with check (
  (select auth.uid()) = user_id and status in ('draft','ready') and provider is null and provider_message_id is null and sent_at is null and delivered_at is null and last_error is null
  and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid()))
  and (appointment_id is null or exists (select 1 from public.retail_appointments a where a.id = appointment_id and a.workspace_id = workspace_id and a.user_id = (select auth.uid())))
  and (call_id is null or exists (select 1 from public.retail_call_inbox c where c.id = call_id and c.workspace_id = workspace_id and c.user_id = (select auth.uid())))
  and (order_id is null or exists (select 1 from public.retail_orders o where o.id = order_id and o.workspace_id = workspace_id and o.user_id = (select auth.uid())))
  and (action_id is null or exists (select 1 from public.retail_reception_actions ra where ra.id = action_id and ra.workspace_id = workspace_id and ra.user_id = (select auth.uid())))
);
create policy retail_customer_communications_update_own on public.retail_customer_communications for update to authenticated
  using ((select auth.uid()) = user_id and status in ('draft','ready','cancelled'))
  with check (
    (select auth.uid()) = user_id and status in ('draft','ready','cancelled')
    and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid()))
  );
create policy retail_customer_communications_delete_own on public.retail_customer_communications for delete to authenticated
  using ((select auth.uid()) = user_id and status in ('draft','ready','cancelled'));

-- Atomic restocking of physically received, sellable return lines.
create or replace function private.retail_process_return_restock_impl(p_return_id uuid)
returns public.retail_returns
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_return public.retail_returns%rowtype;
  v_line record;
  v_quantity numeric;
  v_processed integer := 0;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;

  select * into v_return from public.retail_returns
  where id = p_return_id and user_id = v_uid
  for update;
  if not found then raise exception 'Return not found'; end if;
  if not v_return.restock then raise exception 'Return is not marked for restocking'; end if;
  if v_return.status not in ('received','refunded') then raise exception 'Return must be received before restocking'; end if;

  for v_line in
    select ri.* from public.retail_return_items ri
    where ri.return_id = p_return_id and ri.user_id = v_uid
      and ri.disposition = 'restock' and ri.condition = 'sellable'
      and ri.processed_quantity < ri.quantity
    order by ri.item_id, ri.location_id nulls last
    for update
  loop
    if v_line.location_id is null then raise exception 'Restock location is required for item %', v_line.item_id; end if;
    v_quantity := v_line.quantity - v_line.processed_quantity;

    insert into public.retail_inventory_levels(user_id, workspace_id, location_id, item_id, on_hand, reserved, updated_at)
    values (v_uid, v_return.workspace_id, v_line.location_id, v_line.item_id, v_quantity, 0, now())
    on conflict (workspace_id, item_id, coalesce(location_id, '00000000-0000-0000-0000-000000000000'::uuid))
    do update set on_hand = public.retail_inventory_levels.on_hand + excluded.on_hand, updated_at = now();

    insert into public.retail_inventory_movements(user_id, workspace_id, location_id, item_id, movement_type, quantity, reference_type, reference_id, note)
    values (v_uid, v_return.workspace_id, v_line.location_id, v_line.item_id, 'return', v_quantity, 'return', p_return_id::text, coalesce(v_line.notes, v_return.notes));

    update public.retail_return_items
    set processed_quantity = quantity, processed_at = now(), updated_at = now()
    where id = v_line.id;
    v_processed := v_processed + 1;
  end loop;

  if v_processed = 0 then raise exception 'No eligible sellable return lines are ready to restock'; end if;
  return v_return;
end;
$$;

create or replace function public.retail_process_return_restock(p_return_id uuid)
returns public.retail_returns
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.retail_process_return_restock_impl(p_return_id);
end;
$$;
revoke all on function private.retail_process_return_restock_impl(uuid) from public, anon;
grant execute on function private.retail_process_return_restock_impl(uuid) to authenticated, service_role;
revoke all on function public.retail_process_return_restock(uuid) from public, anon;
grant execute on function public.retail_process_return_restock(uuid) to authenticated, service_role;
grant usage on schema private to authenticated, service_role;

-- Prepare customer communications from Retail booking rules. This creates queue records only;
-- it never claims an SMS, email, WhatsApp message or phone call was delivered.
create or replace function private.retail_prepare_due_communications()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- First reminder, prepared up to 7 days ahead with an exact scheduled_for timestamp.
  insert into public.retail_customer_communications(
    user_id, workspace_id, appointment_id, channel, purpose, recipient, subject, body, scheduled_for, status, metadata
  )
  select
    a.user_id, a.workspace_id, a.id, rp.default_channel, 'appointment_reminder_1',
    case when rp.default_channel = 'email' then a.customer_email else a.customer_phone end,
    case when rp.default_channel = 'email' then 'Appointment reminder' else null end,
    'Reminder: your appointment with ' || w.business_name || ' is scheduled for ' || to_char(a.starts_at at time zone w.timezone, 'YYYY-MM-DD HH24:MI') || '. Please contact the business if you need to change it.',
    a.starts_at - make_interval(hours => rp.first_reminder_hours), 'ready',
    jsonb_build_object('source','retail_automation','provider_delivery_required',true,'reminder_hours',rp.first_reminder_hours)
  from public.retail_appointments a
  join public.retail_workspaces w on w.id = a.workspace_id and w.user_id = a.user_id
  join public.retail_reception_profiles rp on rp.workspace_id = a.workspace_id and rp.user_id = a.user_id
  where rp.active and rp.appointment_reminders
    and a.status in ('booked','confirmed')
    and a.starts_at > now() and a.starts_at <= now() + interval '7 days'
    and ((rp.default_channel = 'email' and nullif(btrim(a.customer_email),'') is not null)
      or (rp.default_channel <> 'email' and nullif(btrim(a.customer_phone),'') is not null))
  on conflict (appointment_id, purpose) where appointment_id is not null and purpose in ('appointment_reminder_1','appointment_reminder_2','no_show_followup') do nothing;

  -- Optional second reminder.
  insert into public.retail_customer_communications(
    user_id, workspace_id, appointment_id, channel, purpose, recipient, subject, body, scheduled_for, status, metadata
  )
  select
    a.user_id, a.workspace_id, a.id, rp.default_channel, 'appointment_reminder_2',
    case when rp.default_channel = 'email' then a.customer_email else a.customer_phone end,
    case when rp.default_channel = 'email' then 'Appointment reminder' else null end,
    'Reminder: your appointment with ' || w.business_name || ' is scheduled for ' || to_char(a.starts_at at time zone w.timezone, 'YYYY-MM-DD HH24:MI') || '. Please contact the business if you need to change it.',
    a.starts_at - make_interval(hours => rp.second_reminder_hours), 'ready',
    jsonb_build_object('source','retail_automation','provider_delivery_required',true,'reminder_hours',rp.second_reminder_hours)
  from public.retail_appointments a
  join public.retail_workspaces w on w.id = a.workspace_id and w.user_id = a.user_id
  join public.retail_reception_profiles rp on rp.workspace_id = a.workspace_id and rp.user_id = a.user_id
  where rp.active and rp.appointment_reminders and rp.second_reminder_hours is not null
    and a.status in ('booked','confirmed')
    and a.starts_at > now() and a.starts_at <= now() + interval '7 days'
    and ((rp.default_channel = 'email' and nullif(btrim(a.customer_email),'') is not null)
      or (rp.default_channel <> 'email' and nullif(btrim(a.customer_phone),'') is not null))
  on conflict (appointment_id, purpose) where appointment_id is not null and purpose in ('appointment_reminder_1','appointment_reminder_2','no_show_followup') do nothing;

  -- No-show follow-up queue item.
  insert into public.retail_customer_communications(
    user_id, workspace_id, appointment_id, channel, purpose, recipient, subject, body, scheduled_for, status, metadata
  )
  select
    a.user_id, a.workspace_id, a.id, rp.default_channel, 'no_show_followup',
    case when rp.default_channel = 'email' then a.customer_email else a.customer_phone end,
    case when rp.default_channel = 'email' then 'We missed you' else null end,
    'We missed you at ' || w.business_name || '. If you would like to rebook, please contact us and we will help arrange another time.',
    now(), 'ready', jsonb_build_object('source','retail_automation','provider_delivery_required',true)
  from public.retail_appointments a
  join public.retail_workspaces w on w.id = a.workspace_id and w.user_id = a.user_id
  join public.retail_reception_profiles rp on rp.workspace_id = a.workspace_id and rp.user_id = a.user_id
  where rp.active and rp.no_show_followup and a.status = 'no_show'
    and ((rp.default_channel = 'email' and nullif(btrim(a.customer_email),'') is not null)
      or (rp.default_channel <> 'email' and nullif(btrim(a.customer_phone),'') is not null))
  on conflict (appointment_id, purpose) where appointment_id is not null and purpose in ('appointment_reminder_1','appointment_reminder_2','no_show_followup') do nothing;

  -- When a queued communication is due but still has no delivery provider, notify the owner in-app once.
  insert into public.notifications(user_id, kind, severity, title, body, link, metadata)
  select c.user_id, 'retail.communication_ready', 'warning',
    'Retail customer communication needs delivery',
    'A scheduled Retail customer communication is due. It is prepared, but Blackstar has not recorded provider delivery; connect a messaging/phone provider or handle it manually.',
    '/retail-hub',
    jsonb_build_object('retail_communication_id', c.id, 'workspace_id', c.workspace_id, 'channel', c.channel, 'purpose', c.purpose)
  from public.retail_customer_communications c
  left join public.notification_preferences np on np.user_id = c.user_id
  where c.status = 'ready' and c.scheduled_for <= now()
    and coalesce(np.in_app, true)
    and coalesce(np.min_severity, 'info') in ('info','warning')
    and not ('retail.communication_ready' = any(coalesce(np.muted_types, '{}'::text[])))
    and not exists (
      select 1 from public.notifications n
      where n.user_id = c.user_id and n.kind = 'retail.communication_ready'
        and n.metadata->>'retail_communication_id' = c.id::text
    );
end;
$$;
revoke all on function private.retail_prepare_due_communications() from public, anon, authenticated;
grant execute on function private.retail_prepare_due_communications() to service_role;

-- Run preparation every 15 minutes. It only writes queue/notification records; no external side effect occurs.
do $$
declare v_job_id bigint;
begin
  select jobid into v_job_id from cron.job where jobname = 'blackstar-retail-communication-prep' limit 1;
  if v_job_id is not null then perform cron.unschedule(v_job_id); end if;
  perform cron.schedule('blackstar-retail-communication-prep', '*/15 * * * *', 'select private.retail_prepare_due_communications();');
end $$;
