-- Cover remaining uncovered Marketplace foreign keys reported by production advisor.
create index if not exists marketplace_deliveries_buyer_id_idx on public.marketplace_deliveries(buyer_id);
create index if not exists marketplace_deliveries_seller_id_idx on public.marketplace_deliveries(seller_id);
create index if not exists marketplace_disputes_opened_by_idx on public.marketplace_disputes(opened_by);
create index if not exists marketplace_disputes_resolved_by_idx on public.marketplace_disputes(resolved_by) where resolved_by is not null;
create index if not exists marketplace_listing_fee_payments_listing_id_idx on public.marketplace_listing_fee_payments(listing_id);
create index if not exists marketplace_listing_fee_payments_seller_id_idx on public.marketplace_listing_fee_payments(seller_id);
create index if not exists marketplace_moderation_cases_listing_id_idx on public.marketplace_moderation_cases(listing_id);
create index if not exists marketplace_moderation_cases_reviewed_by_idx on public.marketplace_moderation_cases(reviewed_by) where reviewed_by is not null;
create index if not exists marketplace_moderation_cases_seller_id_idx on public.marketplace_moderation_cases(seller_id);
create index if not exists marketplace_order_settlements_seller_id_idx on public.marketplace_order_settlements(seller_id);
create index if not exists marketplace_orders_listing_id_idx on public.marketplace_orders(listing_id);
create index if not exists marketplace_reviews_buyer_id_idx on public.marketplace_reviews(buyer_id);
create index if not exists marketplace_reviews_listing_id_idx on public.marketplace_reviews(listing_id);
create index if not exists marketplace_reviews_seller_id_idx on public.marketplace_reviews(seller_id);
