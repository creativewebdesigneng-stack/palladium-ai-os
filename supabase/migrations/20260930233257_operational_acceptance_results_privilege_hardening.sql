-- Restrict the operational acceptance ledger to the mutations the console uses.
-- Supabase default table grants may include DELETE/TRUNCATE and other privileges;
-- TRUNCATE is not governed by row-level policies, so revoke broadly first.

revoke all privileges on table public.operational_acceptance_results from anon;
revoke all privileges on table public.operational_acceptance_results from authenticated;

grant select, insert, update
on table public.operational_acceptance_results
to authenticated;
