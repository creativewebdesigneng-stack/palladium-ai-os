-- Tighten Retail commerce privileges so immutable ledgers are protected at both grant and RLS layers.
-- RLS remains the ownership boundary; explicit grants below also remove inherited UPDATE/DELETE/TRUNCATE capability from audit ledgers.
revoke all on table public.retail_external_order_links from authenticated;
revoke all on table public.retail_payment_events from authenticated;
revoke all on table public.retail_reconciliation_runs from authenticated;

grant select, insert, update, delete on table public.retail_external_order_links to authenticated;
grant select, insert on table public.retail_payment_events to authenticated;
grant select on table public.retail_reconciliation_runs to authenticated;
