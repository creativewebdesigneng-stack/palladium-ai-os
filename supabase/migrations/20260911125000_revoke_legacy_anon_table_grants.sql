-- Blackstar production defence-in-depth hardening.
-- RLS already blocks anonymous access to private tables, but legacy blanket table grants
-- make future policy mistakes higher impact. Remove anonymous table privileges globally,
-- then restore only the deliberately public pricing catalogue.

revoke all privileges on all tables in schema public from anon;
revoke all privileges on all sequences in schema public from anon;

grant select on table public.plans to anon;

-- Public App Studio releases are served through the narrowly scoped
-- SECURITY DEFINER RPC public.get_published_app_studio_release(uuid), so
-- anonymous direct table access is not required.
