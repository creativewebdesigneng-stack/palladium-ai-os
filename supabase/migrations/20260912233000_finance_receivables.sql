create table if not exists public.finance_receivables (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 customer text not null check(char_length(customer) between 1 and 160), reference text check(reference is null or char_length(reference)<=120),
 amount numeric(18,2) not null check(amount>=0), currency text not null default 'GBP' check(char_length(currency)=3),
 issued_on date not null, due_on date not null, status text not null default 'open' check(status in ('open','paid','overdue','cancelled')),
 paid_on date, notes text check(notes is null or char_length(notes)<=1000), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(due_on>=issued_on)
);
alter table public.finance_receivables enable row level security; revoke all on public.finance_receivables from anon; grant select,insert,update,delete on public.finance_receivables to authenticated;
create policy "finance_receivables_select_own" on public.finance_receivables for select to authenticated using((select auth.uid())=user_id);
create policy "finance_receivables_insert_own" on public.finance_receivables for insert to authenticated with check((select auth.uid())=user_id);
create policy "finance_receivables_update_own" on public.finance_receivables for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy "finance_receivables_delete_own" on public.finance_receivables for delete to authenticated using((select auth.uid())=user_id);
create index if not exists finance_receivables_user_due_idx on public.finance_receivables(user_id,due_on);
