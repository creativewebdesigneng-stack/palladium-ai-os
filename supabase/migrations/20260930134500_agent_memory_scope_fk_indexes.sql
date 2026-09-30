-- Cover the governed memory scope foreign keys used by owner/scope validation and recall.
create index if not exists agent_memories_task_id_idx on public.agent_memories(task_id) where task_id is not null;
create index if not exists agent_memories_document_id_idx on public.agent_memories(document_id) where document_id is not null;
create index if not exists agent_memories_org_id_idx on public.agent_memories(org_id) where org_id is not null;
create index if not exists agent_memories_workflow_id_idx on public.agent_memories(workflow_id) where workflow_id is not null;
