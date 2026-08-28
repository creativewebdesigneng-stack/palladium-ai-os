-- Native HTML Studio + Zen Notes working layer.
-- Reuses PalladiumAI Knowledge/Memory for indexing and Agent Runtime for generation.

create table if not exists public.zen_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  org_id uuid null,
  title text not null default 'Untitled note',
  body text not null default '',
  note_kind text not null default 'note' check (note_kind in ('note','daily','weekly')),
  lifecycle text not null default 'active' check (lifecycle in ('active','archived','trash')),
  tags text[] not null default '{}',
  pinned boolean not null default false,
  knowledge_document_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists zen_notes_user_updated_idx on public.zen_notes(user_id, updated_at desc);
create index if not exists zen_notes_user_lifecycle_idx on public.zen_notes(user_id, lifecycle);

alter table public.zen_notes enable row level security;

drop policy if exists "zen_notes_owner_select" on public.zen_notes;
create policy "zen_notes_owner_select" on public.zen_notes for select using (auth.uid() = user_id);
drop policy if exists "zen_notes_owner_insert" on public.zen_notes;
create policy "zen_notes_owner_insert" on public.zen_notes for insert with check (auth.uid() = user_id);
drop policy if exists "zen_notes_owner_update" on public.zen_notes;
create policy "zen_notes_owner_update" on public.zen_notes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "zen_notes_owner_delete" on public.zen_notes;
create policy "zen_notes_owner_delete" on public.zen_notes for delete using (auth.uid() = user_id);

create table if not exists public.html_studio_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  org_id uuid null,
  title text not null default 'Untitled HTML',
  source_kind text not null default 'text' check (source_kind in ('text','markdown','csv','json','sql','note','file')),
  source_text text not null default '',
  html text not null default '',
  surface text not null default 'document' check (surface in ('document','report','poster','deck','social','prototype','resume','frame')),
  status text not null default 'draft' check (status in ('draft','ready','archived')),
  source_note_id uuid null references public.zen_notes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists html_studio_user_updated_idx on public.html_studio_documents(user_id, updated_at desc);

alter table public.html_studio_documents enable row level security;

drop policy if exists "html_studio_owner_select" on public.html_studio_documents;
create policy "html_studio_owner_select" on public.html_studio_documents for select using (auth.uid() = user_id);
drop policy if exists "html_studio_owner_insert" on public.html_studio_documents;
create policy "html_studio_owner_insert" on public.html_studio_documents for insert with check (auth.uid() = user_id);
drop policy if exists "html_studio_owner_update" on public.html_studio_documents;
create policy "html_studio_owner_update" on public.html_studio_documents for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "html_studio_owner_delete" on public.html_studio_documents;
create policy "html_studio_owner_delete" on public.html_studio_documents for delete using (auth.uid() = user_id);
