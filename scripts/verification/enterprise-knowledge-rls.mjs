// Real in-memory PostgreSQL RLS acceptance. Never touches Supabase Production.
// Runs the exact candidate migration against owner-only baseline policies.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
let passed = 0;
const verify = (condition, label) => { assert.ok(condition, label); passed += 1; };
const rows = async sql => (await db.query(sql)).rows;
const id = num => `00000000-0000-4000-8000-${String(num).padStart(12, '0')}`;
const alice = id(1), bob = id(2), stranger = id(3);
const org = id(11), otherOrg = id(12);
const shared = id(101), privateDoc = id(102), unready = id(103);
const agentDoc = id(104), foreign = id(105), falseFlag = id(106);
const sharedChunk = id(201), mismatchedChunk = id(202);

await db.exec(`
  create role anon; create role authenticated; create role service_role bypassrls;
  create schema auth; create schema private;
  create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  create table organisation_members (org_id uuid, user_id uuid, role text);
  create function private.is_org_member(_org uuid) returns boolean
    language sql stable security definer set search_path=''
    as $$ select _org is not null and exists (
      select 1 from public.organisation_members
      where org_id = _org and user_id = (select auth.uid())
    ) $$;
  create function private.is_org_admin(_org uuid) returns boolean
    language sql stable security definer set search_path=''
    as $admin$ select _org is not null and exists (
      select 1 from public.organisation_members
      where org_id = _org and user_id = (select auth.uid()) and role in ('owner','admin')
    ) $admin$;
  alter table organisation_members enable row level security;
  create policy om_select on organisation_members for select to authenticated
    using(user_id=(select auth.uid()) or private.is_org_member(org_id));
  grant select on organisation_members to authenticated;
  create table memory_documents (
    id uuid primary key, user_id uuid not null, org_id uuid,
    agent_id uuid, title text, status text not null, metadata jsonb not null default '{}'::jsonb
  );
  create table memory_chunks (
    id uuid primary key, document_id uuid not null references memory_documents(id),
    user_id uuid not null, org_id uuid, agent_id uuid, content text
  );
  alter table memory_documents enable row level security;
  alter table memory_chunks enable row level security;
  create policy memory_documents_owner_only on memory_documents for all to authenticated
    using(user_id=(select auth.uid()))
    with check(user_id=(select auth.uid()) and (org_id is null or private.is_org_member(org_id)));
  create policy memory_chunks_owner_select on memory_chunks for select to authenticated
    using(user_id=(select auth.uid()));
  create policy memory_chunks_owner_delete on memory_chunks for delete to authenticated
    using(user_id=(select auth.uid()));
  create policy memory_chunks_owner_update on memory_chunks for update to authenticated
    using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
  grant usage on schema public,private,auth to authenticated,anon;
  grant execute on function auth.uid() to authenticated,anon;
  grant execute on function private.is_org_member(uuid) to authenticated;
  grant execute on function private.is_org_admin(uuid) to authenticated;
  grant select,insert,update,delete on memory_documents,memory_chunks to authenticated;
  insert into organisation_members values
    ('${org}','${alice}','owner'),('${org}','${bob}','member'),
    ('${otherOrg}','${stranger}','owner');
  insert into memory_documents (id,user_id,org_id,agent_id,title,status,metadata) values
    ('${shared}','${alice}','${org}',null,'Shared policy','ready','{"enterprise_shared":true}'),
    ('${privateDoc}','${alice}','${org}',null,'Not shared','ready','{}'),
    ('${unready}','${alice}','${org}',null,'Pending','processing','{"enterprise_shared":true}'),
    ('${agentDoc}','${alice}','${org}','${id(999)}','Agent only','ready','{"enterprise_shared":true}'),
    ('${foreign}','${alice}','${otherOrg}',null,'Other tenant','ready','{"enterprise_shared":true}'),
    ('${falseFlag}','${alice}','${org}',null,'String opt in','ready','{"enterprise_shared":"true"}');
  insert into memory_chunks(id,document_id,user_id,org_id,agent_id,content) values
    ('${sharedChunk}','${shared}','${alice}','${org}',null,'Approved procedure'),
    ('${mismatchedChunk}','${shared}','${alice}','${otherOrg}',null,'Mismatched tenancy'),
    ('${id(203)}','${privateDoc}','${alice}','${org}',null,'Private procedure'),
    ('${id(204)}','${unready}','${alice}','${org}',null,'Processing'),
    ('${id(205)}','${agentDoc}','${alice}','${org}',null,'Agent only');
`);

