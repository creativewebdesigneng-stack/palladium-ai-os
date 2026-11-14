-- Authored 3D Studio scenes. These rows are documents the signed-in user
-- creates and edits. They are not worker output and must never be seeded
-- with sample meshes.

create table if not exists public.three_d_scenes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  document jsonb not null default '{"objects":[]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint three_d_scenes_name_length check (char_length(name) between 1 and 160),
  constraint three_d_scenes_description_length check (char_length(description) <= 2000),
  constraint three_d_scenes_document_shape check (
    jsonb_typeof(document) = 'object'
    and jsonb_typeof(document->'objects') = 'array'
    and jsonb_array_length(document->'objects') <= 64
    and octet_length(document::text) <= 250000
  )
);

create index if not exists three_d_scenes_user_updated_idx on public.three_d_scenes(user_id, updated_at desc);

alter table public.three_d_scenes enable row level security;
revoke all on public.three_d_scenes from anon, authenticated;
grant select, insert, update, delete on public.three_d_scenes to authenticated;
grant all on public.three_d_scenes to service_role;

drop policy if exists three_d_scenes_select_own on public.three_d_scenes;
create policy three_d_scenes_select_own on public.three_d_scenes
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists three_d_scenes_insert_own on public.three_d_scenes;
create policy three_d_scenes_insert_own on public.three_d_scenes
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists three_d_scenes_update_own on public.three_d_scenes;
create policy three_d_scenes_update_own on public.three_d_scenes
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists three_d_scenes_delete_own on public.three_d_scenes;
create policy three_d_scenes_delete_own on public.three_d_scenes
  for delete to authenticated using ((select auth.uid()) = user_id);
