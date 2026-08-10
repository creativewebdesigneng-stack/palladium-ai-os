create extension if not exists vector with schema extensions;

-- ============================================================ agent_memories
create table if not exists public.agent_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organisations(id) on delete cascade,
  agent_id uuid references public.personal_agents(id) on delete cascade,
  task_id uuid references public.agent_tasks(id) on delete set null,
  workflow_id uuid references public.workflows(id) on delete set null,
  document_id uuid references public.memory_documents(id) on delete cascade,
  memory_type text not null default 'long_term'
    check (memory_type in ('short_term','long_term','knowledge','organisation')),
  category text not null default 'conversation',
  scope text not null default 'private'
    check (scope in ('private','agent','user','shared','organisation')),
  title text,
  content text not null,
  source text,
  importance text not null default 'medium' check (importance in ('low','medium','high','critical')),
  pinned boolean not null default false,
  file_url text,
  metadata jsonb not null default '{}'::jsonb,
  embedding extensions.vector(1536),
  embedding_model text,
  vector_provider text not null default 'supabase'
    check (vector_provider in ('none','supabase','pinecone','weaviate')),
  vector_status text not null default 'pending'
    check (vector_status in ('disabled','pending','indexed','failed')),
  vector_external_id text,
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.agent_memories to authenticated;
grant all on public.agent_memories to service_role;

alter table public.agent_memories enable row level security;

create policy "Members read own and shared memories"
on public.agent_memories for select to authenticated
using (
  user_id = auth.uid()
  or (org_id is not null and scope in ('shared','organisation') and public.is_org_member(org_id))
);

create policy "Users insert own memories"
on public.agent_memories for insert to authenticated
with check (
  user_id = auth.uid()
  and (org_id is null or public.is_org_member(org_id))
);

create policy "Owners and org admins update memories"
on public.agent_memories for update to authenticated
using (user_id = auth.uid() or (org_id is not null and public.org_admin(org_id)))
with check (user_id = auth.uid() or (org_id is not null and public.org_admin(org_id)));

create policy "Owners and org admins delete memories"
on public.agent_memories for delete to authenticated
using (user_id = auth.uid() or (org_id is not null and public.org_admin(org_id)));

create trigger agent_memories_updated_at
before update on public.agent_memories
for each row execute function public.set_updated_at();

create index if not exists agent_memories_user_idx on public.agent_memories (user_id, created_at desc);
create index if not exists agent_memories_org_idx on public.agent_memories (org_id) where org_id is not null;
create index if not exists agent_memories_agent_idx on public.agent_memories (agent_id);
create index if not exists agent_memories_type_idx on public.agent_memories (memory_type);
create index if not exists agent_memories_embedding_idx
  on public.agent_memories using hnsw (embedding extensions.vector_cosine_ops);

-- ============================================================ memory_chunks
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

grant select, insert, update, delete on public.memory_chunks to authenticated;
grant all on public.memory_chunks to service_role;

alter table public.memory_chunks enable row level security;

create policy "Members read own and org document chunks"
on public.memory_chunks for select to authenticated
using (user_id = auth.uid() or (org_id is not null and public.is_org_member(org_id)));

create policy "Users insert own document chunks"
on public.memory_chunks for insert to authenticated
with check (user_id = auth.uid() and (org_id is null or public.is_org_member(org_id)));

create policy "Owners and org admins delete document chunks"
on public.memory_chunks for delete to authenticated
using (user_id = auth.uid() or (org_id is not null and public.org_admin(org_id)));

create index if not exists memory_chunks_doc_idx on public.memory_chunks (document_id, chunk_index);
create index if not exists memory_chunks_user_idx on public.memory_chunks (user_id);
create index if not exists memory_chunks_embedding_idx
  on public.memory_chunks using hnsw (embedding extensions.vector_cosine_ops);

-- ==================================================== semantic search helpers
-- SECURITY INVOKER: row-level security decides which rows the caller can see.
create or replace function public.search_agent_memories(
  _embedding extensions.vector(1536),
  _match_count integer default 8,
  _agent uuid default null,
  _types text[] default null,
  _min_similarity double precision default 0.15
)
returns table (
  id uuid,
  memory_type text,
  category text,
  scope text,
  title text,
  content text,
  source text,
  importance text,
  pinned boolean,
  agent_id uuid,
  similarity double precision
)
language sql
stable
set search_path = public, extensions
as $$
  select m.id, m.memory_type, m.category, m.scope, m.title, m.content, m.source,
         m.importance, m.pinned, m.agent_id,
         1 - (m.embedding operator(extensions.<=>) _embedding) as similarity
  from public.agent_memories m
  where m.embedding is not null
    and (m.expires_at is null or m.expires_at > now())
    and (_agent is null or m.agent_id is null or m.agent_id = _agent)
    and (_types is null or m.memory_type = any(_types))
    and 1 - (m.embedding operator(extensions.<=>) _embedding) >= _min_similarity
  order by m.embedding operator(extensions.<=>) _embedding
  limit greatest(least(coalesce(_match_count, 8), 50), 1)
$$;

create or replace function public.search_memory_chunks(
  _embedding extensions.vector(1536),
  _match_count integer default 6,
  _agent uuid default null,
  _min_similarity double precision default 0.15
)
returns table (
  id uuid,
  document_id uuid,
  chunk_index integer,
  content text,
  similarity double precision
)
language sql
stable
set search_path = public, extensions
as $$
  select c.id, c.document_id, c.chunk_index, c.content,
         1 - (c.embedding operator(extensions.<=>) _embedding) as similarity
  from public.memory_chunks c
  where c.embedding is not null
    and (_agent is null or c.agent_id is null or c.agent_id = _agent)
    and 1 - (c.embedding operator(extensions.<=>) _embedding) >= _min_similarity
  order by c.embedding operator(extensions.<=>) _embedding
  limit greatest(least(coalesce(_match_count, 6), 50), 1)
$$;

revoke all on function public.search_agent_memories(extensions.vector, integer, uuid, text[], double precision) from public, anon;
revoke all on function public.search_memory_chunks(extensions.vector, integer, uuid, double precision) from public, anon;
grant execute on function public.search_agent_memories(extensions.vector, integer, uuid, text[], double precision) to authenticated, service_role;
grant execute on function public.search_memory_chunks(extensions.vector, integer, uuid, double precision) to authenticated, service_role;