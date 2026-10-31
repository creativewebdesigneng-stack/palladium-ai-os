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
  create schema auth; create schema private; create schema storage;
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
    agent_id uuid, title text, status text not null, storage_path text, metadata jsonb not null default '{}'::jsonb
  );
  create table memory_chunks (
    id uuid primary key, document_id uuid not null references memory_documents(id),
    user_id uuid not null, org_id uuid, agent_id uuid, content text
  );
  create table agent_memories (
    id uuid primary key, user_id uuid not null, org_id uuid, scope text not null, content text
  );
  alter table agent_memories enable row level security;
  create policy agent_memories_owner_or_explicit_org_share on agent_memories for select to authenticated
    using(user_id=(select auth.uid()) or
      (org_id is not null and scope in ('shared','organisation') and private.is_org_member(org_id)));
  grant select on agent_memories to authenticated;
  create function storage.foldername(_name text) returns text[]
    language sql immutable as $folder$ select string_to_array(_name, '/') $folder$;
  create table storage.objects (id uuid primary key, bucket_id text not null, name text not null, payload text);
  alter table storage.objects enable row level security;
  create policy blackstar_knowledge_owner_read on storage.objects
    for select to authenticated using(bucket_id='knowledge' and split_part(name,'/',1)=(select auth.uid())::text);
  create policy blackstar_knowledge_owner_update on storage.objects
    for update to authenticated using(bucket_id='knowledge' and split_part(name,'/',1)=(select auth.uid())::text)
    with check(bucket_id='knowledge' and split_part(name,'/',1)=(select auth.uid())::text);
  create policy blackstar_knowledge_owner_delete on storage.objects
    for delete to authenticated using(bucket_id='knowledge' and split_part(name,'/',1)=(select auth.uid())::text);
  -- Recreate the broad permissive production trusted-media compatibility
  -- policies. Without new RESTRICTIVE owner policies these expose other
  -- users knowledge objects despite the narrow owner policies above.
  create policy trusted_media_read_scope on storage.objects
    for select to authenticated using(bucket_id <> 'trusted-media');
  create policy trusted_media_upload_scope on storage.objects
    for insert to authenticated with check(bucket_id <> 'trusted-media');
  create policy trusted_media_no_client_replace on storage.objects
    for update to authenticated using(bucket_id <> 'trusted-media')
    with check(bucket_id <> 'trusted-media');
  create policy trusted_media_no_client_delete on storage.objects
    for delete to authenticated using(bucket_id <> 'trusted-media');
  grant usage on schema storage to anon,authenticated;
  grant select,insert,update,delete on storage.objects to authenticated;
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
  update memory_documents set storage_path='${alice}/org-shared.pdf' where id='${shared}';
  update memory_documents set storage_path='${alice}/org-private.pdf' where id='${privateDoc}';
  insert into storage.objects(id,bucket_id,name,payload) values
    ('00000000-0000-4000-8000-000000000401','knowledge','${alice}/org-shared.pdf','Shared file'),
    ('00000000-0000-4000-8000-000000000402','knowledge','${alice}/org-private.pdf','Org private file'),
    ('00000000-0000-4000-8000-000000000403','knowledge','${alice}/personal.pdf','Personal file'),
    ('00000000-0000-4000-8000-000000000404','knowledge','${alice}/orphan.pdf','Orphan file'),
    ('00000000-0000-4000-8000-000000000405','knowledge','${bob}/bob.pdf','Member file');
  insert into agent_memories(id,user_id,org_id,scope,content) values
    ('${id(301)}','${alice}','${org}','shared','Shared derived summary'),
    ('${id(302)}','${alice}','${org}','private','Private organisation summary'),
    ('${id(303)}','${alice}',null,'private','Personal memory');
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

verify((await selectAs(alice,`select id from storage.objects where name='${alice}/org-shared.pdf'`)).length===1,
  'current author can access their indexed organisation file');
verify((await rows(`select id from storage.objects where name='${alice}/org-private.pdf'`)).length===1,
  'current author can access private organisation file');
verify((await selectAs(bob,`select id from storage.objects where name='${alice}/org-shared.pdf'`)).length===0,
  'org membership does not grant a different authors source file');
verify((await rows(`select id from storage.objects where name='${bob}/bob.pdf'`)).length===1,
  'member can read own original file');
verify((await rows(`update storage.objects set payload='tampered' where name='${alice}/org-shared.pdf' returning id`)).length===0,
  'other member cannot overwrite an original file despite globally permissive update policy');
verify((await rows(`delete from storage.objects where name='${alice}/org-private.pdf' returning id`)).length===0,
  'other member cannot delete original file despite globally permissive delete policy');
await assert.rejects(() => db.query(`insert into storage.objects(id,bucket_id,name,payload)
  values('${id(406)}','knowledge','${alice}/forged.pdf','forged')`)); passed++;
verify((await rows(`select id from storage.objects where name='${alice}/personal.pdf'`)).length===0,
  'other member cannot read unrelated personal file despite broad read policy');
