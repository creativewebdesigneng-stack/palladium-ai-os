-- Restore Blackstar's missing private memory foundation without replacing the
-- canonical Memory Fabric runtime. Organisation-shared/document/vector paths
-- stay independently gated until their original access rules are reconciled.

create table if not exists public.personal_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid,
  agent_id uuid references public.personal_agents(id) on delete set null,
  category text not null default 'general',
  key text not null,
  value text,
  scope text not null default 'personal',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists personal_memories_user_idx on public.personal_memories(user_id,created_at desc);

create table if not exists public.memory_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  auto_capture boolean not null default true,
  capture_sensitive boolean not null default false,
  short_term_enabled boolean not null default true,
  long_term_enabled boolean not null default true,
  document_memory_enabled boolean not null default true,
  organisation_sharing_enabled boolean not null default false,
  short_term_ttl_minutes integer not null default 720,
  retention_days integer,
  updated_at timestamptz not null default now(),
  constraint memory_preferences_short_ttl check (short_term_ttl_minutes between 15 and 43200),
  constraint memory_preferences_retention check (retention_days is null or retention_days between 1 and 3650)
);

create table if not exists public.agent_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid,
  agent_id uuid references public.personal_agents(id) on delete set null,
  task_id uuid references public.agent_tasks(id) on delete set null,
  workflow_id uuid,
  document_id uuid,
  memory_type text not null default 'long_term',
  category text not null default 'conversation',
  scope text not null default 'private',
  title text,
  content text not null,
  source text,
  importance text not null default 'medium',
  pinned boolean not null default false,
  file_url text,
  metadata jsonb not null default '{}'::jsonb,
  vector_provider text,
  vector_status text not null default 'pending',
  embedding_model text,
  vector_external_id text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_memories_type check (memory_type in ('short_term','long_term','knowledge','organisation')),
  constraint agent_memories_scope check (scope in ('private','agent','user','shared','organisation')),
  constraint agent_memories_content_length check (char_length(content) between 1 and 20000)
);
create index if not exists agent_memories_user_recent_idx on public.agent_memories(user_id,updated_at desc);
create index if not exists agent_memories_agent_recent_idx on public.agent_memories(agent_id,updated_at desc);
create index if not exists agent_memories_user_expiry_idx on public.agent_memories(user_id,expires_at) where expires_at is not null;

alter table public.personal_memories enable row level security;
alter table public.memory_preferences enable row level security;
alter table public.agent_memories enable row level security;

revoke all on public.personal_memories,public.memory_preferences,public.agent_memories from public,anon,authenticated;
grant all on public.personal_memories,public.memory_preferences,public.agent_memories to service_role;
grant select,insert,update,delete on public.personal_memories,public.memory_preferences,public.agent_memories to authenticated;

drop policy if exists personal_memories_owner_select on public.personal_memories;
drop policy if exists personal_memories_owner_insert on public.personal_memories;
drop policy if exists personal_memories_owner_update on public.personal_memories;
drop policy if exists personal_memories_owner_delete on public.personal_memories;
create policy personal_memories_owner_select on public.personal_memories for select to authenticated using (user_id=(select auth.uid()));
create policy personal_memories_owner_insert on public.personal_memories for insert to authenticated with check (user_id=(select auth.uid()) and (agent_id is null or exists(select 1 from public.personal_agents a where a.id=agent_id and a.user_id=(select auth.uid()))));
create policy personal_memories_owner_update on public.personal_memories for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()) and (agent_id is null or exists(select 1 from public.personal_agents a where a.id=agent_id and a.user_id=(select auth.uid()))));
create policy personal_memories_owner_delete on public.personal_memories for delete to authenticated using (user_id=(select auth.uid()));

drop policy if exists memory_preferences_owner_select on public.memory_preferences;
drop policy if exists memory_preferences_owner_insert on public.memory_preferences;
drop policy if exists memory_preferences_owner_update on public.memory_preferences;
drop policy if exists memory_preferences_owner_delete on public.memory_preferences;
create policy memory_preferences_owner_select on public.memory_preferences for select to authenticated using (user_id=(select auth.uid()));
create policy memory_preferences_owner_insert on public.memory_preferences for insert to authenticated with check (user_id=(select auth.uid()));
create policy memory_preferences_owner_update on public.memory_preferences for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy memory_preferences_owner_delete on public.memory_preferences for delete to authenticated using (user_id=(select auth.uid()));

drop policy if exists agent_memories_owner_select on public.agent_memories;
drop policy if exists agent_memories_owner_insert on public.agent_memories;
drop policy if exists agent_memories_owner_update on public.agent_memories;
drop policy if exists agent_memories_owner_delete on public.agent_memories;
create policy agent_memories_owner_select on public.agent_memories for select to authenticated using (user_id=(select auth.uid()));
create policy agent_memories_owner_insert on public.agent_memories for insert to authenticated with check (user_id=(select auth.uid()) and (agent_id is null or exists(select 1 from public.personal_agents a where a.id=agent_id and a.user_id=(select auth.uid()))));
create policy agent_memories_owner_update on public.agent_memories for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()) and (agent_id is null or exists(select 1 from public.personal_agents a where a.id=agent_id and a.user_id=(select auth.uid()))));
create policy agent_memories_owner_delete on public.agent_memories for delete to authenticated using (user_id=(select auth.uid()));

-- No RLS policy in this migration makes organisation memory visible to a
-- different user; enabling approved collaboration requires a separate audit.
notify pgrst,'reload schema';
