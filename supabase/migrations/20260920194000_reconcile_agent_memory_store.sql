-- Production reconciliation of Blackstar's existing agent memory runtime.
-- Keep the canonical four-layer model, caller-scoped reads and opt-in sharing.
-- No user memories are created, copied or made public by this migration.
create extension if not exists vector with schema extensions;

create table if not exists public.personal_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null default 'general',
  key text not null,
  value text,
  metadata jsonb not null default '{}'::jsonb,
  scope text not null default 'personal',
  org_id uuid references public.organisations(id) on delete set null,
  agent_id uuid references public.personal_agents(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists personal_memories_user_idx on public.personal_memories(user_id);
alter table public.personal_memories enable row level security;
revoke all on public.personal_memories from public,anon,authenticated;
grant select,insert,update,delete on public.personal_memories to authenticated;
grant all on public.personal_memories to service_role;
drop policy if exists personal_memories_owner_only on public.personal_memories;
create policy personal_memories_owner_only on public.personal_memories for all to authenticated
 using(user_id=(select auth.uid()))
 with check(user_id=(select auth.uid())
   and (agent_id is null or exists(select 1 from public.personal_agents a where a.id=agent_id and a.user_id=(select auth.uid())))
   and (org_id is null or private.is_org_member(org_id)));
drop trigger if exists personal_memories_updated_at on public.personal_memories;
create trigger personal_memories_updated_at before update on public.personal_memories
 for each row execute function public.set_updated_at();

create table if not exists public.memory_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  auto_capture boolean not null default true,
  capture_sensitive boolean not null default false,
  short_term_enabled boolean not null default true,
  long_term_enabled boolean not null default true,
  document_memory_enabled boolean not null default true,
  organisation_sharing_enabled boolean not null default false,
  short_term_ttl_minutes integer not null default 720
    check(short_term_ttl_minutes between 15 and 43200),
  retention_days integer check(retention_days is null or retention_days between 1 and 3650),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.memory_preferences enable row level security;
revoke all on public.memory_preferences from public,anon,authenticated;
grant select,insert,update,delete on public.memory_preferences to authenticated;
grant all on public.memory_preferences to service_role;
drop policy if exists memory_preferences_owner_only on public.memory_preferences;
create policy memory_preferences_owner_only on public.memory_preferences for all to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop trigger if exists memory_preferences_updated_at on public.memory_preferences;
create trigger memory_preferences_updated_at before update on public.memory_preferences
 for each row execute function public.set_updated_at();

create table if not exists public.memory_documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_id uuid references public.personal_agents(id) on delete set null,
  title text not null,
  storage_path text,
  mime_type text,
  size_bytes bigint,
  status text not null default 'uploaded',
  chunk_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists memory_documents_user_idx on public.memory_documents(user_id,created_at desc);
alter table public.memory_documents enable row level security;
revoke all on public.memory_documents from public,anon,authenticated;
grant select,insert,update,delete on public.memory_documents to authenticated;
grant all on public.memory_documents to service_role;
drop policy if exists memory_documents_owner_only on public.memory_documents;
create policy memory_documents_owner_only on public.memory_documents for all to authenticated
 using(user_id=(select auth.uid()))
 with check(user_id=(select auth.uid())
  and (org_id is null or private.is_org_member(org_id))
  and (agent_id is null or exists(select 1 from public.personal_agents a where a.id=agent_id and a.user_id=(select auth.uid()))));
drop trigger if exists memory_documents_updated_at on public.memory_documents;
create trigger memory_documents_updated_at before update on public.memory_documents
 for each row execute function public.set_updated_at();

create table if not exists public.agent_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organisations(id) on delete cascade,
  agent_id uuid references public.personal_agents(id) on delete cascade,
  task_id uuid references public.agent_tasks(id) on delete set null,
  workflow_id uuid references public.workflows(id) on delete set null,
  document_id uuid references public.memory_documents(id) on delete cascade,
  memory_type text not null default 'long_term'
    check(memory_type in ('short_term','long_term','knowledge','organisation')),
  category text not null default 'conversation',
  scope text not null default 'private'
    check(scope in ('private','agent','user','shared','organisation')),
  title text,
  content text not null,
  source text,
  importance text not null default 'medium'
    check(importance in ('low','medium','high','critical')),
  pinned boolean not null default false,
  file_url text,
  metadata jsonb not null default '{}'::jsonb,
  embedding extensions.vector(1536),
  embedding_model text,
  vector_provider text not null default 'supabase'
    check(vector_provider in ('none','supabase','pinecone','weaviate')),
  vector_status text not null default 'pending'
    check(vector_status in ('disabled','pending','indexed','failed')),
  vector_external_id text,
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists agent_memories_user_idx on public.agent_memories(user_id,created_at desc);
create index if not exists agent_memories_agent_idx on public.agent_memories(agent_id);
create index if not exists agent_memories_expires_idx on public.agent_memories(expires_at) where expires_at is not null;
create index if not exists agent_memories_embedding_idx on public.agent_memories
 using hnsw(embedding extensions.vector_cosine_ops);
alter table public.agent_memories enable row level security;
revoke all on public.agent_memories from public,anon,authenticated;
grant select,insert,update,delete on public.agent_memories to authenticated;
grant all on public.agent_memories to service_role;
drop policy if exists agent_memories_owner_or_explicit_org_share on public.agent_memories;
create policy agent_memories_owner_or_explicit_org_share on public.agent_memories
 for select to authenticated using(
   user_id=(select auth.uid()) or
   (org_id is not null and scope in ('shared','organisation') and private.is_org_member(org_id))
 );
drop policy if exists agent_memories_owner_insert on public.agent_memories;
create policy agent_memories_owner_insert on public.agent_memories
 for insert to authenticated with check(
   user_id=(select auth.uid())
   and (org_id is null or private.is_org_member(org_id))
   and (agent_id is null or exists(select 1 from public.personal_agents a where a.id=agent_id and a.user_id=(select auth.uid())))
   and (task_id is null or exists(select 1 from public.agent_tasks t where t.id=task_id and t.user_id=(select auth.uid())))
   and (document_id is null or exists(select 1 from public.memory_documents d where d.id=document_id and d.user_id=(select auth.uid())))
 );
drop policy if exists agent_memories_owner_update on public.agent_memories;
create policy agent_memories_owner_update on public.agent_memories
 for update to authenticated using(user_id=(select auth.uid()))
 with check(
   user_id=(select auth.uid())
   and (org_id is null or private.is_org_member(org_id))
   and (agent_id is null or exists(select 1 from public.personal_agents a where a.id=agent_id and a.user_id=(select auth.uid())))
 );
drop policy if exists agent_memories_owner_delete on public.agent_memories;
create policy agent_memories_owner_delete on public.agent_memories
 for delete to authenticated using(user_id=(select auth.uid()));
drop trigger if exists agent_memories_updated_at on public.agent_memories;
create trigger agent_memories_updated_at before update on public.agent_memories
 for each row execute function public.set_updated_at();

create table if not exists public.memory_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.memory_documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organisations(id) on delete cascade,
  agent_id uuid references public.personal_agents(id) on delete cascade,
  chunk_index integer not null default 0,
  content text not null,
  token_estimate integer,
  metadata jsonb not null default '{}'::jsonb,
  embedding extensions.vector(1536),
  embedding_model text,
  vector_provider text not null default 'supabase',
  vector_external_id text,
  created_at timestamptz not null default now()
);
create index if not exists memory_chunks_doc_idx on public.memory_chunks(document_id,chunk_index);
create index if not exists memory_chunks_embedding_idx on public.memory_chunks
 using hnsw(embedding extensions.vector_cosine_ops);
