-- Blackstar Retail service automation hardening.

-- Reception action execution state is trusted-server-owned. Authenticated users may review/approve/dismiss
-- and edit the proposed action details, but cannot claim execution or change who requested the action.
revoke update on table public.retail_reception_actions from authenticated;
grant update(call_id, appointment_id, order_id, action_type, status, summary, payload, updated_at)
  on table public.retail_reception_actions to authenticated;

drop policy if exists retail_reception_actions_update_own on public.retail_reception_actions;
create policy retail_reception_actions_update_own on public.retail_reception_actions for update to authenticated
  using ((select auth.uid()) = user_id and status in ('pending_review','approved','dismissed'))
  with check (
    (select auth.uid()) = user_id
    and status in ('pending_review','approved','dismissed')
    and exists (select 1 from public.retail_workspaces w where w.id = workspace_id and w.user_id = (select auth.uid()))
    and (call_id is null or exists (select 1 from public.retail_call_inbox c where c.id = call_id and c.workspace_id = workspace_id and c.user_id = (select auth.uid())))
    and (appointment_id is null or exists (select 1 from public.retail_appointments a where a.id = appointment_id and a.workspace_id = workspace_id and a.user_id = (select auth.uid())))
    and (order_id is null or exists (select 1 from public.retail_orders o where o.id = order_id and o.workspace_id = workspace_id and o.user_id = (select auth.uid())))
  );

-- Rebuild communication preparation without evaluating a free-form workspace timezone string.
-- The stored timestamptz is rendered with its timezone suffix; customer-facing timezone formatting can
-- be delegated to a validated provider/template layer later.
create or replace function private.retail_prepare_due_communications()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.retail_customer_communications(
    user_id, workspace_id, appointment_id, channel, purpose, recipient, subject, body, scheduled_for, status, metadata
  )
  select
    a.user_id, a.workspace_id, a.id, rp.default_channel, 'appointment_reminder_1',
    case when rp.default_channel = 'email' then a.customer_email else a.customer_phone end,
    case when rp.default_channel = 'email' then 'Appointment reminder' else null end,
    'Reminder: your appointment with ' || w.business_name || ' is scheduled for ' || to_char(a.starts_at, 'YYYY-MM-DD HH24:MI TZ') || '. Please contact the business if you need to change it.',
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

  insert into public.retail_customer_communications(
    user_id, workspace_id, appointment_id, channel, purpose, recipient, subject, body, scheduled_for, status, metadata
  )
  select
    a.user_id, a.workspace_id, a.id, rp.default_channel, 'appointment_reminder_2',
    case when rp.default_channel = 'email' then a.customer_email else a.customer_phone end,
    case when rp.default_channel = 'email' then 'Appointment reminder' else null end,
    'Reminder: your appointment with ' || w.business_name || ' is scheduled for ' || to_char(a.starts_at, 'YYYY-MM-DD HH24:MI TZ') || '. Please contact the business if you need to change it.',
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
