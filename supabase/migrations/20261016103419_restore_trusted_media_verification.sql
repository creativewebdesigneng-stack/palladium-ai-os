-- Restore the existing private media pipeline without client-forgeable verification or mutable verified objects.
do $$ begin
 if to_regclass('public.trusted_media_assets') is not null or exists(select 1 from storage.buckets where id='trusted-media') then
  raise exception 'Trusted media recovery requires the ledger and bucket absent; review partial state first';
 end if;
end $$;

create table public.trusted_media_assets (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 bucket text not null default 'trusted-media' check(bucket='trusted-media'),
 object_path text not null,
 filename text not null,
 mime_type text not null check(mime_type='video/mp4'),
 size_bytes bigint check(size_bytes is null or size_bytes between 24 and 52428800),
 duration_seconds numeric check(duration_seconds is null or duration_seconds>0 and duration_seconds<=43200),
 status text not null default 'uploading' check(status in ('uploading','ready','invalid')),
 last_error text,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 verified_at timestamptz,
 updated_at timestamptz not null default now(),
 unique(user_id,object_path),
 check(object_path like user_id::text||'/%'),
 check(status<>'ready' or (size_bytes is not null and duration_seconds is not null and verified_at is not null and object_path=user_id::text||'/'||id::text||'/'||filename))
);
create index trusted_media_assets_user_status_idx on public.trusted_media_assets(user_id,status,created_at desc);
alter table public.trusted_media_assets enable row level security;
revoke all on public.trusted_media_assets from public,anon,authenticated;
grant select on public.trusted_media_assets to authenticated;
grant all on public.trusted_media_assets to service_role;
create policy trusted_media_owner_select on public.trusted_media_assets for select to authenticated using(user_id=(select auth.uid()));

-- The project's current Free plan supports a 50 MB maximum, not the old draft's 512 MB limit.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('trusted-media','trusted-media',false,52428800,array['video/mp4']);

create policy trusted_media_object_read on storage.objects for select to authenticated using(
 bucket_id='trusted-media' and exists(select 1 from public.trusted_media_assets a where a.user_id=(select auth.uid()) and a.object_path=storage.objects.name)
);
create policy trusted_media_object_upload on storage.objects for insert to authenticated with check(
 bucket_id='trusted-media' and exists(select 1 from public.trusted_media_assets a where a.user_id=(select auth.uid()) and a.object_path=storage.objects.name and a.status='uploading')
);
-- Restrictive policies keep broad legacy storage policies from authorizing a bypass.
create policy trusted_media_read_scope on storage.objects as restrictive for select to authenticated using(
 bucket_id<>'trusted-media' or exists(select 1 from public.trusted_media_assets a where a.user_id=(select auth.uid()) and a.object_path=storage.objects.name)
);
create policy trusted_media_upload_scope on storage.objects as restrictive for insert to authenticated with check(
 bucket_id<>'trusted-media' or exists(select 1 from public.trusted_media_assets a where a.user_id=(select auth.uid()) and a.object_path=storage.objects.name and a.status='uploading')
);
create policy trusted_media_no_client_replace on storage.objects as restrictive for update to authenticated
 using(bucket_id<>'trusted-media') with check(bucket_id<>'trusted-media');
create policy trusted_media_no_client_delete on storage.objects as restrictive for delete to authenticated using(bucket_id<>'trusted-media');