alter table public.memory_chunks enable row level security;
revoke all on public.memory_chunks from public,anon,authenticated;
grant select,insert,update,delete on public.memory_chunks to authenticated;
grant all on public.memory_chunks to service_role;
drop policy if exists memory_chunks_owner_select on public.memory_chunks;
create policy memory_chunks_owner_select on public.memory_chunks for select to authenticated
 using(user_id=(select auth.uid()));
drop policy if exists memory_chunks_owner_insert on public.memory_chunks;
create policy memory_chunks_owner_insert on public.memory_chunks for insert to authenticated
 with check(user_id=(select auth.uid()) and
  exists(select 1 from public.memory_documents d where d.id=document_id and d.user_id=(select auth.uid())));
drop policy if exists memory_chunks_owner_update on public.memory_chunks;
create policy memory_chunks_owner_update on public.memory_chunks for update to authenticated
 using(user_id=(select auth.uid()))
 with check(user_id=(select auth.uid()) and
  exists(select 1 from public.memory_documents d where d.id=document_id and d.user_id=(select auth.uid())));
drop policy if exists memory_chunks_owner_delete on public.memory_chunks;
create policy memory_chunks_owner_delete on public.memory_chunks for delete to authenticated
 using(user_id=(select auth.uid()));

create or replace function public.search_agent_memories(
 _embedding extensions.vector(1536),_match_count integer default 8,
 _agent uuid default null,_types text[] default null,_min_similarity double precision default 0.15
)
returns table(id uuid,memory_type text,category text,scope text,title text,
 content text,source text,importance text,pinned boolean,agent_id uuid,similarity double precision)
language sql stable security invoker set search_path=public,extensions
as $$
 select m.id,m.memory_type,m.category,m.scope,m.title,m.content,m.source,
        m.importance,m.pinned,m.agent_id,
        1-(m.embedding operator(extensions.<=>) _embedding) as similarity
 from public.agent_memories m
 where m.embedding is not null
  and (m.expires_at is null or m.expires_at>now())
  and (_agent is null or m.agent_id is null or m.agent_id=_agent)
  and (_types is null or m.memory_type=any(_types))
  and 1-(m.embedding operator(extensions.<=>) _embedding)>=_min_similarity
 order by m.embedding operator(extensions.<=>) _embedding
 limit greatest(least(coalesce(_match_count,8),50),1)
$$;

create or replace function public.search_memory_chunks(
 _embedding extensions.vector(1536),_match_count integer default 6,
 _agent uuid default null,_min_similarity double precision default 0.15
)
returns table(id uuid,document_id uuid,chunk_index integer,content text,similarity double precision)
language sql stable security invoker set search_path=public,extensions
as $$
 select c.id,c.document_id,c.chunk_index,c.content,
        1-(c.embedding operator(extensions.<=>) _embedding) as similarity
 from public.memory_chunks c
 where c.embedding is not null
  and (_agent is null or c.agent_id is null or c.agent_id=_agent)
  and 1-(c.embedding operator(extensions.<=>) _embedding)>=_min_similarity
 order by c.embedding operator(extensions.<=>) _embedding
 limit greatest(least(coalesce(_match_count,6),50),1)
$$;
revoke all on function public.search_agent_memories(extensions.vector,integer,uuid,text[],double precision)
 from public,anon,authenticated;
revoke all on function public.search_memory_chunks(extensions.vector,integer,uuid,double precision)
 from public,anon,authenticated;
grant execute on function public.search_agent_memories(extensions.vector,integer,uuid,text[],double precision)
 to authenticated,service_role;
grant execute on function public.search_memory_chunks(extensions.vector,integer,uuid,double precision)
 to authenticated,service_role;
notify pgrst,'reload schema';
