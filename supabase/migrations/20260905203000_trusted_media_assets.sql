-- Trusted, owner-scoped media ingest for governed social/video publishing.
-- Objects stay private and are addressed only through opaque asset IDs after
-- server verification; provider execution never accepts arbitrary source URLs.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trusted-media', 'trusted-media', false, 536870912, array['video/mp4'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.trusted_media_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  bucket text not null default 'trusted-media' check (bucket = 'trusted-media'),
  object_path text not null,
  filename text not null,
  mime_type text not null check (mime_type = 'video/mp4'),
  size_bytes bigint,
  duration_seconds numeric,
  status text not null default 'uploading' check (status in ('uploading', 'ready', 'invalid')),
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  verified_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, object_path)
);

create index if not exists trusted_media_assets_user_status_idx
  on public.trusted_media_assets(user_id, status, created_at desc);

alter table public.trusted_media_assets enable row level security;

create policy "trusted_media_assets_owner_select" on public.trusted_media_assets
  for select to authenticated using (auth.uid() = user_id);
create policy "trusted_media_assets_owner_insert" on public.trusted_media_assets
  for insert to authenticated with check (auth.uid() = user_id);
create policy "trusted_media_assets_owner_update" on public.trusted_media_assets
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "trusted_media_assets_owner_delete" on public.trusted_media_assets
  for delete to authenticated using (auth.uid() = user_id);

-- Bucket paths are always <owner uuid>/<asset uuid>/<safe filename>.
create policy "trusted_media_objects_owner_select" on storage.objects
  for select to authenticated using (
    bucket_id = 'trusted-media' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "trusted_media_objects_owner_insert" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'trusted-media' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "trusted_media_objects_owner_update" on storage.objects
  for update to authenticated using (
    bucket_id = 'trusted-media' and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'trusted-media' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "trusted_media_objects_owner_delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'trusted-media' and (storage.foldername(name))[1] = auth.uid()::text
  );

grant select, insert, update, delete on public.trusted_media_assets to authenticated;
revoke all on public.trusted_media_assets from anon;
