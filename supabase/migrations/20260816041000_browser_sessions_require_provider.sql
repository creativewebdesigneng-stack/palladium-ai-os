-- Production hardening: browser sessions must explicitly declare the real provider.
-- Historical rows are intentionally left unchanged for audit accuracy.
alter table public.browser_sessions
  alter column provider drop default;
