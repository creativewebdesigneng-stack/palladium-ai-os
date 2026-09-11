-- Blackstar Game Foundry private uploads.
-- Source images/models remain private. Workers receive only short-lived signed URLs.

alter table public.three_d_jobs
  add column if not exists source_storage_path text;

insert into storage.buckets (id, name, public, file_size_limit)
values ('game-foundry', 'game-foundry', false, 104857600)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit;

drop policy if exists "game_foundry_storage_select_own" on storage.objects;
create policy "game_foundry_storage_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'game-foundry'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "game_foundry_storage_insert_own" on storage.objects;
create policy "game_foundry_storage_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'game-foundry'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "game_foundry_storage_update_own" on storage.objects;
create policy "game_foundry_storage_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'game-foundry'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'game-foundry'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "game_foundry_storage_delete_own" on storage.objects;
create policy "game_foundry_storage_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'game-foundry'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
