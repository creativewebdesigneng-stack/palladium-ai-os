-- Enterprise Knowledge pilot — EXPLICIT organisation sharing, not default sharing.
-- DRAFT ONLY. Do not apply to Production before isolated membership/RLS acceptance.
-- Verified current model: memory_documents and memory_chunks owner-only;
-- private.is_org_member(uuid) reads live organisation_members.
-- All pre-existing owner write policies stay unchanged. These are SELECT-only.

create policy memory_documents_enterprise_explicit_org_read
on public.memory_documents for select to authenticated
using (
  org_id is not null
  and agent_id is null
  and status = 'ready'
  and metadata @> '{"enterprise_shared":true}'::jsonb
  and private.is_org_member(org_id)
);

create policy memory_chunks_enterprise_explicit_org_read
on public.memory_chunks for select to authenticated
using (
  org_id is not null
  and agent_id is null
  and private.is_org_member(org_id)
  and exists (
    select 1
    from public.memory_documents d
    where d.id = memory_chunks.document_id
      and d.org_id = memory_chunks.org_id
      and d.user_id = memory_chunks.user_id
      and d.agent_id is null
      and d.status = 'ready'
      and d.metadata @> '{"enterprise_shared":true}'::jsonb
  )
);

comment on policy memory_documents_enterprise_explicit_org_read
on public.memory_documents is 'Read for current members only when owner explicitly opted this ready, non-agent document into organisation sharing. Existing owner write policy unchanged.';

comment on policy memory_chunks_enterprise_explicit_org_read
on public.memory_chunks is 'Read for current members only when parent owner explicitly shared the matching, ready organisation document; forbids orphan, cross-owner, cross-org and agent chunks. Existing owner write policy unchanged.';
