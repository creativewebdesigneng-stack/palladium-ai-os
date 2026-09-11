-- Blackstar Marketplace privacy hardening.
-- Marketplace and creator-profile reads are signed-in-only in the current application.
-- Remove legacy anonymous table access so published rows cannot leak internal UUIDs,
-- moderation notes or arbitrary metadata through direct Data API queries.

revoke select on table public.marketplace_agents from anon;
revoke select on table public.creator_profiles from anon;

drop policy if exists ma_public_read on public.marketplace_agents;
create policy ma_authenticated_published_read
  on public.marketplace_agents
  for select
  to authenticated
  using (status = 'published'::listing_status);

drop policy if exists cp_public_read on public.creator_profiles;
create policy cp_authenticated_read
  on public.creator_profiles
  for select
  to authenticated
  using (true);
