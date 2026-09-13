-- Production reconciliation for the Trading Hub workspace.
-- The base schema, optimized owner-scoped RLS, and simulation currency are defined
-- by the three immediately preceding migrations. This version intentionally
-- reasserts the least-privileged runtime surface and is safe on fresh databases.

alter table public.trading_watchlists enable row level security;
alter table public.trading_watchlist_items enable row level security;
alter table public.trading_journal_entries enable row level security;
alter table public.trading_simulations enable row level security;

revoke all on public.trading_watchlists from anon;
revoke all on public.trading_watchlist_items from anon;
revoke all on public.trading_journal_entries from anon;
revoke all on public.trading_simulations from anon;

grant select, insert, update, delete on public.trading_watchlists to authenticated;
grant select, insert, update, delete on public.trading_watchlist_items to authenticated;
grant select, insert, update, delete on public.trading_journal_entries to authenticated;
grant select, insert, update, delete on public.trading_simulations to authenticated;
