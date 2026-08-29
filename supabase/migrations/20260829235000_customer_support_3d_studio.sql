-- Chatwoot/Modly integration batch.
-- IMPORTANT: PalladiumAI's existing support_tickets + support_messages remain canonical.
-- This migration extends those tables and adds only missing channel/help-centre/canned-response metadata.
-- Modly jobs reference a real configured worker; model assets remain external/private and are never simulated.

create table if not exists public.support_inboxes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  channel text not null check (channel in ('web','email','chat','phone','whatsapp','facebook','instagram','telegram','line','sms','api','other')),
  integration_provider text,
  integration_connection_id text,
  business_hours jsonb not null default '{}'::jsonb,
  auto_assignment boolean not null default false,
  status text not null default 'active' check (status in ('active','paused','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_tickets
  add column if not exists inbox_id uuid references public.support_inboxes(id) on delete set null,
  add column if not exists crm_contact_id uuid references public.crm_contacts(id) on delete set null,
  add column if not exists external_thread_id text,
  add column if not exists assigned_team text,
  add column if not exists labels text[] not null default '{}',
  add column if not exists unread_count integer not null default 0,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.support_messages
  add column if not exists private_note boolean not null default false,
  add column if not exists external_message_id text,
  add column if not exists delivery_status text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

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
create index if not exists support_tickets_inbox_idx on public.support_tickets(inbox_id, created_at desc);
create index if not exists support_tickets_crm_contact_idx on public.support_tickets(crm_contact_id, created_at desc);
create index if not exists support_help_articles_user_status_idx on public.support_help_articles(user_id, status, updated_at desc);
create index if not exists three_d_jobs_user_created_idx on public.three_d_jobs(user_id, created_at desc);

alter table public.support_inboxes enable row level security;
alter table public.support_help_articles enable row level security;
alter table public.support_canned_responses enable row level security;
alter table public.three_d_jobs enable row level security;

drop policy if exists "support_inboxes_owner_all" on public.support_inboxes;
create policy "support_inboxes_owner_all" on public.support_inboxes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "support_help_articles_owner_all" on public.support_help_articles;
create policy "support_help_articles_owner_all" on public.support_help_articles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "support_canned_responses_owner_all" on public.support_canned_responses;
create policy "support_canned_responses_owner_all" on public.support_canned_responses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "three_d_jobs_owner_all" on public.three_d_jobs;
create policy "three_d_jobs_owner_all" on public.three_d_jobs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

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
