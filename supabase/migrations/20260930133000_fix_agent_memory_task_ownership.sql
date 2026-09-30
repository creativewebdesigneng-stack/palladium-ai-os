-- Correct agent memory task ownership validation.
-- agent_memories.task_id references agent_tasks.id; the prior policy compared
-- agent_tasks.id to agent_tasks.task_id and therefore did not validate the
-- memory row's referenced task.

drop policy if exists agent_memories_owner_insert on public.agent_memories;
create policy agent_memories_owner_insert
on public.agent_memories
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and (org_id is null or private.is_org_member(org_id))
  and (
    agent_id is null
    or exists (
      select 1 from public.personal_agents a
      where a.id = agent_memories.agent_id
        and a.user_id = (select auth.uid())
    )
  )
  and (
    task_id is null
    or exists (
      select 1 from public.agent_tasks t
      where t.id = agent_memories.task_id
        and t.user_id = (select auth.uid())
    )
  )
  and (
    document_id is null
    or exists (
      select 1 from public.memory_documents d
      where d.id = agent_memories.document_id
        and d.user_id = (select auth.uid())
    )
  )
  and (
    workflow_id is null
    or exists (
      select 1 from public.workflows w
      where w.id = agent_memories.workflow_id
        and w.user_id = (select auth.uid())
    )
  )
);

drop policy if exists agent_memories_owner_update on public.agent_memories;
create policy agent_memories_owner_update
on public.agent_memories
for update
to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and (org_id is null or private.is_org_member(org_id))
  and (
    agent_id is null
    or exists (
      select 1 from public.personal_agents a
      where a.id = agent_memories.agent_id
        and a.user_id = (select auth.uid())
    )
  )
  and (
    task_id is null
    or exists (
      select 1 from public.agent_tasks t
      where t.id = agent_memories.task_id
        and t.user_id = (select auth.uid())
    )
  )
  and (
    document_id is null
    or exists (
      select 1 from public.memory_documents d
      where d.id = agent_memories.document_id
        and d.user_id = (select auth.uid())
    )
  )
  and (
    workflow_id is null
    or exists (
      select 1 from public.workflows w
      where w.id = agent_memories.workflow_id
        and w.user_id = (select auth.uid())
    )
  )
);
