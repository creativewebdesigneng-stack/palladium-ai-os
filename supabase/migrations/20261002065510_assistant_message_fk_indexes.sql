-- Cover both assistant_messages foreign-key access paths.
-- The composite owner FK needs (conversation_id,user_id) as a leading prefix,
-- while the direct auth.users FK needs a user_id-leading index.

drop index if exists public.assistant_messages_conversation_recent_idx;

create index if not exists assistant_messages_conversation_owner_recent_idx
  on public.assistant_messages(conversation_id, user_id, created_at desc);

create index if not exists assistant_messages_user_created_idx
  on public.assistant_messages(user_id, created_at desc);
