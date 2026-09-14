insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'website-studio-assets',
  'website-studio-assets',
  false,
  26214400,
  array[
    'image/jpeg','image/png','image/webp','image/gif','image/svg+xml','image/avif',
    'video/mp4','video/webm',
    'application/pdf',
    'font/woff','font/woff2','application/font-woff'
  ]::text[]
)
on conflict (id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types,
  updated_at=now();

drop policy if exists "website studio storage select own" on storage.objects;
drop policy if exists "website studio storage insert own" on storage.objects;
drop policy if exists "website studio storage update own" on storage.objects;
drop policy if exists "website studio storage delete own" on storage.objects;

create policy "website studio storage select own"
on storage.objects for select to authenticated
using (
  bucket_id='website-studio-assets'
  and (storage.foldername(name))[1]=(select auth.uid()::text)
  and exists (
    select 1 from public.website_studio_projects p
    where p.id::text=(storage.foldername(name))[2]
      and p.user_id=(select auth.uid())
  )
);

create policy "website studio storage insert own"
on storage.objects for insert to authenticated
with check (
  bucket_id='website-studio-assets'
  and (storage.foldername(name))[1]=(select auth.uid()::text)
  and exists (
    select 1 from public.website_studio_projects p
    where p.id::text=(storage.foldername(name))[2]
      and p.user_id=(select auth.uid())
  )
);

create policy "website studio storage update own"
on storage.objects for update to authenticated
using (
  bucket_id='website-studio-assets'
  and (storage.foldername(name))[1]=(select auth.uid()::text)
  and exists (
    select 1 from public.website_studio_projects p
    where p.id::text=(storage.foldername(name))[2]
      and p.user_id=(select auth.uid())
  )
)
with check (
  bucket_id='website-studio-assets'
  and (storage.foldername(name))[1]=(select auth.uid()::text)
  and exists (
    select 1 from public.website_studio_projects p
    where p.id::text=(storage.foldername(name))[2]
      and p.user_id=(select auth.uid())
  )
);

create policy "website studio storage delete own"
on storage.objects for delete to authenticated
using (
  bucket_id='website-studio-assets'
  and (storage.foldername(name))[1]=(select auth.uid()::text)
  and exists (
    select 1 from public.website_studio_projects p
    where p.id::text=(storage.foldername(name))[2]
      and p.user_id=(select auth.uid())
  )
);

alter table public.website_studio_assets
  add column if not exists storage_path text;

alter table public.website_studio_assets
  alter column source_url drop not null;

alter table public.website_studio_assets
  drop constraint if exists website_studio_assets_source_check;

alter table public.website_studio_assets
  add constraint website_studio_assets_source_check
  check (
    (source_url is not null and char_length(source_url) between 1 and 4000)
    or
    (storage_path is not null and char_length(storage_path) between 1 and 4000)
  );
