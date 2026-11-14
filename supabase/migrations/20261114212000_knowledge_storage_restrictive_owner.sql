-- Additive knowledge-bucket storage gate.
-- Supersedes the divergent storage drafts in PR #1037
-- (security/knowledge-storage-offboarding-20261030) and PR #1038
-- (security/enterprise-knowledge-storage-isolation-20261030).
-- Those branches are not ancestors of PR #1048, and #1048 does not contain
-- either storage migration. This file does not replace #1048's enterprise
-- knowledge screens or share-audit tables.
--
-- Existing permissive owner-prefix policies stay. A restrictive policy is
-- AND-ed with them, so a broader permissive storage policy cannot admit a
-- knowledge object on its own. Linked organisation documents also require
-- current membership, which removes direct file access after offboarding.
-- Unindexed uploads stay readable by their uploader for one hour.
-- No bucket is created, no other bucket is rewritten, and no rows are backfilled.

do $$
begin
  if to_regclass('public.memory_documents') is null then
    raise exception 'memory_documents must exist before the knowledge storage gate';
  end if;
  if to_regprocedure('private.is_org_member(uuid)') is null then
    raise exception 'private.is_org_member(uuid) must exist before the knowledge storage gate';
  end if;
end $$;

create or replace function private.knowledge_object_owner_read(_object_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, storage
as $knowledge_read$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from storage.objects as object
      where object.id = _object_id
        and object.bucket_id = 'knowledge'
        and split_part(object.name, '/', 1) = (select auth.uid())::text
        and (
          (
            exists (
              select 1
              from public.memory_documents as document
              where document.storage_path = object.name
            )
            and not exists (
              select 1
              from public.memory_documents as document
              where document.storage_path = object.name
                and (
                  document.user_id is distinct from (select auth.uid())
                  or (
                    document.org_id is not null
                    and not private.is_org_member(document.org_id)
                  )
                )
            )
          )
          or (
            not exists (
              select 1
              from public.memory_documents as document
              where document.storage_path = object.name
            )
            and object.created_at >= now() - interval '1 hour'
          )
        )
    )
$knowledge_read$;

revoke all on function private.knowledge_object_owner_read(uuid) from public, anon;
grant execute on function private.knowledge_object_owner_read(uuid) to authenticated;

drop policy if exists blackstar_knowledge_strict_read on storage.objects;
create policy blackstar_knowledge_strict_read
  on storage.objects
  as restrictive
  for select
  to authenticated
  using (
    bucket_id <> 'knowledge'
    or private.knowledge_object_owner_read(id)
  );

drop policy if exists blackstar_knowledge_strict_insert on storage.objects;
create policy blackstar_knowledge_strict_insert
  on storage.objects
  as restrictive
  for insert
  to authenticated
  with check (
    bucket_id <> 'knowledge'
    or (
      (select auth.uid()) is not null
      and split_part(name, '/', 1) = (select auth.uid())::text
    )
  );

drop policy if exists blackstar_knowledge_strict_update on storage.objects;
create policy blackstar_knowledge_strict_update
  on storage.objects
  as restrictive
  for update
  to authenticated
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

drop policy if exists blackstar_knowledge_strict_delete on storage.objects;
create policy blackstar_knowledge_strict_delete
  on storage.objects
  as restrictive
  for delete
  to authenticated
  using (
    bucket_id <> 'knowledge'
    or private.knowledge_object_owner_read(id)
  );

comment on function private.knowledge_object_owner_read(uuid) is
  'Authenticated knowledge-object predicate. Returns no document content. Requires the caller path prefix, current ownership, and live organisation membership for linked org documents.';
