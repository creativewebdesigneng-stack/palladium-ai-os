-- Qualify every correlated purchase identity; the original unqualified comparison
-- resolved to the order column on both sides. The invoker trigger also protects updates.
drop policy if exists marketplace_reviews_verified_insert on public.marketplace_reviews;
create policy marketplace_reviews_verified_insert on public.marketplace_reviews for insert to authenticated with check(
 buyer_id=(select auth.uid()) and exists(
  select 1 from public.marketplace_orders o where o.id=marketplace_reviews.order_id
   and o.buyer_id=(select auth.uid()) and o.buyer_id=marketplace_reviews.buyer_id
   and o.listing_id=marketplace_reviews.listing_id and o.seller_id=marketplace_reviews.seller_id
   and o.status in ('paid','fulfilled')
 )
);
