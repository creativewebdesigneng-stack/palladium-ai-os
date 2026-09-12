create table if not exists public.legal_compliance_obligations (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(char_length(title) between 1 and 180),
 jurisdiction text not null check(char_length(jurisdiction) between 1 and 120),
 authority text,
 source_url text,
 category text not null default 'general',
 owner_name text,
 status text not null default 'review' check(status in ('review','applicable','implemented','not_applicable','monitor')),
 review_on date,
 notes text check(notes is null or char_length(notes)<=4000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.legal_compliance_obligations enable row level security;
revoke all on public.legal_compliance_obligations from anon;
grant select,insert,update,delete on public.legal_compliance_obligations to authenticated;
create policy "legal_compliance_select_own" on public.legal_compliance_obligations for select to authenticated using((select auth.uid())=user_id);
create policy "legal_compliance_insert_own" on public.legal_compliance_obligations for insert to authenticated with check((select auth.uid())=user_id);
create policy "legal_compliance_update_own" on public.legal_compliance_obligations for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy "legal_compliance_delete_own" on public.legal_compliance_obligations for delete to authenticated using((select auth.uid())=user_id);
create index if not exists legal_compliance_user_review_idx on public.legal_compliance_obligations(user_id,review_on);
