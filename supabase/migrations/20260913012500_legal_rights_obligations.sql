create table if not exists public.legal_rights_obligations(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('right','obligation','prohibition','permission','deadline','remedy')),
 title text not null check(char_length(title) between 1 and 220),
 jurisdiction text not null check(char_length(jurisdiction) between 1 and 120),
 authority text,
 source_url text,
 source_locator text,
 responsible_party text,
 counterparty text,
 trigger_event text,
 due_on date,
 status text not null default 'review' check(status in ('review','active','satisfied','disputed','expired','monitor')),
 evidence_status text not null default 'unverified' check(evidence_status in ('unverified','source_identified','source_checked','professional_reviewed')),
 notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

alter table public.legal_rights_obligations enable row level security;
revoke all on public.legal_rights_obligations from anon;
grant select,insert,update,delete on public.legal_rights_obligations to authenticated;

create policy "legal_rights_select_own" on public.legal_rights_obligations
 for select to authenticated using((select auth.uid())=user_id);
create policy "legal_rights_insert_own" on public.legal_rights_obligations
 for insert to authenticated with check((select auth.uid())=user_id);
create policy "legal_rights_update_own" on public.legal_rights_obligations
 for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy "legal_rights_delete_own" on public.legal_rights_obligations
 for delete to authenticated using((select auth.uid())=user_id);

create index if not exists legal_rights_user_status_due_idx
 on public.legal_rights_obligations(user_id,status,due_on,updated_at desc);