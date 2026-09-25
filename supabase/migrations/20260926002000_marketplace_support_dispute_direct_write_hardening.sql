-- Phase-two hardening: after all production callers use the governed RPCs,
-- remove direct browser mutation paths for Marketplace support disputes.
revoke insert, update on public.marketplace_disputes from authenticated;
drop policy if exists marketplace_disputes_buyer_insert on public.marketplace_disputes;
drop policy if exists marketplace_disputes_parties_update on public.marketplace_disputes;
