-- The canonical Blackstar memory document API signs URLs only after checking
-- the owner of memory_documents. Files remain private at the storage layer too.
-- Never rewrite an existing bucket or make private source documents public.
insert into storage.buckets(id,name,public,file_size_limit)
values ('knowledge','knowledge',false,26214400)
on conflict (id) do nothing;

do $$
begin
  if exists(select 1 from storage.buckets where id='knowledge' and public is distinct from false) then
    raise exception 'Knowledge bucket must remain private';
  end if;
end $$;

-- A user may access only files under their own UUID prefix. Nothing here
-- grants reads to a public bucket, other users, or arbitrary organisation files.
drop policy if exists blackstar_knowledge_owner_read on storage.objects;
create policy blackstar_knowledge_owner_read on storage.objects
 for select to authenticated
 using(bucket_id='knowledge' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists blackstar_knowledge_owner_insert on storage.objects;
create policy blackstar_knowledge_owner_insert on storage.objects
 for insert to authenticated
 with check(bucket_id='knowledge' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists blackstar_knowledge_owner_update on storage.objects;
create policy blackstar_knowledge_owner_update on storage.objects
 for update to authenticated
 using(bucket_id='knowledge' and (storage.foldername(name))[1]=(select auth.uid())::text)
 with check(bucket_id='knowledge' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists blackstar_knowledge_owner_delete on storage.objects;
create policy blackstar_knowledge_owner_delete on storage.objects
 for delete to authenticated
 using(bucket_id='knowledge' and (storage.foldername(name))[1]=(select auth.uid())::text);
