-- Blackstar Retail: at-most-once persistence boundary for booking-reminder communications.
create unique index if not exists retail_customer_communications_booking_reminder_uidx
  on public.retail_customer_communications (user_id, (metadata ->> 'retail_booking_reminder_id'))
  where metadata ? 'retail_booking_reminder_id'
    and nullif(metadata ->> 'retail_booking_reminder_id', '') is not null;
