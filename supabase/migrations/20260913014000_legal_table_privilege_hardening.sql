-- Remove Supabase default table privileges that exceed each Legal Hub table's RLS-backed API surface.
-- In particular, authenticated users must never retain TRUNCATE, TRIGGER or REFERENCES on these user-owned tables.

revoke all on table public.legal_compliance_obligations from anon, authenticated;
grant select, insert, update, delete on table public.legal_compliance_obligations to authenticated;

revoke all on table public.legal_regulatory_watches from anon, authenticated;
grant select, insert, update, delete on table public.legal_regulatory_watches to authenticated;

revoke all on table public.legal_research_matters from anon, authenticated;
grant select, insert, update, delete on table public.legal_research_matters to authenticated;

revoke all on table public.legal_research_runs from anon, authenticated;
grant select, insert, delete on table public.legal_research_runs to authenticated;

revoke all on table public.legal_rights_obligations from anon, authenticated;
grant select, insert, update, delete on table public.legal_rights_obligations to authenticated;
