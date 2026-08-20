create table if not exists public.user_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  doc_type text not null default 'document',
  format text not null default 'md',
  body text not null default '',
  source text not null default 'manual'
    check (source in ('manual','ai_generated','ai_summarise','ai_rewrite','ai_translate','ai_analyse')),
  origin_document_id uuid references public.user_documents(id) on delete set null,
  provider text,
  model text,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_documents_user_updated_idx
  on public.user_documents(user_id, updated_at desc);

grant select, insert, update, delete on public.user_documents to authenticated;
grant all on public.user_documents to service_role;

alter table public.user_documents enable row level security;

drop policy if exists "user_documents_select_own" on public.user_documents;
create policy "user_documents_select_own" on public.user_documents
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "user_documents_insert_own" on public.user_documents;
create policy "user_documents_insert_own" on public.user_documents
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "user_documents_update_own" on public.user_documents;
create policy "user_documents_update_own" on public.user_documents
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_documents_delete_own" on public.user_documents;
create policy "user_documents_delete_own" on public.user_documents
  for delete to authenticated using (auth.uid() = user_id);

drop trigger if exists user_documents_updated_at on public.user_documents;
create trigger user_documents_updated_at
  before update on public.user_documents
  for each row execute function public.set_updated_at();