const migration = readFileSync('supabase/migrations/20261030003000_enterprise_knowledge_explicit_org_read.sql','utf8');
await db.exec(migration);
const selectAs = async (user, query) => {
  await db.exec('reset role; set role authenticated;');
  await db.query('select set_config($1,$2,false)', ['request.jwt.claim.sub',user]);
  return rows(query);
};

verify((await selectAs(bob,'select id from memory_documents')).length===1,'member sees only explicit shared ready docs');
verify((await rows('select id from memory_chunks')).length===1,'member sees only matching parent chunk');
verify((await rows(`select id from memory_documents where id='${privateDoc}'`)).length===0,'private document not exposed');
verify((await rows(`select id from memory_documents where id='${unready}'`)).length===0,'processing document not exposed');
verify((await rows(`select id from memory_documents where id='${agentDoc}'`)).length===0,'agent document not exposed');
verify((await rows(`select id from memory_documents where id='${falseFlag}'`)).length===0,'string value cannot opt in');
verify((await rows(`select id from memory_chunks where id='${mismatchedChunk}'`)).length===0,'mismatched chunk never exposed');
verify((await rows(`update memory_documents set title='tampered' where id='${shared}' returning id`)).length===0,'members cannot edit owner documents');
verify((await rows(`delete from memory_documents where id='${shared}' returning id`)).length===0,'members cannot delete owner documents');

// An organisation member may contribute a private doc but cannot toggle
// shared metadata directly through PostgREST, even if they own the row.
await db.exec('reset role;');
await db.query(`insert into memory_documents (id,user_id,org_id,title,status,metadata)
  values('${id(107)}','${bob}','${org}','Contributor private','ready','{}')`);
await selectAs(bob,'select id from memory_documents');
await assert.rejects(() => db.query(`update memory_documents set metadata='{"enterprise_shared":true}'::jsonb
  where id='${id(107)}' returning id`)); passed++;
await assert.rejects(() => db.query(`insert into memory_documents (id,user_id,org_id,title,status,metadata)
  values('${id(108)}','${bob}','${org}','Forged shared','ready','{"enterprise_shared":true}')`)); passed++;

verify((await selectAs(stranger,'select id from memory_documents')).length===0,'other organisation cannot read document');
verify((await rows('select id from memory_chunks')).length===0,'other organisation cannot read chunk');
verify((await selectAs(alice,'select id from memory_documents')).length===6,'owner still reads own documents');
verify((await rows('select id from memory_chunks')).length===5,'owner still reads own chunks');

await db.exec('reset role;');
await db.query(`update memory_documents set metadata='{}'::jsonb where id='${shared}'`);
verify((await selectAs(bob,'select id from memory_documents')).length===0,'owner unsharing immediately blocks document');
verify((await rows('select id from memory_chunks')).length===0,'owner unsharing immediately blocks chunk');

await db.exec('reset role;');
await db.query(`update memory_documents set metadata='{"enterprise_shared":true}'::jsonb where id='${shared}'`);
await db.query(`delete from organisation_members where user_id='${bob}' and org_id='${org}'`);
verify((await selectAs(bob,'select id from memory_documents')).length===0,'revoked membership immediately denies document');
verify((await rows('select id from memory_chunks')).length===0,'revoked membership immediately denies chunk');

await db.exec('reset role; set role anon;');
await assert.rejects(() => rows('select id from memory_documents')); passed++;
await assert.rejects(() => rows('select id from memory_chunks')); passed++;
await db.close();
console.log(`Enterprise Knowledge: ${passed} isolated PostgreSQL policy checks passed.`);
