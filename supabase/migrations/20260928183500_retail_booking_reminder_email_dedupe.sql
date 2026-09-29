-- Blackstar Retail: repair the booking-reminder owner/workspace RLS binding before connected email delivery.
-- The previous policy accidentally compared a.workspace_id to itself, which did
-- not prove that the persisted reminder workspace matched the owned appointment.
drop policy if exists retail_booking_reminders_insert_own on public.retail_booking_reminders;
create policy retail_booking_reminders_insert_own
  on public.retail_booking_reminders
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.retail_appointments a
      where a.id = retail_booking_reminders.appointment_id
        and a.workspace_id = retail_booking_reminders.workspace_id
        and a.user_id = (select auth.uid())
    )
  );

drop policy if exists retail_booking_reminders_update_own on public.retail_booking_reminders;
create policy retail_booking_reminders_update_own
  on public.retail_booking_reminders
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.retail_appointments a
      where a.id = retail_booking_reminders.appointment_id
        and a.workspace_id = retail_booking_reminders.workspace_id
        and a.user_id = (select auth.uid())
    )
  );

-- Blackstar Retail: at-most-once persistence boundary for booking-reminder communications.
create unique index if not exists retail_customer_communications_booking_reminder_uidx
  on public.retail_customer_communications (user_id, (metadata ->> 'retail_booking_reminder_id'))
  where metadata ? 'retail_booking_reminder_id'
    and nullif(metadata ->> 'retail_booking_reminder_id', '') is not null;

-- One governed Retail action per owner-scheduled reminder. The scheduled reminder
-- is the durable owner authorization; the action still has to be atomically claimed
-- by the existing Retail connected-delivery executor before any provider write.
create unique index if not exists retail_reception_actions_booking_reminder_uidx
  on public.retail_reception_actions (user_id, (payload ->> 'retail_booking_reminder_id'))
  where action_type = 'send_communication'
    and payload ? 'retail_booking_reminder_id'
    and nullif(payload ->> 'retail_booking_reminder_id', '') is not null;
