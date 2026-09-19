-- A booking reminder may have at most one outbound communication ledger row.
-- The worker already uses a lease; this index closes the remaining race at the
-- persistence boundary for SMS, WhatsApp and connected email execution.
create unique index if not exists retail_customer_communications_booking_reminder_uidx
  on public.retail_customer_communications ((metadata ->> 'retail_booking_reminder_id'))
  where metadata ? 'retail_booking_reminder_id'
    and nullif(metadata ->> 'retail_booking_reminder_id', '') is not null;