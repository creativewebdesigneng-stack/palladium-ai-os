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
