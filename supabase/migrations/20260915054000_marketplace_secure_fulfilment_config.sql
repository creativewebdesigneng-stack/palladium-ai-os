-- Protected fulfilment configuration. Buyers never receive seller delivery data before verified payment.
alter table public.marketplace_listings add column if not exists delivery_instructions text,add column if not exists delivery_reference text;
revoke update(delivery_instructions,delivery_reference,listing_fee_paid_at,published_at) on public.marketplace_listings from authenticated;
grant update(title,description,item_type,price_pence,delivery_type,preview_url,thumbnail_url,tags,metadata,status,updated_at) on public.marketplace_listings to authenticated;