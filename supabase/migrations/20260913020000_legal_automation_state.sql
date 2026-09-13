-- Phase 11: durable Legal Hub automation state.
-- Regulatory watches reuse Blackstar's authoritative runtime worker; date signals remain review reminders only.

alter table public.legal_regulatory_watches
  add column if not exists check_interval_hours integer not null default 24
    check (check_interval_hours between 1 and 720),
  add column if not exists next_check_at timestamptz not null default (now() + interval '24 hours'),
  add column if not exists claimed_at timestamptz,
  add column if not exists attempts integer not null default 0 check (attempts >= 0),
  add column if not exists last_error text;

alter table public.legal_compliance_obligations
  add column if not exists last_review_signal_for date;

alter table public.legal_rights_obligations
  add column if not exists last_due_signal_for date;

create index if not exists legal_watches_due_idx
  on public.legal_regulatory_watches(status, next_check_at, claimed_at)
  where status = 'active';

create index if not exists legal_compliance_review_signal_idx
  on public.legal_compliance_obligations(review_on, last_review_signal_for)
  where review_on is not null;

create index if not exists legal_rights_due_signal_idx
  on public.legal_rights_obligations(due_on, last_due_signal_for)
  where due_on is not null;
