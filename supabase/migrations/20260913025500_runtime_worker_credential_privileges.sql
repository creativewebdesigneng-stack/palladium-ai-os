-- Follow-up hardening for already-provisioned worker credential tables.
-- The runtime only needs to read token hashes; no table mutation is required through service_role.

revoke all on public.runtime_worker_credentials from public, anon, authenticated, service_role;
grant select on public.runtime_worker_credentials to service_role;
