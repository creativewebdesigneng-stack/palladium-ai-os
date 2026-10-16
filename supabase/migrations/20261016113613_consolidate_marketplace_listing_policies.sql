-- Preserve the union of seller/public/moderator access in one policy per operation.
drop policy if exists marketplace_listings_read on public.marketplace_listings;
drop policy if exists marketplace_listings_moderator_read on public.marketplace_listings;
drop policy if exists marketplace_listings_update on public.marketplace_listings;
drop policy if exists marketplace_listings_moderator_update on public.marketplace_listings;
create policy marketplace_listings_read on public.marketplace_listings for select to authenticated using(
 status='published' or seller_id=(select auth.uid()) or exists(select 1 from public.marketplace_admins a where a.user_id=(select auth.uid()))
);
create policy marketplace_listings_update on public.marketplace_listings for update to authenticated using(
 seller_id=(select auth.uid()) or exists(select 1 from public.marketplace_admins a where a.user_id=(select auth.uid()))
) with check(
 listing_fee_pence=300 and (seller_id=(select auth.uid()) or exists(select 1 from public.marketplace_admins a where a.user_id=(select auth.uid())))
);
