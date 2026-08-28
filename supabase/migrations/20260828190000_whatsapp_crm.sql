-- Native WhatsApp CRM persistence derived from MIT-licensed wacrm concepts.
-- Reuses PalladiumAI crm_contacts as the canonical contact/pipeline record.

create table if not exists public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  contact_id uuid not null references public.crm_contacts(id) on delete cascade,
  provider text not null default 'whatsapp',
  external_thread_id text,
  status text not null default 'open' check (status in ('open','pending','closed')),
  assigned_agent_id uuid,
  unread_count integer not null default 0 check (unread_count >= 0),
  last_message_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, contact_id, provider)
);

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  direction text not null check (direction in ('inbound','outbound')),
  content_type text not null default 'text' check (content_type in ('text','template','image','video','document','audio','interactive','system')),
  text_content text,
  external_message_id text,
  reply_to_message_id uuid references public.whatsapp_messages(id) on delete set null,
  media jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','sent','delivered','read','failed','received')),
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_broadcasts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  template_name text,
  template_language text,
  body_preview text,
  status text not null default 'draft' check (status in ('draft','scheduled','approval_required','sending','sent','paused','failed','cancelled')),
  scheduled_for timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_broadcast_recipients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  broadcast_id uuid not null references public.whatsapp_broadcasts(id) on delete cascade,
  contact_id uuid not null references public.crm_contacts(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approval_required','sent','delivered','read','failed','skipped')),
  external_message_id text,
  last_error text,
  params jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(broadcast_id, contact_id)
);

create index if not exists whatsapp_conversations_user_last_idx on public.whatsapp_conversations(user_id, last_message_at desc nulls last);
create index if not exists whatsapp_messages_conversation_created_idx on public.whatsapp_messages(conversation_id, created_at desc);
create index if not exists whatsapp_broadcasts_user_created_idx on public.whatsapp_broadcasts(user_id, created_at desc);
create index if not exists whatsapp_broadcast_recipients_broadcast_idx on public.whatsapp_broadcast_recipients(broadcast_id, status);

alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_messages enable row level security;
alter table public.whatsapp_broadcasts enable row level security;
alter table public.whatsapp_broadcast_recipients enable row level security;

drop policy if exists "whatsapp_conversations_owner_all" on public.whatsapp_conversations;
create policy "whatsapp_conversations_owner_all" on public.whatsapp_conversations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "whatsapp_messages_owner_all" on public.whatsapp_messages;
create policy "whatsapp_messages_owner_all" on public.whatsapp_messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "whatsapp_broadcasts_owner_all" on public.whatsapp_broadcasts;
create policy "whatsapp_broadcasts_owner_all" on public.whatsapp_broadcasts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "whatsapp_broadcast_recipients_owner_all" on public.whatsapp_broadcast_recipients;
create policy "whatsapp_broadcast_recipients_owner_all" on public.whatsapp_broadcast_recipients for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
