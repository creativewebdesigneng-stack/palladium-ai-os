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
  and exists (select 1 from public.organisation_members author
    where author.org_id = memory_documents.org_id
      and author.user_id = memory_documents.user_id)
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
      and exists (select 1 from public.organisation_members author
        where author.org_id = d.org_id and author.user_id = d.user_id)
  )
);

comment on policy memory_documents_enterprise_explicit_org_read
on public.memory_documents is 'Read for current members only when owner explicitly opted this ready, non-agent document into organisation sharing. Existing owner write policy unchanged.';

comment on policy memory_chunks_enterprise_explicit_org_read
on public.memory_chunks is 'Read for current members only when parent owner explicitly shared the matching, ready organisation document; forbids orphan, cross-owner, cross-org and agent chunks. Existing owner write policy unchanged.';

-- The existing owner-only write policy is permissive. A separate restrictive
-- policy is needed so a non-admin contributor cannot bypass the audited
-- sharing action by writing JSON metadata directly via PostgREST.
create policy memory_documents_enterprise_admin_share_insert
on public.memory_documents as restrictive for insert to authenticated
with check (
  org_id is null
  or not (metadata @> '{"enterprise_shared":true}'::jsonb)
  or private.is_org_admin(org_id)
);

create policy memory_documents_enterprise_admin_share_update
on public.memory_documents as restrictive for update to authenticated
using (true)
with check (
  org_id is null
  or not (metadata @> '{"enterprise_shared":true}'::jsonb)
  or private.is_org_admin(org_id)
);


-- Offboarding boundary. A permissive pre-existing owner policy otherwise
-- allows the uploader to read org-labelled documents and chunks after
-- membership removal. RESTRICTIVE SELECT intersects every applicable read
-- policy, including that owner's original policy. Personal (org_id NULL)
-- knowledge keeps its original private-owner semantics.
create policy memory_documents_enterprise_current_member_read
on public.memory_documents as restrictive for select to authenticated
using (
  org_id is null
  or private.is_org_member(org_id)
);

create policy memory_chunks_enterprise_current_member_read
on public.memory_chunks as restrictive for select to authenticated
using (
  org_id is null
  or private.is_org_member(org_id)
);

comment on policy memory_documents_enterprise_current_member_read
on public.memory_documents is 'Prevent stale owner RLS reads after org membership revocation; personal documents remain unchanged.';

comment on policy memory_chunks_enterprise_current_member_read
on public.memory_chunks is 'Prevent stale owner RLS chunk reads after org membership revocation; personal chunks remain unchanged.';


-- Document ingestion also writes a summary into agent_memories. Existing
-- legacy memory RLS can return an org-tagged summary to its former owner,
-- even when its source document is no longer readable. Restrict all current
-- agent-memory SELECT policies for org-tagged rows to live membership. This
-- never grants additional access; personal memories remain owner-scoped.
create policy agent_memories_enterprise_current_member_read
on public.agent_memories as restrictive for select to authenticated
using (
  org_id is null
  or (
    private.is_org_member(org_id)
    and exists (
      select 1 from public.organisation_members author
      where author.org_id = agent_memories.org_id
        and author.user_id = agent_memories.user_id
    )
  )
);

comment on policy agent_memories_enterprise_current_member_read
on public.agent_memories is 'Require live reader and uploader organisation membership for org-labelled memory and derived document summaries, including original-owner reads.';
