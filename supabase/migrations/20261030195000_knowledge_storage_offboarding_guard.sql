-- Blackstar Knowledge Storage offboarding: DRAFT PREVIEW SECURITY GATE ONLY.
-- Supabase storage.objects is managed by Storage: only RLS policies are added.
-- The private 'knowledge' bucket already has owner-prefix permissive policies.
-- These restrictive policies intersect them; they never grant another reader.
--
-- We must query document affiliation outside the caller's memory_documents RLS:
-- once a member is removed the document row becomes invisible, and an invoker
-- NOT EXISTS would incorrectly interpret that as an unlinked personal file.
-- This dedicated boolean-only helper is therefore SECURITY DEFINER in the
-- non-exposed private schema with a fixed search_path and explicit UID guard.

create function private.knowledge_storage_owner_can_access(_path text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $knowledge_storage_access$
  select
    (select auth.uid()) is not null
    and _path is not null
    and split_part(_path, '/', 1) = (select auth.uid())::text
    and not exists (
      select 1 from public.memory_documents d
      where d.storage_path = _path
        and (
          d.user_id is distinct from (select auth.uid())
          or (
            d.org_id is not null
            and not private.is_org_member(d.org_id)
          )
        )
    )
$knowledge_storage_access$;

revoke all on function private.knowledge_storage_owner_can_access(text) from public;
revoke all on function private.knowledge_storage_owner_can_access(text) from anon;
grant execute on function private.knowledge_storage_owner_can_access(text) to authenticated;

create policy blackstar_knowledge_current_owner_read
on storage.objects as restrictive for select to authenticated
using (
  bucket_id <> 'knowledge'
  or private.knowledge_storage_owner_can_access(name)
);

create policy blackstar_knowledge_current_owner_update
on storage.objects as restrictive for update to authenticated
using (
  bucket_id <> 'knowledge'
  or private.knowledge_storage_owner_can_access(name)
)
with check (
  bucket_id <> 'knowledge'
  or private.knowledge_storage_owner_can_access(name)
);

create policy blackstar_knowledge_current_owner_delete
on storage.objects as restrictive for delete to authenticated
using (
  bucket_id <> 'knowledge'
  or private.knowledge_storage_owner_can_access(name)
);

comment on function private.knowledge_storage_owner_can_access(text) is
'Boolean-only current owner-folder and linked organisation member guard for private knowledge Storage; no document data returned. SECURITY DEFINER required to inspect linked rows hidden by caller RLS after offboarding.';

comment on policy blackstar_knowledge_current_owner_read on storage.objects is
'Intersect knowledge Storage SELECT with live owner-folder and linked document membership. Does not grant shared team file access.';

comment on policy blackstar_knowledge_current_owner_update on storage.objects is
'Block knowledge Storage object replacement/rename when linked owner loses organisation membership.';

comment on policy blackstar_knowledge_current_owner_delete on storage.objects is
'Block knowledge Storage object deletion for a former organisation member, without altering other buckets.';