verify((await selectAs(bob,'select id from memory_documents')).length===1,'member sees only explicit shared ready docs');
verify((await rows('select id from memory_chunks')).length===1,'member sees only matching parent chunk');
verify((await rows('select id from agent_memories')).length===1,
  'member sees only allowed shared org memory while uploader is a member');
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
verify((await selectAs(alice,'select id from memory_documents')).length===5,'owner reads documents in organisations they still belong to');
verify((await rows(`select id from memory_documents where id='${foreign}'`)).length===0,'owner cannot read org-labelled document from an org they never joined');
verify((await rows('select id from memory_chunks')).length===4,'owner reads chunks in organisations they still belong to');
verify((await rows(`select id from memory_chunks where id='${mismatchedChunk}'`)).length===0,'owner cannot read mismatched org-labelled chunk');

await db.exec('reset role;');
await db.query(`update memory_documents set metadata='{}'::jsonb where id='${shared}'`);
verify((await selectAs(bob,`select id from memory_documents where id='${shared}'`)).length===0,'owner unsharing blocks the explicitly shared document');
verify((await rows('select id from memory_chunks')).length===0,'owner unsharing immediately blocks chunk');

await db.exec('reset role;');
await db.query(`update memory_documents set metadata='{"enterprise_shared":true}'::jsonb where id='${shared}'`);
await db.query(`delete from organisation_members where user_id='${bob}' and org_id='${org}'`);
verify((await selectAs(bob,`select id from memory_documents where id='${shared}'`)).length===0,'revoked membership denies the other owners shared document');
verify((await rows('select id from memory_chunks')).length===0,'revoked membership immediately denies chunk');

await db.exec('reset role; set role anon;');
await assert.rejects(() => rows('select id from memory_documents')); passed++;
await assert.rejects(() => rows('select id from memory_chunks')); passed++;
// Offboarding the ORIGINAL UPLOADER must deny legacy owner-only reads too.
await db.exec('reset role;');
await db.query(`insert into memory_documents (id,user_id,org_id,title,status,metadata)
  values('${id(109)}','${alice}',null,'Personal note','ready','{}')`);
await db.query(`insert into memory_chunks (id,document_id,user_id,org_id,agent_id,content)
  values('${id(209)}','${id(109)}','${alice}',null,null,'Private personal note')`);
await db.query(`update memory_documents set storage_path='${alice}/personal.pdf' where id='${id(109)}'`);
await db.query(`insert into organisation_members (org_id,user_id,role) values('${org}','${bob}','member')`);
await db.query(`delete from organisation_members where org_id='${org}' and user_id='${alice}'`);
verify((await selectAs(alice,`select id from storage.objects where name='${alice}/org-shared.pdf'`)).length===0,
  'revoked original uploader cannot read formerly indexed shared source file');
verify((await rows(`select id from storage.objects where name='${alice}/org-private.pdf'`)).length===0,
  'revoked original uploader cannot read formerly indexed private org file');
verify((await rows(`update storage.objects set payload='changed' where name='${alice}/org-shared.pdf' returning id`)).length===0,
  'revoked uploader cannot overwrite old org object');
verify((await rows(`delete from storage.objects where name='${alice}/org-shared.pdf' returning id`)).length===0,
  'revoked uploader cannot delete old org object');
verify((await rows(`select id from storage.objects where name='${alice}/personal.pdf'`)).length===1,
  'revoked uploader still reads truly private original file');
verify((await rows(`select id from storage.objects where name='${alice}/orphan.pdf'`)).length===1,
  'pre-ingest orphan original file remains owner only');
verify((await selectAs(alice,`select id from memory_documents where id='${shared}'`)).length===0,
  'removed original uploader cannot read own formerly shared org document');
verify((await rows(`select id from memory_chunks where id='${sharedChunk}'`)).length===0,
  'removed original uploader cannot read own org chunk');
verify((await rows(`select id from agent_memories where id='${id(301)}'`)).length===0,
  'removed original uploader cannot read formerly shared org memory');
verify((await rows(`select id from agent_memories where id='${id(302)}'`)).length===0,
  'removed uploader cannot read organisation-scoped private summary');
verify((await rows(`select id from agent_memories where id='${id(303)}'`)).length===1,
  'removed uploader retains separate private personal memory');
verify((await rows(`select id from memory_documents where id='${privateDoc}'`)).length===0,
  'removed original uploader cannot read even private org-labelled document');
verify((await rows(`select id from memory_documents where id='${id(109)}'`)).length===1,
  'removed org uploader retains independently private personal document');
verify((await rows(`select id from memory_chunks where id='${id(209)}'`)).length===1,
  'removed org uploader retains independently private personal chunk');
verify((await selectAs(bob,`select id from memory_documents where id='${shared}'`)).length===0,
  'remaining member cannot read former contributor organisation document');
verify((await rows(`select id from agent_memories where id='${id(301)}'`)).length===0,
  'remaining member cannot read memory shared by a former organisation contributor');


