create table if not exists public.finance_alerts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (char_length(name) between 1 and 120),
 metric text not null check (metric in ('portfolio_value','cash_reserve','monthly_expense','monthly_revenue')),
 operator text not null check (operator in ('above','below')),
 threshold numeric(18,2) not null check (threshold >= 0),
 enabled boolean not null default true,
 last_triggered_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.finance_alerts enable row level security;
revoke all on public.finance_alerts from anon;
grant select,insert,update,delete on public.finance_alerts to authenticated;
create policy "finance_alerts_select_own" on public.finance_alerts for select to authenticated using ((select auth.uid())=user_id);
create policy "finance_alerts_insert_own" on public.finance_alerts for insert to authenticated with check ((select auth.uid())=user_id);
create policy "finance_alerts_update_own" on public.finance_alerts for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "finance_alerts_delete_own" on public.finance_alerts for delete to authenticated using ((select auth.uid())=user_id);
create index if not exists finance_alerts_user_idx on public.finance_alerts(user_id);
