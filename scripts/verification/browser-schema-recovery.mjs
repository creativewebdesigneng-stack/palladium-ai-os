// Real isolated Postgres policy tests. No production connection or credentials.
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
let passed = 0;
const check = (value, message) => { assert.ok(value, message); passed++; };
const denied = async query => { await assert.rejects(() => db.query(query)); passed++; };
const rows = async query => (await db.query(query)).rows;
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const a = id(1), b = id(2), org = id(11), otherOrg = id(12), agentA = id(21), agentB = id(22), taskA = id(31), taskB = id(32);
await db.exec(`
create role anon;create role authenticated;create role service_role bypassrls;
create schema auth;create schema private;
create table auth.users(id uuid primary key);
create table personal_agents(id uuid primary key,user_id uuid);
create table personal_tasks(id uuid primary key,user_id uuid);
create table private.members(user_id uuid,org_id uuid);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function private.is_org_member(_org uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from private.members where user_id=auth.uid() and org_id=_org) $$;
create function set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now();return new;end $$;
grant usage on schema auth,private,public to anon,authenticated,service_role;
grant execute on function auth.uid() to anon,authenticated;
grant execute on function private.is_org_member(uuid) to authenticated;
grant select on personal_agents,personal_tasks to authenticated;
insert into auth.users values('${a}'),('${b}');
insert into personal_agents values('${agentA}','${a}'),('${agentB}','${b}');
insert into personal_tasks values('${taskA}','${a}'),('${taskB}','${b}');
insert into private.members values('${a}','${org}'),('${b}','${org}');
`);
const file = readdirSync('supabase/migrations').find(n => n.endsWith('_restore_browser_runtime_schema.sql'));
const migration = readFileSync('supabase/migrations/' + file, 'utf8');
await db.exec(migration);
await assert.rejects(() => db.exec(migration), /requires all four tables to be absent/); passed++;
const tables = ['browser_credentials','browser_profiles','browser_sessions','browser_artifacts'];
for (const t of tables) {
  check((await rows(`select relrowsecurity from pg_class where oid='${t}'::regclass`))[0].relrowsecurity, 'RLS enabled');
  check(Number((await rows(`select count(*) n from ${t}`))[0].n) === 0, 'no backfill');
  for (const privilege of ['SELECT','INSERT','UPDATE','DELETE','TRUNCATE']) {
    check(!(await rows(`select has_table_privilege('anon','${t}','${privilege}') ok`))[0].ok, 'anonymous denied');
  }
  check(!(await rows(`select has_table_privilege('authenticated','${t}','TRUNCATE') ok`))[0].ok, 'no client truncate');
}
check(Number((await rows("select count(*) n from pg_policies where tablename=any(array['browser_credentials','browser_profiles','browser_sessions','browser_artifacts']) and cmd='UPDATE' and (qual is null or with_check is null)"))[0].n) === 0, 'update USING and WITH CHECK');
await db.exec(`insert into browser_artifacts(user_id,filename,size_bytes,sha256,storage_path) values('${a}','fixture.txt',1,'fixture-hash','${a}/browser/fixture.txt');
set role authenticated;set request.jwt.claim.sub='${a}';`);
await db.exec(`insert into browser_credentials(user_id,org_id,name,domain,password_ciphertext) values('${a}','${org}','Fixture','example.com','encrypted-fixture');
insert into browser_profiles(user_id,agent_id,org_id,scope_key,state_ciphertext) values('${a}','${agentA}','${org}','fixture-scope','encrypted-fixture');
insert into browser_sessions(user_id,agent_id,task_id,provider) values('${a}','${agentA}','${taskA}','playwright');`);
for (const t of tables) check((await rows(`select * from ${t}`)).length === 1, 'owner read');
await denied(`insert into browser_sessions(user_id) values('${a}')`);
await denied(`insert into browser_sessions(user_id,agent_id,provider) values('${a}','${agentB}','playwright')`);
await denied(`insert into browser_sessions(user_id,task_id,provider) values('${a}','${taskB}','playwright')`);
await denied(`update browser_sessions set agent_id='${agentB}'`);
await denied(`update browser_sessions set task_id='${taskB}'`);
await denied(`update browser_profiles set agent_id='${agentB}'`);
await denied(`update browser_profiles set org_id='${otherOrg}'`);
await denied(`update browser_credentials set org_id='${otherOrg}'`);
await denied(`insert into browser_credentials(user_id,name,domain,password_ciphertext) values('${a}','fixture','example.com','encrypted-fixture')`);
await denied(`insert into browser_artifacts(user_id,filename,size_bytes,sha256,storage_path) values('${a}','tamper',1,'hash','path')`);
await denied(`update browser_artifacts set storage_path='tamper'`);
for (const t of ['browser_credentials','browser_profiles','browser_sessions']) await denied(`update ${t} set user_id='${b}'`);
await db.exec(`set request.jwt.claim.sub='${b}';`);
for (const t of tables) {
  check((await rows(`select * from ${t}`)).length === 0, 'same org cross-owner rows hidden');
  check((await rows(`delete from ${t} returning id`)).length === 0, 'cross-owner deletion hidden');
}
await db.exec(`reset role;set role anon;`);
for (const t of tables) await denied(`select * from ${t}`);
await db.exec(`reset role;set role service_role;`);
for (const t of tables) check((await rows(`select * from ${t}`)).length === 1, 'trusted runtime access');
await db.close();
console.log(`Browser schema recovery: ${passed} isolated Postgres authorization checks passed.`);
