-- Candidate only. No Production application/merging authorised.
-- Narrow the existing permissive storage.objects policies for the knowledge
-- bucket; do not change unrelated media/studio buckets. Policies act as AND
-- restrictions regardless of other permissive storage policies.
--
-- Read-only inspection of the connected Supabase project (30 Oct 2026):
-- trusted_media_read_scope/upload_scope and no_client_delete/replace apply
-- permissively to every non-'trusted-media' bucket. An owner-prefix policy
-- alone is NOT an access boundary when those policies also exist.
--
-- A private, authenticated-only helper checks *current* owner access using
-- privileged storage metadata and linked memory_document ownership. It is
-- intentionally a narrow SECURITY DEFINER to avoid owner-offboarding
-- visibility disappearing under a restrictive document RLS policy. Every
-- check starts with auth.uid() + exact prefix; it never returns a document.

create function private.knowledge_object_owner_read(_object_id uuid)
returns boolean
language sql stable security definer
set search_path = pg_catalog, public, storage
as $knowledge_read$
  select (select auth.uid()) is not null
    and exists (
    select 1 from storage.objects o
    where o.id = _object_id
      and o.bucket_id = 'knowledge'
      and split_part(o.name, '/', 1) = (select auth.uid())::text
      and (
        (
          exists (
            select 1 from public.memory_documents d
            where d.storage_path = o.name
          )
          and not exists (
            select 1 from public.memory_documents d
            where d.storage_path = o.name and (
              d.user_id is distinct from (select auth.uid())
              or (d.org_id is not null and not private.is_org_member(d.org_id))
            )
          )
        )
        or (
          not exists (
            select 1 from public.memory_documents d
            where d.storage_path = o.name
          )
          and o.created_at >= now() - interval '1 hour'
        )
      )
  )
$knowledge_read$;

revoke all on function private.knowledge_object_owner_read(uuid) from public;
grant execute on function private.knowledge_object_owner_read(uuid) to authenticated;

create policy blackstar_knowledge_strict_read
  on storage.objects as restrictive for select to authenticated
  using (
    bucket_id <> 'knowledge'
    or private.knowledge_object_owner_read(id)
  );

create policy blackstar_knowledge_strict_insert
  on storage.objects as restrictive for insert to authenticated
  with check (
    bucket_id <> 'knowledge'
    or (
      (select auth.uid()) is not null
      and split_part(name, '/', 1) = (select auth.uid())::text
    )
  );

create policy blackstar_knowledge_strict_update
  on storage.objects as restrictive for update to authenticated
  using (
    bucket_id <> 'knowledge'
    or private.knowledge_object_owner_read(id)
  )
  with check (
    bucket_id <> 'knowledge'
    or (
      (select auth.uid()) is not null
      and split_part(name, '/', 1) = (select auth.uid())::text
    )
  );

create policy blackstar_knowledge_strict_delete
  on storage.objects as restrictive for delete to authenticated
  using (
    bucket_id <> 'knowledge'
    or private.knowledge_object_owner_read(id)
  );

comment on policy blackstar_knowledge_strict_read on storage.objects is
  'Narrow non-media storage permissive SELECT policies: knowledge objects owner-only, owner must remain current organisation member for linked org documents; orphan upload window one hour.';

comment on function private.knowledge_object_owner_read(uuid) is
  'Authenticated-only, bounded storage object permission predicate. No exposed document content. Check prefix/owner/authorised live membership with explicit orphan-upload window.';

-- Does not modify bucket visibility or create a bucket. Existing signed
-- URLs may survive revocation until expiry; short URL TTL remains necessary.
