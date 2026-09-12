create table if not exists public.legal_regulatory_watches(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(char_length(name) between 1 and 180),jurisdiction text not null check(char_length(jurisdiction) between 1 and 120),
 topic text not null check(char_length(topic) between 1 and 160),authority text,source_url text,
 status text not null default 'active' check(status in ('active','paused')),last_checked_at timestamptz,last_fingerprint text,last_summary text,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now());
alter table public.legal_regulatory_watches enable row level security;revoke all on public.legal_regulatory_watches from anon;
grant select,insert,update,delete on public.legal_regulatory_watches to authenticated;
create policy "legal_watches_select_own" on public.legal_regulatory_watches for select to authenticated using((select auth.uid())=user_id);
create policy "legal_watches_insert_own" on public.legal_regulatory_watches for insert to authenticated with check((select auth.uid())=user_id);
create policy "legal_watches_update_own" on public.legal_regulatory_watches for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy "legal_watches_delete_own" on public.legal_regulatory_watches for delete to authenticated using((select auth.uid())=user_id);
create index if not exists legal_watches_user_status_idx on public.legal_regulatory_watches(user_id,status,updated_at desc);