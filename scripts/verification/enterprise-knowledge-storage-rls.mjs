// Exact SQL migration exercised against a fresh in-memory PostgreSQL engine.
// All identities and storage objects are fictional; no connected Supabase writes.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const alice = id(1), bob = id(2), stranger = id(3), org = id(11);
let passed = 0;
const check = (value, label) => { assert.ok(value, label); passed++; };
const sql = async query => (await db.query(query)).rows;
const mustFail = async (query, label) => {
  await assert.rejects(()=>db.query(query), label);
  passed++;
};
const asUser = async user => {
  await db.exec('reset role; set role authenticated;');
  await db.query('select set_config($1,$2,false)', ['request.jwt.claim.sub',user]);
};
await db.exec(`
  create role anon; create role authenticated; create role service_role bypassrls;
  create schema auth; create schema private; create schema storage;
  create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  create function storage.foldername(_name text) returns text[]
    language sql immutable as $$ select string_to_array(_name,'/') $$;
  create table organisation_members (org_id uuid,user_id uuid, role text);
  create function private.is_org_member(_org uuid) returns boolean
    language sql stable security definer set search_path=''
    as $$ select _org is not null and exists (
      select 1 from public.organisation_members
      where org_id=_org and user_id=(select auth.uid())
    ) $$;
  create table public.memory_documents (
    id uuid primary key,storage_path text, user_id uuid, org_id uuid
  );
  create table storage.objects (
    id uuid primary key, bucket_id text not null,
    name text not null, created_at timestamptz not null default now()
  );
  alter table storage.objects enable row level security;
  alter table public.memory_documents enable row level security;
  create policy memory_documents_owner_only on public.memory_documents for select
    to authenticated using (user_id=auth.uid());
  create policy trusted_media_read_scope on storage.objects for select
    to authenticated using (bucket_id<>'trusted-media');
  create policy trusted_media_upload_scope on storage.objects for insert
    to authenticated with check (bucket_id<>'trusted-media');
  create policy trusted_media_no_client_replace on storage.objects for update
    to authenticated using (bucket_id<>'trusted-media') with check (bucket_id<>'trusted-media');
  create policy trusted_media_no_client_delete on storage.objects for delete
    to authenticated using (bucket_id<>'trusted-media');
  create policy blackstar_knowledge_owner_read on storage.objects for select
    to authenticated using (bucket_id='knowledge' and split_part(name,'/',1)=auth.uid()::text);
  create policy blackstar_knowledge_owner_insert on storage.objects for insert
    to authenticated with check (bucket_id='knowledge' and split_part(name,'/',1)=auth.uid()::text);
  create policy blackstar_knowledge_owner_update on storage.objects for update
    to authenticated using (bucket_id='knowledge' and split_part(name,'/',1)=auth.uid()::text)
    with check (bucket_id='knowledge' and split_part(name,'/',1)=auth.uid()::text);
  create policy blackstar_knowledge_owner_delete on storage.objects for delete
    to authenticated using (bucket_id='knowledge' and split_part(name,'/',1)=auth.uid()::text);
  grant usage on schema storage,auth,private,public to authenticated,anon;
  grant execute on function auth.uid() to authenticated,anon;
  grant execute on function private.is_org_member(uuid) to authenticated;
  grant all on storage.objects to authenticated;
  grant select on storage.objects to anon;
  grant select on public.memory_documents to authenticated;
  insert into organisation_members values
    ('${org}','${alice}','owner'),('${org}','${bob}','member');
  insert into public.memory_documents values
    ('${id(100)}','${alice}/org.pdf','${alice}','${org}'),
    ('${id(101)}','${alice}/private.pdf','${alice}',null),
    ('${id(102)}','${bob}/org.pdf','${bob}','${org}');
  insert into storage.objects (id,bucket_id,name,created_at) values
    ('${id(200)}','knowledge','${alice}/org.pdf',now()),
    ('${id(201)}','knowledge','${alice}/private.pdf',now()),
    ('${id(202)}','knowledge','${alice}/orphan-old.pdf',now()-interval '2 hours'),
    ('${id(203)}','knowledge','${alice}/orphan-new.pdf',now()),
    ('${id(204)}','knowledge','${bob}/org.pdf',now()),
    ('${id(205)}','game-foundry','${alice}/graphic.png',now()),
    ('${id(206)}','knowledge','${stranger}/unknown.pdf',now());
`);
const migration = readFileSync('supabase/migrations/20261030004500_knowledge_storage_strict_current_owner.sql','utf8');
await db.exec(migration);

await asUser(bob);
check((await sql(`select id from storage.objects where name='${alice}/org.pdf'`)).length===0,
  'member cannot fetch uploader original file (only citation excerpts are shared)');
check((await sql(`select id from storage.objects where name='${alice}/private.pdf'`)).length===0,
  'a logged-in different user cannot read unrelated personal file despite broad legacy policy');
check((await sql(`select id from storage.objects where name='${bob}/org.pdf'`)).length===1,
  'current uploader can read own organisation file');
await mustFail(`delete from storage.objects where id='${id(200)}' returning id`,
  'member cannot delete uploader original file');
await mustFail(`insert into storage.objects(id,bucket_id,name) values
  ('${id(300)}','knowledge','${alice}/injected.pdf')`, 'forged owner prefix insert blocked');
await mustFail(`update storage.objects set name='${alice}/replaced.pdf' where id='${id(204)}'
  returning id`, 'cannot update own object into somebody else user path');
check((await sql(`select id from storage.objects where bucket_id='game-foundry'`)).length===1,
  'unrelated bucket remains unchanged by narrowly scoped restrictive policy');

await asUser(alice);
check((await sql(`select id from storage.objects where id='${id(200)}'`)).length===1,
  'current uploader reads own existing organisation file');
check((await sql(`select id from storage.objects where id='${id(201)}'`)).length===1,
  'personal file continues readable');
check((await sql(`select id from storage.objects where id='${id(202)}'`)).length===0,
  'old unindexed orphan becomes inaccessible');
check((await sql(`select id from storage.objects where id='${id(203)}'`)).length===1,
  'recent in-flight upload remains accessible for indexing');
check((await sql(`select id from storage.objects where id='${id(206)}'`)).length===0,
  'cannot fetch stranger file');

await db.exec('reset role;');
await db.exec(`delete from organisation_members where user_id='${alice}' and org_id='${org}'`);
await asUser(alice);
check((await sql(`select id from storage.objects where id='${id(200)}'`)).length===0,
  'former uploader cannot fetch org document file after offboarding');
check((await sql(`select id from storage.objects where id='${id(201)}'`)).length===1,
  'former uploader keeps personal file access');
check((await sql(`select id from storage.objects where id='${id(203)}'`)).length===1,
  'orphan upload remains owner accessible for one hour (documented limitation)');
check((await sql(`update storage.objects set name=name where id='${id(200)}' returning id`)).length===0,
  'former uploader cannot modify linked organisation file');
check((await sql(`delete from storage.objects where id='${id(200)}' returning id`)).length===0,
  'former uploader cannot delete linked organisation file');

await db.exec('reset role; set role anon;');
check((await sql('select id from storage.objects')).length===0,
  'anonymous cannot read storage objects with no anon permissive policy');
await db.close();
console.log(`Enterprise knowledge storage: ${passed} isolated PostgreSQL RLS checks passed.`);
