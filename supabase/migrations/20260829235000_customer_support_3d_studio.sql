-- Customer Support + 3D Studio native persistence.
-- Chatwoot concepts are folded into PalladiumAI CRM/integrations/workflows instead of importing a second support backend.
-- Modly jobs reference a real configured worker; model assets remain external/private and are never simulated.

create table if not exists public.support_inboxes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  channel text not null check (channel in ('web','email','whatsapp','facebook','instagram','telegram','line','sms','api','other')),
  integration_provider text,
  integration_connection_id text,
  business_hours jsonb not null default '{}'::jsonb,
  auto_assignment boolean not null default false,
  status text not null default 'active' check (status in ('active','paused','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  inbox_id uuid references public.support_inboxes(id) on delete set null,
  contact_id uuid references public.crm_contacts(id) on delete set null,
  external_thread_id text,
  subject text,
  status text not null default 'open' check (status in ('open','pending','resolved','snoozed')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  assigned_agent_id uuid,
  assigned_team text,
  labels text[] not null default '{}',
  unread_count integer not null default 0 check (unread_count >= 0),
  last_message_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  conversation_id uuid not null references public.support_conversations(id) on delete cascade,
  direction text not null check (direction in ('inbound','outbound','internal')),
  author_type text not null default 'human' check (author_type in ('contact','human','agent','system')),
  content text not null,
  content_type text not null default 'text' check (content_type in ('text','html','image','video','audio','document','system')),
  external_message_id text,
  private_note boolean not null default false,
  status text not null default 'created' check (status in ('created','queued','sent','delivered','read','failed','received')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.support_help_articles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  title text not null,
  slug text not null,
  summary text,
  body_markdown text not null default '',
  locale text not null default 'en',
  status text not null default 'draft' check (status in ('draft','published','archived')),
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, slug, locale)
);

create table if not exists public.support_canned_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  shortcut text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, shortcut)
);

create table if not exists public.three_d_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  input_name text not null,
  source_url text not null,
  workflow text not null default 'image-to-mesh',
  requested_format text not null default 'glb' check (requested_format in ('glb','gltf','obj','ply','stl','vox')),
  status text not null default 'queued' check (status in ('queued','running','completed','failed','cancelled')),
  worker_job_id text,
  output_url text,
  preview_url text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists support_inboxes_user_idx on public.support_inboxes(user_id, status);
create index if not exists support_conversations_user_last_idx on public.support_conversations(user_id, last_message_at desc nulls last);
create index if not exists support_messages_conversation_idx on public.support_messages(conversation_id, created_at);
create index if not exists support_help_articles_user_status_idx on public.support_help_articles(user_id, status, updated_at desc);
create index if not exists three_d_jobs_user_created_idx on public.three_d_jobs(user_id, created_at desc);

alter table public.support_inboxes enable row level security;
alter table public.support_conversations enable row level security;
alter table public.support_messages enable row level security;
alter table public.support_help_articles enable row level security;
alter table public.support_canned_responses enable row level security;
alter table public.three_d_jobs enable row level security;

do $$
begin
  execute 'drop policy if exists "support_inboxes_owner_all" on public.support_inboxes';
  execute 'create policy "support_inboxes_owner_all" on public.support_inboxes for all using (auth.uid() = user_id) with check (auth.uid() = user_id)';
  execute 'drop policy if exists "support_conversations_owner_all" on public.support_conversations';
  execute 'create policy "support_conversations_owner_all" on public.support_conversations for all using (auth.uid() = user_id) with check (auth.uid() = user_id)';
  execute 'drop policy if exists "support_messages_owner_all" on public.support_messages';
  execute 'create policy "support_messages_owner_all" on public.support_messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id)';
  execute 'drop policy if exists "support_help_articles_owner_all" on public.support_help_articles';
  execute 'create policy "support_help_articles_owner_all" on public.support_help_articles for all using (auth.uid() = user_id) with check (auth.uid() = user_id)';
  execute 'drop policy if exists "support_canned_responses_owner_all" on public.support_canned_responses';
  execute 'create policy "support_canned_responses_owner_all" on public.support_canned_responses for all using (auth.uid() = user_id) with check (auth.uid() = user_id)';
  execute 'drop policy if exists "three_d_jobs_owner_all" on public.three_d_jobs';
  execute 'create policy "three_d_jobs_owner_all" on public.three_d_jobs for all using (auth.uid() = user_id) with check (auth.uid() = user_id)';
end $$;

insert into public.tools (slug, name, description, category, is_active, min_plan, requires_approval)
values (
  'three_d_studio',
  '3D Studio',
  'Submit and inspect bounded image-to-3D mesh jobs through the configured Modly-compatible worker.',
  'creative',
  true,
  'builder',
  false
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  is_active = true;
