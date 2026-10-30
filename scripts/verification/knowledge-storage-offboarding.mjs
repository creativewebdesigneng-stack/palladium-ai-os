// Isolated, real PostgreSQL RLS fixture. No connected data or Production writes.
// Executes the exact storage-policy migration on a minimal Supabase policy model.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
let passed = 0;
const check = (yes,label) => {assert.ok(yes,label);passed+=1;};
const denied = async (f,label) => {await assert.rejects(f,label);passed+=1;};
const ids = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const alice=ids(1), bob=ids(2), orgA=ids(10), orgB=ids(11);
const orgFile=`${alice}/org-contract.pdf`;
const privateFile=`${alice}/private-notes.pdf`;
const orphanFile=`${alice}/pending-upload.pdf`;
const otherFile=`${bob}/different-owner.pdf`;
const linkedMismatch=`${alice}/mismatch.pdf`;

await db.exec(`
create role authenticated;create role anon;create role service_role bypassrls;
create schema auth;create schema private;create schema storage;
create function auth.uid() returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table organisation_members(org_id uuid,user_id uuid,role text);
create function private.is_org_member(_org uuid) returns boolean
language sql stable security definer set search_path=''
as $$ select _org is not null and exists(select 1 from public.organisation_members
where org_id=_org and user_id=auth.uid()) $$;
create table memory_documents(id uuid primary key,user_id uuid not null,org_id uuid,storage_path text);
alter table memory_documents enable row level security;
create policy doc_owner on memory_documents for select to authenticated
using(user_id=auth.uid());
create table storage.objects(id uuid primary key,bucket_id text not null,name text not null);
alter table storage.objects enable row level security;
-- Reproduce the current owner-folder permissive policies, plus other-bucket access.
create policy knowledge_owner_read on storage.objects for select to authenticated
using(bucket_id='knowledge' and split_part(name,'/',1)=auth.uid()::text);
create policy knowledge_owner_update on storage.objects for update to authenticated
using(bucket_id='knowledge' and split_part(name,'/',1)=auth.uid()::text)
with check(bucket_id='knowledge' and split_part(name,'/',1)=auth.uid()::text);
create policy knowledge_owner_delete on storage.objects for delete to authenticated
using(bucket_id='knowledge' and split_part(name,'/',1)=auth.uid()::text);
create policy other_bucket_read on storage.objects for select to authenticated
using(bucket_id='other');
grant usage on schema public,private,storage,auth to authenticated,anon;
grant execute on function auth.uid() to authenticated,anon;
grant execute on function private.is_org_member(uuid) to authenticated;
grant select on memory_documents to authenticated;
grant select,update,delete on storage.objects to authenticated;
insert into organisation_members values
('${orgA}','${alice}','owner'),('${orgA}','${bob}','member'),('${orgB}','${bob}','owner');
insert into memory_documents values
('${ids(101)}','${alice}','${orgA}','${orgFile}'),
('${ids(102)}','${alice}',null,'${privateFile}'),
('${ids(103)}','${bob}','${orgB}','${linkedMismatch}');
insert into storage.objects values
('${ids(201)}','knowledge','${orgFile}'),
('${ids(202)}','knowledge','${privateFile}'),
('${ids(203)}','knowledge','${orphanFile}'),
('${ids(204)}','knowledge','${otherFile}'),
('${ids(205)}','knowledge','${linkedMismatch}'),
('${ids(206)}','other','shared/general.png');
`);
const asUser = async user => {
  await db.exec('reset role; set role authenticated;');
  await db.query('select set_config($1,$2,false)',['request.jwt.claim.sub',user]);
};
const files = async () => (await db.query("select name from storage.objects where bucket_id='knowledge' order by name")).rows.map(x=>x.name);
const migration=readFileSync('supabase/migrations/20261030195000_knowledge_storage_offboarding_guard.sql','utf8');
await db.exec(migration);
const policyRows=(await db.query("select polname,polpermissive from pg_policy where polrelid='storage.objects'::regclass and polname like 'blackstar_knowledge_current_owner_%'")).rows;
check(policyRows.length===3&&policyRows.every(x=>x.polpermissive===false),'all three policies restrict existing permissive rights');
const f=(await db.query("select prosecdef,pronamespace::regnamespace::text as schema from pg_proc where proname='knowledge_storage_owner_can_access'")).rows[0];
check(f.prosecdef===true&&f.schema==='private','offboarding lookup is private boolean-only SECURITY DEFINER');
await asUser(alice);
check((await files()).includes(orgFile),'active uploader can read organisation-linked file');
check((await files()).includes(privateFile),'personal file stays readable');
check((await files()).includes(orphanFile),'unfinished upload remains accessible during indexing');
check(!(await files()).includes(otherFile),'owner folder cannot read another user file');
check(!(await files()).includes(linkedMismatch),'mismatched linked owner is rejected');
check((await db.query("select name from storage.objects where bucket_id='other'")).rows.length===1,'unrelated bucket semantics preserved');

await asUser(bob);
check((await files()).includes(otherFile),'another owner retains access to own unlinked file');
check(!(await files()).includes(orgFile),'being a member does not grant original file download');
check(!(await files()).includes(linkedMismatch),'mismatched linked owner cannot access through own org membership');

await db.exec('reset role;');
await db.query(`delete from organisation_members where org_id='${orgA}' and user_id='${alice}'`);
await asUser(alice);
check(!(await files()).includes(orgFile),'former uploader cannot read org-linked file');
check((await files()).includes(privateFile),'former member can still read personal file');
check((await files()).includes(orphanFile),'orphan still accessible under original folder policy');
check(!(await files()).includes(linkedMismatch),'linked owner mismatch still denied');
check((await db.query("select name from storage.objects where bucket_id='other'")).rows.length===1,'other bucket still unchanged after member offboarding');
check((await db.query(`update storage.objects set name='${alice}/renamed.pdf' where name='${orgFile}' returning id`)).rows.length===0,'former owner cannot rename linked org file');
check((await db.query(`delete from storage.objects where name='${orgFile}' returning id`)).rows.length===0,'former owner cannot delete linked org file');

check((await db.query("select private.knowledge_storage_owner_can_access($1) as ok",[otherFile])).rows[0].ok===false,'helper cannot authorize another owner path');
check((await db.query("select private.knowledge_storage_owner_can_access($1) as ok",[orgFile])).rows[0].ok===false,'helper cannot authorize revoked org file');
await db.exec('reset role;set role anon;');
await denied(()=>db.query("select private.knowledge_storage_owner_can_access('x')"),'anonymous cannot call private owner function');
check((await db.query("select has_function_privilege('anon','private.knowledge_storage_owner_can_access(text)','EXECUTE') as ok")).rows[0].ok===false,'anon function execute privilege revoked');
await db.close();
console.log(`Knowledge Storage offboarding: ${passed} isolated PostgreSQL owner/membership checks passed.`);
