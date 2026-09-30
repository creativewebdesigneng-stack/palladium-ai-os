-- Audit events are written by server-side service-role code.
-- Authenticated users only need to read rows allowed by the existing audit_select RLS policy.
-- Revoke broad Supabase default grants, including TRUNCATE which is not governed by RLS.

revoke all privileges on table public.mission_audit_logs from anon;
revoke all privileges on table public.mission_audit_logs from authenticated;

grant select
on table public.mission_audit_logs
to authenticated;
