-- Blackstar Personal Assistant v2: durable owner-scoped conversations and explicit context controls.

alter table public.personal_assistant_preferences
  add column if not exists conversation_history_enabled boolean not null default true,
  add column if not exists memory_context_enabled boolean not null default true,
  add column if not exists workspace_context_enabled boolean not null default true,
  add column if not exists live_web_enabled boolean not null default true,
  add column if not exists response_style text not null default 'balanced';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'personal_assistant_response_style_check'
      and conrelid = 'public.personal_assistant_preferences'::regclass
  ) then
    alter table public.personal_assistant_preferences
      add constraint personal_assistant_response_style_check
      check (response_style in ('concise','balanced','detailed'));
  end if;
end $$;

create table if not exists public.assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation',
  archived_at timestamptz null,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assistant_conversations_title_check
    check (char_length(trim(title)) between 1 and 160),
  constraint assistant_conversations_id_user_unique unique (id, user_id)
);

create table if not exists public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null check (char_length(content) between 1 and 20000),
  provider text null check (provider is null or char_length(provider) <= 80),
  model text null check (model is null or char_length(model) <= 240),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  constraint assistant_messages_conversation_owner_fk
    foreign key (conversation_id, user_id)
    references public.assistant_conversations(id, user_id)
    on delete cascade
);

create index if not exists assistant_conversations_user_recent_idx
  on public.assistant_conversations(user_id, archived_at, last_message_at desc);

create index if not exists assistant_messages_conversation_recent_idx
  on public.assistant_messages(conversation_id, created_at desc);

alter table public.assistant_conversations enable row level security;
alter table public.assistant_messages enable row level security;

revoke all on table public.assistant_conversations from anon;
revoke all on table public.assistant_messages from anon;
grant select, insert, update, delete on table public.assistant_conversations to authenticated;
grant select, insert, update, delete on table public.assistant_messages to authenticated;

drop policy if exists assistant_conversations_owner_all on public.assistant_conversations;
create policy assistant_conversations_owner_all
on public.assistant_conversations
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists assistant_messages_owner_all on public.assistant_messages;
create policy assistant_messages_owner_all
on public.assistant_messages
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

comment on table public.assistant_conversations is
  'Owner-scoped durable Blackstar personal-assistant conversation threads. Conversation history is separate from long-term memory capture.';
comment on table public.assistant_messages is
  'Owner-scoped user/assistant turns for durable assistant conversations. Long-term memory remains governed by the separate memory privacy system.';
