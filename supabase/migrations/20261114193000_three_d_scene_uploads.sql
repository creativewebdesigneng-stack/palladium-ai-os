-- Uploaded GLB/glTF files and scene thumbnails for 3D Studio.
-- Additive only. Existing scene documents stay valid.

alter table public.three_d_scenes
  add column if not exists thumbnail text;

alter table public.three_d_scenes
  drop constraint if exists three_d_scenes_thumbnail_jpeg;
alter table public.three_d_scenes
  add constraint three_d_scenes_thumbnail_jpeg check (
    thumbnail is null
    or (thumbnail like 'data:image/jpeg;base64,%' and char_length(thumbnail) <= 80000)
  );

create table if not exists public.three_d_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  filename text not null,
  object_path text not null,
  byte_size integer,
  created_at timestamptz not null default now(),
  constraint three_d_uploads_filename_length check (char_length(filename) between 1 and 180),
  constraint three_d_uploads_path_owner check (object_path like user_id::text || '/%'),
  constraint three_d_uploads_model_extension check (object_path ~* '\.(glb|gltf)$')
);

create index if not exists three_d_uploads_user_created_idx on public.three_d_uploads(user_id, created_at desc);
alter table public.three_d_uploads enable row level security;
revoke all on public.three_d_uploads from anon, authenticated;
grant select, insert, update, delete on public.three_d_uploads to authenticated;
grant all on public.three_d_uploads to service_role;

drop policy if exists three_d_uploads_select_own on public.three_d_uploads;
create policy three_d_uploads_select_own on public.three_d_uploads
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists three_d_uploads_insert_own on public.three_d_uploads;
create policy three_d_uploads_insert_own on public.three_d_uploads
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists three_d_uploads_update_own on public.three_d_uploads;
create policy three_d_uploads_update_own on public.three_d_uploads
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists three_d_uploads_delete_own on public.three_d_uploads;
create policy three_d_uploads_delete_own on public.three_d_uploads
  for delete to authenticated using ((select auth.uid()) = user_id);

insert into storage.buckets(id, name, public, file_size_limit)
values ('three-d-studio', 'three-d-studio', false, 41943040)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

drop policy if exists three_d_studio_storage_select_own on storage.objects;
create policy three_d_studio_storage_select_own on storage.objects
  for select to authenticated
  using (bucket_id = 'three-d-studio' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists three_d_studio_storage_insert_own on storage.objects;
create policy three_d_studio_storage_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'three-d-studio' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists three_d_studio_storage_update_own on storage.objects;
create policy three_d_studio_storage_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'three-d-studio' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'three-d-studio' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists three_d_studio_storage_delete_own on storage.objects;
create policy three_d_studio_storage_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'three-d-studio' and (storage.foldername(name))[1] = (select auth.uid())::text);
