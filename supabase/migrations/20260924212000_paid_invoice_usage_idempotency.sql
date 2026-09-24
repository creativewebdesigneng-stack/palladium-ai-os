-- Stripe may deliver different signed event IDs for the SAME paid invoice.
-- Enforce one billing.invoice_paid usage entry per authoritative provider invoice
-- and payment environment, even if two webhook handlers race before reading it.
-- Existing production preflight: zero billing.invoice_paid rows / duplicates.
create unique index if not exists usage_records_paid_invoice_provider_once_idx
  on public.usage_records ((metadata->>'invoice_id'), (metadata->>'environment'))
  where metric='billing.invoice_paid'
    and metadata ? 'invoice_id'
    and metadata ? 'environment';

-- Keep existing usage_records RLS, grants, row ownership and reporting schema.
-- This index does not grant direct settlement writes or run any real payment.
