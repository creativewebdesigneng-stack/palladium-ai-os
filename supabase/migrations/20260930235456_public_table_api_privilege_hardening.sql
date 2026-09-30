-- Remove table-management privileges from Blackstar's API roles.
-- Normal application CRUD remains intact; RLS continues to govern row access.
-- PostgreSQL TRUNCATE is not governed by row-level policies, and API roles do
-- not need REFERENCES, TRIGGER, or MAINTAIN for ordinary product operations.
--
-- Project migrations execute as postgres, so harden postgres-owned future
-- table defaults too. Supabase's internal supabase_admin default ACL is managed
-- outside this project's migration-role authority and is intentionally not
-- represented as changed here.

revoke truncate, references, trigger, maintain
on all tables in schema public
from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke truncate, references, trigger, maintain on tables
  from anon, authenticated;
