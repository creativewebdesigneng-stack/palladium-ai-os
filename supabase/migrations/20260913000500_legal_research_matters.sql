create table if not exists public.legal_research_matters(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(char_length(title) between 1 and 180),jurisdiction text not null check(char_length(jurisdiction) between 1 and 120),
 topic text not null default 'general',question text not null check(char_length(question) between 3 and 4000),
 status text not null default 'open' check(status in ('open','review','closed')),notes text check(notes is null or char_length(notes)<=8000),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.legal_research_runs(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 matter_id uuid not null references public.legal_research_matters(id) on delete cascade,query text not null,jurisdiction text not null,topic text,
 report text not null,provider text,model text,sources jsonb not null default '[]'::jsonb,created_at timestamptz not null default now());
alter table public.legal_research_matters enable row level security;alter table public.legal_research_runs enable row level security;
revoke all on public.legal_research_matters from anon;revoke all on public.legal_research_runs from anon;
grant select,insert,update,delete on public.legal_research_matters to authenticated;grant select,insert,delete on public.legal_research_runs to authenticated;
create policy "legal_matters_select_own" on public.legal_research_matters for select to authenticated using((select auth.uid())=user_id);
create policy "legal_matters_insert_own" on public.legal_research_matters for insert to authenticated with check((select auth.uid())=user_id);
create policy "legal_matters_update_own" on public.legal_research_matters for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy "legal_matters_delete_own" on public.legal_research_matters for delete to authenticated using((select auth.uid())=user_id);
create policy "legal_runs_select_own" on public.legal_research_runs for select to authenticated using((select auth.uid())=user_id);
create policy "legal_runs_insert_own" on public.legal_research_runs for insert to authenticated with check((select auth.uid())=user_id and exists(select 1 from public.legal_research_matters m where m.id=matter_id and m.user_id=(select auth.uid())));
create policy "legal_runs_delete_own" on public.legal_research_runs for delete to authenticated using((select auth.uid())=user_id);
create index if not exists legal_matters_user_updated_idx on public.legal_research_matters(user_id,updated_at desc);
create index if not exists legal_runs_matter_created_idx on public.legal_research_runs(matter_id,created_at desc);