-- Cover remaining governed memory-document/chunk scope foreign keys.
-- Existing memory_chunks_doc_idx already covers document_id and
-- memory_documents_user_idx already covers user_id.
create index if not exists memory_chunks_agent_id_idx on public.memory_chunks(agent_id) where agent_id is not null;
create index if not exists memory_chunks_org_id_idx on public.memory_chunks(org_id) where org_id is not null;
create index if not exists memory_chunks_user_id_idx on public.memory_chunks(user_id);
create index if not exists memory_documents_agent_id_idx on public.memory_documents(agent_id) where agent_id is not null;
create index if not exists memory_documents_org_id_idx on public.memory_documents(org_id) where org_id is not null;