// Atomic sharing audit regression: same candidate migration; isolated PG only.
// The existing fixture's two user identities and owner/member policies are reused.
await db.exec('reset role;');
await db.query('insert into organisation_members(org_id,user_id,role) values($1,$2,$3)',[org,alice,'owner']);
await db.query('insert into memory_documents(id,user_id,org_id,title,status,metadata) values($1,$2,$3,$4,$5,$6)',[id(120),alice,org,'Audited sharing candidate','ready',{}]);
await db.exec(`
  create table mission_audit_logs (
    id uuid primary key default gen_random_uuid(), user_id uuid not null,
    org_id uuid, action text not null, target_type text, target_id text,
    status text not null default 'success', metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz default now()
  );
  alter table mission_audit_logs enable row level security;
  create policy audit_owner_read on mission_audit_logs for select to authenticated
    using(user_id=(select auth.uid()));
  grant select on mission_audit_logs to authenticated;
`);
await db.exec(readFileSync('supabase/migrations/20261031002000_enterprise_knowledge_atomic_share_audit.sql','utf8'));

await selectAs(alice,'select id from memory_documents');
verify((await rows("select id from mission_audit_logs")).length===0,'private baseline has no manufactured audit');
verify((await rows("update memory_documents set metadata='{\"enterprise_shared\":true}' where id='"+id(120)+"' returning id")).length===1,
 'direct authenticated sharing permitted for original admin-owner');
let auditRows=await rows('select action,metadata,user_id,org_id,target_id from mission_audit_logs');
verify(auditRows.length===1 && auditRows[0].action==='enterprise_knowledge_share_changed',
 'direct Data API-style share has durable database-trigger audit');
verify(auditRows[0].user_id===alice && auditRows[0].org_id===org && auditRows[0].target_id===id(120),
 'actor/org/document identifiers match');
verify(auditRows[0].metadata.shared===true && auditRows[0].metadata.origin==='database_trigger',
 'audit stores redacted share state and database origin');
await rows("update memory_documents set metadata='{\"enterprise_shared\":true,\"safe_extra\":1}' where id='"+id(120)+"'");
verify((await rows('select id from mission_audit_logs')).length===1,
 'unrelated metadata update does not duplicate share event');
await assert.rejects(()=>db.query('insert into mission_audit_logs(user_id,action) values($1,$2)',[alice,'forgery'])); passed++;

await selectAs(bob,'select id from memory_documents');
verify((await rows('select id from mission_audit_logs')).length===0,
 'organisation member cannot read another owners audit events');
await assert.rejects(()=>rows("update memory_documents set metadata='{\"enterprise_shared\":true}' where id='"+id(107)+"' returning id")); passed++;

await db.exec('reset role;');
await db.exec("alter table mission_audit_logs add constraint audit_sink_block check ((metadata->>'origin') is distinct from 'database_trigger') not valid;");
await selectAs(alice,'select id from memory_documents');
await assert.rejects(()=>rows("update memory_documents set metadata='{\"enterprise_shared\":false}' where id='"+id(120)+"' returning id")); passed++;
verify((await rows("select metadata->>'enterprise_shared' as shared from memory_documents where id='"+id(120)+"'"))[0].shared==='true',
 'failed audit insert rolls back document-sharing update');
verify((await rows('select id from mission_audit_logs')).length===1,
 'rejected mutation adds no fictitious successful audit');
await db.exec('reset role; alter table mission_audit_logs drop constraint audit_sink_block;');
await selectAs(alice,'select id from memory_documents');
await rows("update memory_documents set metadata='{\"enterprise_shared\":false}' where id='"+id(120)+"'");
auditRows=await rows('select metadata from mission_audit_logs');
verify(auditRows.length===2 && auditRows.some(x=>x.metadata.shared===false),
 'direct revocation is atomically audited');

await rows("update memory_documents set metadata='{\"enterprise_shared\":true}' where id='"+id(120)+"'");
await assert.rejects(()=>rows("update memory_documents set org_id='"+otherOrg+"' where id='"+id(120)+"' returning id")); passed++;
verify((await rows("select org_id from memory_documents where id='"+id(120)+"'"))[0].org_id===org,
 'shared document cannot move to another org without revoking first');
await rows("update memory_documents set status='processing' where id='"+id(120)+"'");
await rows("update memory_documents set status='ready' where id='"+id(120)+"'");
verify((await rows('select id from mission_audit_logs')).length===5,
 'shared-document readiness transitions are also audited');
await db.exec('reset role;');
await db.query('select set_config($1,$2,false)',['request.jwt.claim.sub','']);
await assert.rejects(()=>rows("update memory_documents set metadata='{\"enterprise_shared\":false}' where id='"+id(120)+"'")); passed++;
verify((await selectAs(alice,"select metadata->>'enterprise_shared' as shared from memory_documents where id='"+id(120)+"'"))[0].shared==='true',
 'unattributed privileged mutation is blocked');

await db.close();
console.log(`Enterprise Knowledge: ${passed} isolated PostgreSQL policy checks passed.`);
